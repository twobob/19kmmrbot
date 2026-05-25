# Consolidated Standalone Dota Underlords GSI Twitch Bot

This project is a high-performance, consolidated, standalone version of the **Fortify Dota Underlords Data Platform**. It integrates the Game State Integration (GSI) telemetry receiver and the Twitch Bot (`17kmmrbot`) into a **single, lightweight Node.js application**. 

Designed specifically for standard shared web hosting environments (such as **cPanel Node.js Selector / Application Manager**), this unified version eliminates complex infrastructure dependencies like Apache Kafka, Redis, HashiCorp Vault, and Sentry. Instead, it utilises a single **MariaDB** database for both configuration storage and transient match caching.

---

## 1. System Architecture & Interaction Flow

In standard SaaS setups, multiple microservices communicate asynchronously via message brokers. This standalone project condenses this pipeline into a single process, utilising your MariaDB database as the central shared state:

```
+------------------------------+
|   Dota Underlords Client     |
|       (Streamer's PC)        |
+--------------+---------------+
               |
               | [HTTP POST GSI Payload]
               v
+--------------+--------------------------------------------------------+
|                      Unified Node.js App (cPanel)                      |
|                                                                        |
|  +-----------------------+              +---------------------------+  |
|  |     GSI Receiver      |              |   Twitch Bot (tmi.js)     |  |
|  |    (Express Server)   |              |   (IRC Client Listener)   |  |
|  +-----------+-----------+              +-------------+-------------+  |
|              |                                        |                |
|              | [Direct Write]                         | [Direct Read]  |
|              |                                        |                |
+--------------|----------------------------------------|----------------+
               |                                        |
               +------------------>[(  MariaDB  )]<-----+
                             * Schema Sync (TypeORM)
                             * Active Match Cache Table
                             * User / Streamer Profiles
```

### Data & Execution Flow
1.  **Telemetry Generation:** While playing Dota Underlords, the local game client broadcasts JSON packages of the current board state, players list, rank tiers, and chosen Underlords to the server on `/gsi` via HTTP POST.
2.  **Ingestion & Parsing:** The integrated **GSI Receiver** handles the payload, extracts player Steam IDs, converts Steam32 IDs to Steam64, and calculates the lobby's average MMR (using leaderboard thresholds).
3.  **Active Cache:** Instead of writing to Kafka/Redis, the GSI receiver writes the parsed game state directly into the MariaDB `active_matches` table under the keys `user:<steamid>:matchID` and `match:active-match`.
4.  **Twitch Request Handling:** A Twitch viewer enters the streamer's channel and types `!mmr`. The Twitch bot listens to this event, queries the MariaDB cache table for the active match state, formats the ranking/MMR values, and replies directly to Twitch chat.

---

## 2. Configuration Settings (.env)

All configuration variables are defined in the local `.env` file (or loaded into the cPanel Node.js Application manager dashboard). 

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| **`DB_HOST`** | `127.0.0.1` | The hostname/IP address of your MariaDB database server. |
| **`DB_PORT`** | `3306` | The connection port for the database. |
| **`DB_DATABASE`** | `example_fortify_test` | The name of the MariaDB database schema. |
| **`DB_USER`** | `root` | The database username. |
| **`DB_PASSWORD`** | *(blank)* | The database password. |
| **`DB_LOG`** | `false` | Set to `true` to print raw SQL queries to stdout (useful for debugging). |
| **`PORT`** | `6666` | Port for the Express receiver server (GSI endpoint). Managed by cPanel in production. |
| **`BOT_USERNAME`** | `streamer` | The Twitch account name of your Twitch bot. |
| **`TWITCH_OAUTH_TOKEN`** | `oauth:...` | The bot account's chat OAuth token (retrieve one from [twitchtokengenerator.com](https://twitchtokengenerator.com)). |

### 🔑 How to Generate your Twitch OAuth Token

To allow the bot to connect to Twitch IRC chat and respond to commands, it needs a valid Twitch OAuth Token. Follow these steps to generate one:

