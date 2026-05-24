import { inject, injectable } from "inversify";
import { createConnection, Connection } from "typeorm";
import { User } from "../db/entities/user";
import { Match } from "../db/entities/match";
import { MatchSlot } from "../db/entities/matchSlot";
import { MmrStats } from "../db/entities/mmr";
import { ItemStats, SynergyStats, UnitStats } from "../db/entities/stats";
import { ActiveMatch } from "../db/entities/activeMatch";
import { SecretsManager, SecretsRequest } from "../services/secrets";
import { HealthCheckable } from "../services/healthCheck";
import { Logger } from "../logger";
import { Connector } from "../definitions/connector";

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_DATABASE = "fortify",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_LOG = "false",
} = process.env;

type DatabaseSecrets = {
  postgres: {
    password: string;
  };
};

@injectable()
export class PostgresSecretsRequest implements SecretsRequest {
  requestedSecrets = {
    postgres: {
      password: "",
    },
  } as DatabaseSecrets;
}

@injectable()
export class PostgresConnector implements HealthCheckable, Connector {
  _connection?: Connection;
  name = "MariaDB";
  setupHealthCheck = async () => {};
  healthCheck: () => Promise<boolean>;
  shutdown: () => Promise<unknown>;

  constructor(
    @inject(SecretsManager)
    private secretsManager: SecretsManager<DatabaseSecrets>,
    @inject(Logger) public logger: Logger,
  ) {
    this.healthCheck = async () => {
      this.logger.debug("Starting MariaDB health check");
      const result =
        this._connection?.isConnected &&
        (await this._connection.query("SELECT now();"));

      if (!result) {
        this.logger.error("MariaDB health check failed", { e: result });
      }
      this.logger.debug("Finished MariaDB health check");
      return !!result;
    };

    this.shutdown = async () => {
      if (this._connection?.isConnected) {
        await this._connection.close();
        this._connection = undefined;
      }
    };
  }

  async connect() {
    this.logger.info("Connecting to MariaDB database...");

    const connection = createConnection({
      type: "mariadb",
      host: DB_HOST,
      port: parseInt(DB_PORT),
      username: DB_USER,
      password: DB_PASSWORD,
      database: DB_DATABASE,
      entities: [
        __dirname + "/../db/entities/**/*.js",
        __dirname + "/../db/entities/**/*.ts",
      ],
      synchronize: true, // Automatically creates tables for entities
      logging: DB_LOG === "true",
      extra: {
        connectionLimit: 10,
      },
    });

    connection
      .then((db) => {
        this.logger.info("MariaDB database connection established successfully");
        return db;
      })
      .catch((reason) => {
        this.logger.error("Database connection rejected", { reason });
        setTimeout(async () => {
          this._connection = await this.connect();
        }, 5000);
      });

    this._connection = await connection;
    return connection;
  }

  get connection() {
    if (!this._connection) {
      throw new Error("Not connected to MariaDB");
    }
    return this._connection;
  }

  getUserRepo() {
    return this.connection.getRepository(User);
  }

  getMatchRepo() {
    return this.connection.getRepository(Match);
  }

  getMatchSlotRepo() {
    return this.connection.getRepository(MatchSlot);
  }

  getMmrStatsRepo() {
    return this.connection.getRepository(MmrStats);
  }

  getUnitStatsRepo() {
    return this.connection.getRepository(UnitStats);
  }

  getItemStatsRepo() {
    return this.connection.getRepository(ItemStats);
  }

  getSynergyStatsRepo() {
    return this.connection.getRepository(SynergyStats);
  }

  getActiveMatchRepo() {
    return this.connection.getRepository(ActiveMatch);
  }
}
