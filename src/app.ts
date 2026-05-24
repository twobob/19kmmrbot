import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { json, urlencoded } from "body-parser";
import { Client, Options } from "tmi.js";

import { container } from "./inversify.config";
import { PostgresConnector } from "./connectors/postgres";
import { RedisConnector } from "./connectors/redis";
import { ExtractorService } from "./services/extractor";
import { StateService } from "./services/state";
import { HealthCheck } from "./services/healthCheck";
import { MetricsService } from "./services/metrics";
import { TwitchCommand } from "./definitions/twitchCommand";
import { HelpCommand } from "./commands/help";
import { User } from "./db/entities/user";
import { FortifyGameMode, MatchState, PlayerSnapshot } from "./state";
import { Logger } from "./logger";
import { sharedSetup } from "./shared_index";
import { units } from "./units";
import { currentSeason } from "./season";
import { poolSize } from "./pool";

// Initialize global variables and stubs
(global as any).__rootdir__ = __dirname || process.cwd();
sharedSetup();

const mappedUnits = Object.entries((units as any)[currentSeason]).reduce<Record<number, any>>((acc, entry: any) => {
  acc[entry[1].id] = entry[1];
  return acc;
}, {});

(async () => {
  const logger = container.get(Logger);
  logger.info("Initializing Fortify Standalone Service...");

  // 1. Establish Database Connection (MariaDB)
  const dbConnector = container.get(PostgresConnector);
  await dbConnector.connect();

  // 2. Initialize Stubbed services
  const redisConnector = container.get(RedisConnector);
  await redisConnector.connect();

  const healthCheck = container.get(HealthCheck);
  await healthCheck.start();

  const metrics = container.get(MetricsService);
  await metrics.start();

  const extractorService = container.get(ExtractorService);
  const stateService = container.get(StateService);

  // 3. Seed / Register Streamer Account
  const streamerChannel = (process.env.BOT_USERNAME ?? "streamer").toLowerCase();
  let streamerSteamId = streamerChannel === "itstwobob" ? "76561197965340207" : "76561197960287930";

  const userRepo = dbConnector.getUserRepo();
  let userRecord = await userRepo.findOne({ where: { twitchName: streamerChannel } });
  if (!userRecord) {
    logger.info(`Seeding streamer user record for Twitch channel: ${streamerChannel}`);
    userRecord = new User();
    userRecord.steamid = streamerSteamId;
    userRecord.name = streamerChannel === "itstwobob" ? "itsTwobob TTV" : streamerChannel;
    userRecord.twitchName = streamerChannel;
    userRecord.registered = true;
    userRecord.suspended = false;
    userRecord.tosAccepted = true;
    userRecord.publicProfile = true;
    await userRepo.save(userRecord);
  } else {
    streamerSteamId = userRecord.steamid;
  }

  // 4. Start GSI Receiver Server (Express Router)
  const app = express();
  app.use(urlencoded({ extended: true, limit: "10mb" }));
  app.use(json({ limit: "10mb" }));

  app.post("/gsi", async (req, res) => {
    try {
      res.status(200).contentType("text/html").end("OK");

      if (!req.body || !req.body.block) return;

      // Dynamic Streamer Detection: Read Twitch username from the GSI auth field
      let gsiAuthToken = "";
      if (typeof req.body.auth === "string") {
        gsiAuthToken = req.body.auth.toLowerCase().trim();
      } else if (req.body.auth && typeof req.body.auth === "object") {
        gsiAuthToken = (req.body.auth.token || req.body.auth.key || "").toLowerCase().trim();
      }
      gsiAuthToken = gsiAuthToken.replace(/\s*ttv\s*$/g, "");
      let targetStreamerSteamId = streamerSteamId;
      
      if (gsiAuthToken) {
        const matchingUser = await userRepo.findOne({ where: { twitchName: gsiAuthToken } });
        if (matchingUser) {
          targetStreamerSteamId = matchingUser.steamid;
        } else {
          logger.warn(`Received GSI payload for unregistered Twitch channel: "${gsiAuthToken}". Falling back to default streamer: ${targetStreamerSteamId}`);
        }
      }

      const players: Record<string, PlayerSnapshot> = {};
      let gameMode: FortifyGameMode = FortifyGameMode.Normal;

      // Extract player snapshots from GSI telemetry blocks
      for (const block of req.body.block) {
        for (const datum of block.data || []) {
          if (datum.public_player_state) {
            const publicState = datum.public_player_state;
            const accountId = publicState.account_id;
            const steamid64 = (BigInt(accountId) + 76561197960265728n).toString();

            players[steamid64] = {
              id: accountId.toString(),
              public_player_state: publicState,
              private_player_state: datum.private_player_state
            };
          }
        }
      }

      if (Object.keys(players).length === 0) return;

      const activeMatchId = `match-${targetStreamerSteamId}`;

      // Compile current MatchState
      const pool: Record<number, number> = {};
      for (const { id, draftTier } of Object.values(mappedUnits)) {
        pool[id] = (poolSize[draftTier] ?? 0) * ((gameMode as any) === FortifyGameMode.Duos ? 2 : 1);
      }

      for (const player of Object.values(players)) {
        const playerUnits = player.public_player_state.units ?? [];
        for (const { unit_id: unitID, rank } of playerUnits) {
          if (unitID < 1000 && pool[unitID] !== undefined) {
            pool[unitID] -= Math.pow(3, rank - 1);
          }
        }
      }

      const matchState: MatchState = {
        id: activeMatchId,
        created: Date.now(),
        updated: Date.now(),
        updateCount: 1,
        mode: gameMode,
        players: players,
        pool: pool
      };

      // Calculate Average MMR of the Lobby
      const playersList = Object.values(players).map(p => ({
        global_leaderboard_rank: p.public_player_state.global_leaderboard_rank,
        rank_tier: p.public_player_state.rank_tier
      }));
      const avgMMRStr = extractorService.getAverageMMR(playersList, null, null);
      matchState.averageMMR = parseInt(avgMMRStr);

      // Cache GSI states locally in MariaDB (via Redis Connector Wrapper)
      await stateService.setUserMatchID(targetStreamerSteamId, activeMatchId);
      await stateService.storeMatch(activeMatchId, matchState);

      logger.debug(`Parsed GSI match state for ${gsiAuthToken || streamerChannel}. Players: ${Object.keys(players).length}, Avg MMR: ${avgMMRStr}`);
    } catch (e) {
      logger.error("Error processing incoming GSI package", { e });
    }
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ success: true, mode: "cPanel-standalone" });
  });

  const port = process.env.PORT || process.env.MY_PORT || 6666;
  const server = app.listen(port, () => {
    logger.info(`GSI endpoint receiver listening on port ${port}`);
  });

  // 5. Initialize Twitch Chat Bot (tmi.js)
  const oauthToken = process.env.TWITCH_OAUTH_TOKEN ?? "";
  const botUsername = process.env.BOT_USERNAME ?? "streamer";

  // Fetch twitchNames to join (streamer channel)
  const channels = (await userRepo.find({ select: ["twitchName"], where: { suspended: false } }))
    .map(channel => channel.twitchName ?? "")
    .filter(value => value);

  logger.info(`Twitch bot joining channels: ${JSON.stringify(channels)}`);

  const tmiOptions: Options = {
    channels,
    connection: {
      reconnect: true,
      secure: true
    },
    identity: {
      password: oauthToken,
      username: botUsername
    }
  };

  const client = Client(tmiOptions);

  // Command handlers
  const commands = container.getAll<TwitchCommand>("command");
  const helpCommand = container.get<TwitchCommand>(HelpCommand);

  client.on("message", async (channel, tags, message, self) => {
    try {
      if (self) return; // Ignore messages from the bot itself

      for (const command of [...commands, helpCommand]) {
        const invoked = command.invocations.reduce(
          (acc, invocation) => acc || message.toLowerCase().startsWith(invocation.toLowerCase()),
          false
        );

        if (invoked) {
          const timedOut = command.timeout !== undefined ? await command.timeout(channel, tags, message) : false;
          const authorized = command.authorized !== undefined ? await command.authorized(channel, tags, message) : true;

          if (!timedOut && authorized) {
            logger.info(`Invoking Twitch command: ${command.invocations[0]} by ${tags.username}`);
            await command.handler(client, channel, tags, message);
          }
        }
      }
    } catch (e) {
      logger.error("Error processing Twitch chat command", { e, channel, message });
    }
  });

  client.on("connected", (address, port) => {
    logger.info(`Connected to Twitch IRC at ${address}:${port}`);
  });

  try {
    await client.connect();
  } catch (err) {
    logger.warn("Could not connect to Twitch IRC. Twitch bot commands will not be available, but the GSI receiver is still running.", { err });
  }

  // Grateful shutdown hooks
  const shutDown = async () => {
    logger.info("Gracefully shutting down services...");
    try {
      server.close();
      await client.disconnect();
      await dbConnector.shutdown();
      logger.info("Shutdown completed successfully.");
      process.exit(0);
    } catch (e) {
      logger.error("Failed to shutdown gracefully", { e });
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutDown);
  process.on("SIGINT", shutDown);

})().catch(e => {
  console.error("Critical error in main lifecycle context:", e);
  process.exit(-1);
});