1. **Log in to Twitch:** Log in to the Twitch website using the account you want the bot to post from (either a dedicated bot account or your main channel account).
2. **Visit the Token Generator:** In your web browser, navigate to [twitchtokengenerator.com](https://twitchtokengenerator.com).
3. **Select Token Type:** Choose **Bot Chat Token** (or ensure the `chat:read` and `chat:edit` scopes are selected).
4. **Authorise the Application:** Click **Authorise** to connect your Twitch account and generate the tokens.
5. **Copy the Token:** Copy the generated **Access Token**.
6. **Add to `.env`:** Paste the copied token as the value for `TWITCH_OAUTH_TOKEN` in your `.env` file. (Note: Ensure the value starts with `oauth:`, for example: `TWITCH_OAUTH_TOKEN=oauth:your_access_token_here`).

## 3. Windows Setup (From Absolute Scratch - Automated)

If you are setting this up on a Windows machine and have **nothing** pre-installed (no Node.js, no MariaDB database, and no tables), a fully automated bootstrap script is provided.

### Step 1: Run the Bootstrapper Script
1. Open PowerShell and navigate to the project directory.
2. Run the bootstrapper script:
   ```powershell
   ./start.ps1
   ```
3. **Elevated Privileges:** The script will automatically detect if it is running as an Administrator. If it is not, it will request elevation and launch a new elevated Administrator window to check and install dependencies.
4. **Node.js Auto-Installation:** If Node.js is missing on your system, the script will automatically install it silently via Windows Package Manager (`winget`) and reload the environment paths for the running session.
5. **Dependency Setup:** It will automatically execute `npm install` and `npm run build` to compile the TypeScript sources.

### Step 2: Database Auto-Installation & Setup
1. When the Node server starts, it will check if **MariaDB Server** is installed on your PC.
2. If it is not found, the terminal will ask:
   ```txt
   SHALL WE INSTALL IT FOR YOU? (Y/n):
   ```
3. Press `Y` (or Enter) to agree. The application will silently install MariaDB Server via `winget` and configure it.
4. **Auto-Configuration:** The script automatically writes the default root credentials inside the `.env` file with a warning comment.
5. **Auto-Schema Setup:** It connects to the newly installed database, creates the schema (`example_fortify_test`) if it does not exist, and TypeORM automatically syncs and sets up all required database tables.

---

## 4. Local Verification & Testing

### A. Database Setup
1. Open HeidiSQL or your database manager and connect to your local MariaDB instance (`127.0.0.1`).
2. Create a database schema named `example_fortify_test`:
   ```sql
   CREATE DATABASE `example_fortify_test` COLLATE 'utf8mb4_unicode_ci';
   ```

### B. Project Configuration
Open `.env` in the project root and enter your local MariaDB password (if any) and optionally your Twitch credentials.

### C. Compile & Start the App
Install dependencies and build the TypeScript code:
```powershell
npm install
npm run build
npm start
```
*   **Automatic Schema Sync:** Upon startup, TypeORM will automatically inspect the entities (`User`, `Match`, `active_matches` table) and generate the tables inside your `example_fortify_test` schema.
*   **Gracious Failure Handling:** The bot safely catches Twitch connection failures if credentials are not configured yet, keeping the Express GSI server alive on port `6666`.

### D. Broadcast Mock Telemetry
With the application server running in one terminal, open a **second terminal window** in the project directory and execute the test GSI client:
```powershell
node test_gsi.js
```
The broadcaster will send mock match data to the server. You should see the following debug log printed on your server console:
```txt
debug: Parsed GSI match state. Players: 2, Avg MMR: 14522
```
Refresh HeidiSQL and open the `active_matches` table. The data tab will show the cached JSON matching the parsed telemetry payload.

---

## 5. Webserver Installation Guide (cPanel Deployment)

Deploying to cPanel requires no secondary background services or daemon scripts:

### Step 1: Upload Files
1.  Zip the contents of `g:\repo\fortify-standalone\` **excluding `node_modules/`**.
2.  Log into cPanel, open **File Manager**, and upload the zip to the application root directory (e.g., `public_html/fortify-bot/`). Extract the files.

### Step 2: Register Application in cPanel
1.  Navigate to **Setup Node.js App** (Node.js Selector / Application Manager) in cPanel.
2.  Click **Create Application** and fill out the fields:
    *   **Node.js version:** Select `14.x` or higher.
    *   **Application mode:** `Production`.
    *   **Application root:** The folder name where you extracted the code (e.g., `fortify-bot`).
    *   **Application URL:** Select your target domain/subdomain (e.g., `bot.yourdomain.com`).
    *   **Application startup file:** `build/app.js`.
3.  Click **Create**.

### Step 3: Set Environment Variables
Under the **Environment variables** section in cPanel's Node.js selector page, add your production settings:
*   `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` (pointing to your server's database).
*   `BOT_USERNAME`, `TWITCH_OAUTH_TOKEN` (your active Twitch bot credentials).

### Step 4: Launch
1.  Click **Run JS Install** in the cPanel GUI to install the application dependencies.
2.  Click **Restart Application**.

---

## 6. Client Game Configuration & Multi-Tenant Support (Streamer Setup)

To let other streamers (or yourself) use your private Twitch bot, the system dynamically parses the **auth** field inside each streamer's GSI payload.

### A. Register the Streamer in MariaDB
For each streamer who wants to use your bot, create a new row in your MariaDB `user` table:
*   `steamid`: The streamer's 64-bit Steam ID (e.g., `76561198047920049`).
*   `twitchName`: The streamer's exact Twitch channel username in lowercase (e.g., `streamer`).
*   `registered`: `true`
*   `suspended`: `false`
*   `tosAccepted`: `true`
*   `publicProfile`: `true`

---

### B. Configure the Streamer's PC
Each streamer must place a Game State Integration (GSI) config file in their local game directory:

1.  Open your Steam Dota Underlords configuration folder:  
    `Steam\steamapps\common\Underlords\game\dac\cfg\gamestate_integration\`
2.  Create a file named `gamestate_integration_fortify.cfg`.
3.  Open the file in a text editor and enter the following settings:
    ```txt
    "Fortify Dota Underlords GSI Configuration"
    {
        "uri"           "http://bot.yourdomain.com/gsi"
        "timeout"       "5.0"
        "buffer"        "0.1"
        "throttle"      "0.1"
        "heartbeat"     "30.0"
        "data"
        {
            "provider"      "1"
            "player"        "1"
            "board"         "1"
            "shop"          "1"
        }
        "auth"          "streamer"
    }
    ```
    *   **`uri`:** Replace `http://bot.yourdomain.com/gsi` with the actual subdomain or domain URL assigned to your cPanel node application.
    *   **`auth`:** Must match their exact **Twitch username** (in lowercase) registered in your database. This is used by your cPanel GSI receiver to identify the streamer and save their match telemetry separately in MariaDB.
4.  Launch *Dota Underlords*. The game client will automatically broadcast telemetry to your webserver, enabling your Twitch bot to reply to `!mmr` commands in their chat immediately.

