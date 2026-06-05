# Consolidated Standalone Dota Underlords GSI Twitch Bot

This project is a high-performance, consolidated, standalone version of the **Fortify Dota Underlords Data Platform**. It integrates the Game State Integration (GSI) telemetry receiver and the Twitch Bot (`17kmmrbot`) into a **single, lightweight Node.js application**.

For the full architecture overview, cPanel deployment guide, and multi-tenant streamer setup, see [Docs/HOSTING.md](Docs/HOSTING.md).

![System Architecture](img/architecture_standalone.jpg)

---

## Quickstart / TL;DR (Windows Setup)

If you are on Windows, you can get the bot up and running in a few steps.

### Step 1: Open Terminal and Navigate to Project Folder

Open your terminal (PowerShell or Command Prompt) and change to the folder where you downloaded or extracted the bot files:

If using PowerShell:

```powershell
cd D:\path\to\19kmmrbot
```

If using Command Prompt (CMD):

```cmd
cd /d D:\path\to\19kmmrbot
```

### Step 2: Run the Bootstrapper

Once you are inside the project folder, run the bootstrapper script:

```powershell
powershell ./start.ps1
```

This automatically installs and configures Node.js, MariaDB Server, registers the Windows service, starts the database engine, and compiles the application.

### Step 3: Configure Twitch Credentials

1. Open the newly created `.env` file in the project directory using Notepad or any text editor.
2. Edit `BOT_USERNAME` (your channel name) and `TWITCH_OAUTH_TOKEN` (retrieve one from [twitchtokengenerator.com](https://twitchtokengenerator.com)).
3. Re-run `powershell ./start.ps1` to launch the bot.

### Step 4:  Configure the Gamer PC

Each streamer must place a Game State Integration (GSI) config file in their local game directory.

1. Navigate to your Dota Underlords configuration folder. A typical path is:
   ```
   c:\SteamLibrary\steamapps\common\Underlords\game\dac\cfg\gamestate_integration\
   ```
   **Note:** The `gamestate_integration` folder probably does not exist yet. If it is not there, create it manually inside the `cfg` directory.
2. Create a file named `gamestate_integration_fortify.cfg` inside that folder.
3. Open the file in a text editor and enter the following settings:

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

    * **`uri`:** Replace `http://bot.yourdomain.com/gsi` with the actual subdomain or domain URL assigned to your cPanel node application.
    * **`auth`:** Must match their exact Twitch username (in lowercase) registered in your database. This is used by your cPanel GSI receiver to identify the streamer and save their match telemetry separately in MariaDB.

4. Launch Dota Underlords. The game client will automatically broadcast telemetry to your webserver, enabling your Twitch bot to reply to `!mmr` commands in their chat.

### Local Development GSI Config

If you are running the bot locally, use this tested config file at the same path:

```txt
"Sample Gamestate Integration Script"
{
    "uri" "http://127.0.0.1:3000/upload"
    "timeout" "5.0"
    "buffer"  "0.1"
    "throttle" "0.5"
    "heartbeat" "0.1"
    "auth"
    {
        "key" "rx54AtFVYw2bXmCCWJu6"
    }
    "data"
    {
        //"public_player_state"  "1"
        //"private_player_state"  "1"
    }
}
```
