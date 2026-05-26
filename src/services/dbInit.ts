import * as mysql from "mysql2/promise";
import { Logger } from "../logger";

export async function checkAndInstallDatabase(logger: Logger) {
  // MariaDB installation, service registration, and service startup is now automatically
  // handled by the elevated start.ps1 bootstrapper script to ensure a seamless single-command setup.
}

export async function createDatabaseIfNotExists(logger: Logger) {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = parseInt(process.env.DB_PORT || "3306");
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_DATABASE || "example_fortify_test";

  logger.info(`Checking if database "${database}" exists...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\` COLLATE 'utf8mb4_unicode_ci'`);
    logger.info(`Database "${database}" is ready.`);
  } catch (err) {
    logger.error("Failed to verify/create database schema", { err });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
