import "reflect-metadata";
import { Container } from "inversify";

import { TwitchCommand } from "./definitions/twitchCommand";
import { Logger } from "./logger";
import { SecretsManager } from "./services/secrets";
import { PostgresConnector } from "./connectors/postgres";
import { RedisConnector } from "./connectors/redis";
import { KafkaConnector } from "./connectors/kafka";

import { CountdownCommand } from "./commands/countdown";
import { NotablePlayersCommand } from "./commands/notablePlayers";
import { DevCommands } from "./commands/dev";
import { CreditsCommand } from "./commands/credits";
import { MMRCommand } from "./commands/mmr";
import { LeftCommand } from "./commands/left";
import { HelpCommand } from "./commands/help";
import { MatchCommand } from "./commands/match";
import { CodeCommand } from "./commands/code";

import { HealthCheck } from "./services/healthCheck";
import { MetricsService } from "./services/metrics";
import { ExtractorService } from "./services/extractor";
import { LeaderboardService } from "./services/leaderboard";
import { AuthService } from "./services/auth";
import { BotCommandProcessor } from "./services/command";
import { Connector } from "./definitions/connector";

const container = new Container({ autoBindInjectable: true });

// Core bindings
container.bind(Logger).toSelf().inSingletonScope();
container.bind(SecretsManager).toSelf().inSingletonScope();

// Database and mock connectors
container.bind(PostgresConnector).toSelf().inSingletonScope();
container.bind(RedisConnector).toSelf().inSingletonScope();
container.bind(KafkaConnector).toSelf().inSingletonScope();

// Interface / service aliases
container.bind<Connector>("connector").toService(PostgresConnector);
container.bind<Connector>("connector").toService(RedisConnector);
container.bind<Connector>("connector").toService(KafkaConnector);

// Business services
container.bind(HealthCheck).toSelf().inSingletonScope();
container.bind(MetricsService).toSelf().inSingletonScope();
container.bind(ExtractorService).toSelf().inSingletonScope();
container.bind(LeaderboardService).toSelf().inSingletonScope();
container.bind(AuthService).toSelf().inSingletonScope();
container.bind(BotCommandProcessor).toSelf().inSingletonScope();

// Twitch Bot Commands
container.bind<TwitchCommand>("command").to(CountdownCommand);
container.bind<TwitchCommand>("command").to(NotablePlayersCommand);
container.bind<TwitchCommand>("command").to(DevCommands);
container.bind<TwitchCommand>("command").to(CreditsCommand);
container.bind<TwitchCommand>("command").to(MMRCommand);
container.bind<TwitchCommand>("command").to(LeftCommand);
container.bind<TwitchCommand>("command").to(MatchCommand);
container.bind<TwitchCommand>("command").to(CodeCommand);

// Help command bound to self to prevent circular references
container.bind<TwitchCommand>(HelpCommand).toSelf();

export { container };
