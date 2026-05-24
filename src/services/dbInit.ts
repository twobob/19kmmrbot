import { execSync, spawn } from "child_process";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import { Logger } from "../logger";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function isMariaDBInstalled(): boolean {
  if (process.platform !== "win32") {
    return true; // Skip installation check on non-Windows platforms
  }
  try {
    execSync("mysql --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    try {
      const serviceCheck = execSync("sc query MariaDB", { encoding: "utf8" });
      if (serviceCheck.includes("SERVICE_NAME")) return true;
    } catch (scError) {}
    try {
      const serviceCheck = execSync("sc query MySQL", { encoding: "utf8" });
      if (serviceCheck.includes("SERVICE_NAME")) return true;
    } catch (scError) {}
  }
  return false;
}

function installMariaDB(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("Installing MariaDB Server silently via winget...");
    const args = [
      "install",
      "--id", "MariaDB.Server",
      "--silent",
      "--accept-package-agreements",
      "--accept-source-agreements"
    ];
    const installer = spawn("winget", args, { stdio: "inherit" });
    installer.on("close", (code) => {
      if (code === 0) {
        console.log("MariaDB Server installed successfully.");
        // Try starting the service just in case
        try {
          execSync("net start MariaDB", { stdio: "ignore" });
        } catch (e) {}
        resolve(true);
      } else {
        console.error(`winget failed with exit code: ${code}`);
        console.error("Please ensure this application is running inside an elevated Administrator shell.");
        resolve(false);
      }
    });
  });
}

function isRunningAsAdmin(): boolean {
  try {
    execSync("net session", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

export async function checkAndInstallDatabase(logger: Logger) {
  if (process.platform !== "win32") {
    return;
  }

  if (isMariaDBInstalled()) {
    return;
  }

  logger.warn("MariaDB/MySQL was not detected on this system.");
  const answer = await askQuestion("SHALL WE INSTALL IT FOR YOU? (Y/n): ");
  
  if (answer.toLowerCase() === "n") {
    logger.info("Installation skipped by user.");
    return;
  }

  if (!isRunningAsAdmin()) {
    logger.error("Administrator privileges are required to perform the silent installation.");
    logger.error("Please restart your shell (PowerShell/CMD) as an Administrator and try again.");
    return;
  }

  const success = await installMariaDB();
  if (!success) {
    logger.error("Database auto-installation failed.");
    return;
  }

  // Update .env with warning and default values
  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const hasWarning = envContent.includes("WARNING: PLEASE CHANGE THESE DEFAULT CREDENTIALS");
  if (!hasWarning) {
    logger.info("Configuring default credentials in .env...");
    const warningText = [
      "",
      "# WARNING: PLEASE CHANGE THESE DEFAULT CREDENTIALS IN PRODUCTION",
      "DB_HOST=127.0.0.1",
      "DB_PORT=3306",
      "DB_DATABASE=lvyotlfu_fortify_test",
      "DB_USER=root",
      "DB_PASSWORD=",
      "DB_LOG=true"
    ].join("\n");

    // Remove existing DB fields to overwrite them
    envContent = envContent
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return !(
          trimmed.startsWith("DB_HOST=") ||
          trimmed.startsWith("DB_PORT=") ||
          trimmed.startsWith("DB_DATABASE=") ||
          trimmed.startsWith("DB_USER=") ||
          trimmed.startsWith("DB_PASSWORD=") ||
          trimmed.startsWith("DB_LOG=")
        );
      })
      .join("\n");

    envContent = envContent.trim() + "\n" + warningText + "\n";
    fs.writeFileSync(envPath, envContent, "utf8");
    
    // Reload dotenv
    require("dotenv").config({ override: true });
  }
}

export async function createDatabaseIfNotExists(logger: Logger) {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = parseInt(process.env.DB_PORT || "3306");
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_DATABASE || "lvyotlfu_fortify_test";

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
