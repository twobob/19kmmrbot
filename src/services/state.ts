import { injectable, inject } from "inversify";
import { RedisConnector } from "../connectors/redis";
import { Logger } from "../logger";
import { UserCacheKey, UserCache, MatchState } from "../state";

@injectable()
export class StateService {
  constructor(
    @inject(RedisConnector) private redis: RedisConnector,
    @inject(Logger) private logger: Logger,
  ) {}

  async getUserMatchID(steamid: string): Promise<string | null | undefined> {
    return this.redis.getAsync(`user:${steamid}:${UserCacheKey.matchID}`);
  }

  async setUserMatchID(steamid: string, matchID: string): Promise<string | null> {
    await this.redis.setAsync(`user:${steamid}:${UserCacheKey.matchID}`, matchID);
    return matchID;
  }

  async getUserCache(steamid: string): Promise<UserCache> {
    const cache = await this.redis.getAsync(`user:${steamid}:${UserCacheKey.cache}`);
    if (cache) {
      return JSON.parse(cache);
    } else {
      return {
        id: steamid,
        players: {},
      };
    }
  }

  async setUserCache(steamid: string, cache: UserCache) {
    const stringifiedCache = JSON.stringify(cache);
    await this.redis.setAsync(`user:${steamid}:${UserCacheKey.cache}`, stringifiedCache);
    return stringifiedCache;
  }

  async getMatch(matchID: string): Promise<MatchState | null> {
    const rawMatch = await this.redis.getAsync(`match:${matchID}`);
    if (rawMatch) {
      try {
        return JSON.parse(rawMatch);
      } catch (e) {
        this.logger.error("An exception occurred while getting a match", { e });
      }
    }
    return null;
  }

  async storeMatch(matchID: string, match: MatchState) {
    const matchRes = JSON.stringify(match);
    await this.redis.setAsync(`match:${matchID}`, matchRes);
    return matchRes;
  }

  async resetUserCaches(steamid: string): Promise<boolean> {
    return true;
  }

  async resetUserCache(steamid: string, key: UserCacheKey) {}
}
