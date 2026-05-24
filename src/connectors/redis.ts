import { inject, injectable } from "inversify";
import { PostgresConnector } from "./postgres";
import { ActiveMatch } from "../db/entities/activeMatch";
import { Logger } from "../logger";

@injectable()
export class RedisConnector {
  name = "Redis (MariaDB Mock)";

  constructor(
    @inject(PostgresConnector) private db: PostgresConnector,
    @inject(Logger) private logger: Logger
  ) {}

  async connect() {
    this.logger.info("Redis Mock (MariaDB) connected");
  }

  async shutdown() {}

  async getAsync(key: string): Promise<string | null> {
    try {
      const repo = this.db.getActiveMatchRepo();
      const record = await repo.findOne({ where: { cacheKey: key } });
      return record ? record.cacheValue : null;
    } catch (e) {
      this.logger.error(`Failed to get key ${key} from MariaDB cache`, { e });
      return null;
    }
  }

  async setAsync(key: string, value: string): Promise<void> {
    try {
      const repo = this.db.getActiveMatchRepo();
      let record = await repo.findOne({ where: { cacheKey: key } });
      if (!record) {
        record = new ActiveMatch();
        record.cacheKey = key;
      }
      record.cacheValue = value;
      await repo.save(record);
    } catch (e) {
      this.logger.error(`Failed to set key ${key} in MariaDB cache`, { e });
    }
  }

  // Alias for setAsync
  async set(key: string, value: string): Promise<void> {
    await this.setAsync(key, value);
  }
}
