# start.ps1
# Auto-bootstrap script for complete beginners on Windows

# Force console output encoding to UTF-8 for correct emoji rendering
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Fortify Standalone Bot - Bootstrapper" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Elevate process if needed for installer
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[Info] Relaunching script with Administrator privileges to check/install dependencies..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

# Helper function to locate Dota Underlords game installation folder on Windows
function Find-UnderlordsPath {
    $paths = @()
    
    # Check registry for Steam installation path
    $steamPath = Get-ItemProperty -Path "HKCU:\Software\Valve\Steam" -Name "SteamPath" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SteamPath
    if (-not $steamPath) {
        $steamPath = Get-ItemProperty -Path "HKLM:\SOFTWARE\Wow6432Node\Valve\Steam" -Name "InstallPath" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty InstallPath
    }
    
    if ($steamPath) {
        $paths += Join-Path $steamPath "steamapps\common\Underlords"
        
        # Check secondary Steam library folders in libraryfolders.vdf
        $libFile = Join-Path $steamPath "steamapps\libraryfolders.vdf"
        if (Test-Path $libFile) {
            $libContent = Get-Content $libFile
            foreach ($line in $libContent) {
                if ($line -match '"path"\s+"([^"]+)"') {
                    $libPath = $Matches[1] -replace '\\\\', '\'
                    $paths += Join-Path $libPath "steamapps\common\Underlords"
                }
            }
        }
    }
    
    # Common drive backups
    $drives = @("C", "D", "E", "F")
    foreach ($drive in $drives) {
        $paths += "${drive}:\Program Files (x86)\Steam\steamapps\common\Underlords"
        $paths += "${drive}:\Steam\steamapps\common\Underlords"
        $paths += "${drive}:\SteamLibrary\steamapps\common\Underlords"
    }
    
    foreach ($p in $paths) {
        if (Test-Path $p) {
            return $p
        }
    }
    return $null
}

# 2. Verify Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[Warning] Node.js was not detected on this system." -ForegroundColor Yellow
    Write-Host "[Action] Attempting to install Node.js silently via Windows Package Manager (winget)..." -ForegroundColor Cyan

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Host "[Error] winget is not available. Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        Exit 1
    }

    # Install NodeJS
    Start-Process winget -ArgumentList "install --id OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
    
    # Reload environment PATH to detect node/npm immediately without relaunching shell
    Write-Host "[Info] Reloading PATH environment variable..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host "[Error] Node.js installation could not be verified. Please restart your PC and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        Exit 1
    }
}

Write-Host "[Success] Node.js is ready: $(node --version)" -ForegroundColor Green

# 3. Verify and Setup MariaDB Database
$mysqlPath = "C:\Program Files\MariaDB 12.2\bin\mysqld.exe"
if (-not (Test-Path $mysqlPath)) {
    Write-Host "[Warning] MariaDB was not detected on this system." -ForegroundColor Yellow
    Write-Host "[Action] Installing MariaDB Server silently via winget..." -ForegroundColor Cyan

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Host "[Error] winget is not available. Please install MariaDB manually." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        Exit 1
    }

    # Install MariaDB silently
    Start-Process winget -ArgumentList "install --id MariaDB.Server --silent --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow

    if (-not (Test-Path $mysqlPath)) {
        Write-Host "[Error] MariaDB installation could not be verified at $mysqlPath. Please restart and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        Exit 1
    }
}

Write-Host "[Success] MariaDB is installed at $mysqlPath" -ForegroundColor Green

# Ensure MariaDB service is registered and running
$service = Get-Service -Name MariaDB -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "[Action] Registering MariaDB Windows Service..." -ForegroundColor Cyan
    Start-Process -FilePath $mysqlPath -ArgumentList "--install MariaDB" -Wait -NoNewWindow
}

$service = Get-Service -Name MariaDB -ErrorAction SilentlyContinue
if ($service.Status -ne "Running") {
    Write-Host "[Action] Starting MariaDB Windows Service..." -ForegroundColor Cyan
    try {
        Start-Service -Name MariaDB -ErrorAction Stop
    } catch {
        # Fallback to net start
        net start MariaDB
    }
    Start-Sleep -Seconds 3
}

Write-Host "[Success] MariaDB Service is running." -ForegroundColor Green

# Temporary PATH update for the current session to ensure tools are available
if ($env:Path -notlike "*MariaDB 12.2*") {
    $env:Path += ";C:\Program Files\MariaDB 12.2\bin"
}

# 4. Navigate to repository directory
Set-Location -Path $PSScriptRoot

# 5. Install NPM packages
Write-Host "[Action] Installing project dependencies (npm install)..." -ForegroundColor Cyan
npm install

# 6. Build TypeScript code
Write-Host "[Action] Building application (npm run build)..." -ForegroundColor Cyan
npm run build

# 7. Boot node application
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[Action] Creating .env configuration file from example..." -ForegroundColor Cyan
    Copy-Item (Join-Path $PSScriptRoot ".env.example") $envPath
}

$envContent = Get-Content $envPath -Raw
if ($envContent -like "*your_twitch_bot_username*" -or $envContent -like "*your_twitch_oauth_token*" -or $envContent -notlike "*BOT_USERNAME*") {
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "   [WARNING] TWITCH BOT CREDENTIALS NOT SET  " -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "Your bot will start, but will NOT be able to connect to Twitch chat" -ForegroundColor Gray
    Write-Host "until you configure your credentials." -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    Write-Host "Please edit the configuration file located at:" -ForegroundColor Gray
    Write-Host "   $envPath" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Gray
    Write-Host "Set the following values in that file:" -ForegroundColor Gray
    Write-Host "  * BOT_USERNAME = <your Twitch username>" -ForegroundColor Yellow
    Write-Host "  * TWITCH_OAUTH_TOKEN = <your OAuth token starting with 'oauth:'>" -ForegroundColor Yellow
    Write-Host "    (You can generate one at: https://twitchtokengenerator.com)" -ForegroundColor Gray
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Gray

    $response = Read-Host "SHALL WE START THE SERVICE ANYWAY? (y/N)"
    if ($response.Trim().ToLower() -ne "y") {
        Write-Host ""
        Write-Host "[Info] Startup cancelled. Please configure your .env file and run the script again." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        Exit 0
    }
}

# 8. Setup Game State Integration (GSI) Configuration
$gsiFileName = "gamestate_integration_fortify.cfg"
$localGsiPath = Join-Path $PSScriptRoot $gsiFileName

$gsiContent = @"
"Fortify Dota Underlords GSI Configuration"
{
    "uri"           "http://localhost:6666/gsi"
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
"@

# Create default GSI config locally in the project root
if (-not (Test-Path $localGsiPath)) {
    Write-Host "[Action] Creating default GSI configuration file ($gsiFileName) locally..." -ForegroundColor Cyan
    $gsiContent | Out-File -FilePath $localGsiPath -Encoding utf8
}

# Try to automatically detect game location and install it
$underlordsPath = Find-UnderlordsPath
if ($underlordsPath) {
    $targetGsiFolder = Join-Path $underlordsPath "game\dac\cfg\gamestate_integration"
    if (-not (Test-Path $targetGsiFolder)) {
        New-Item -ItemType Directory -Force -Path $targetGsiFolder | Out-Null
    }
    $targetGsiPath = Join-Path $targetGsiFolder $gsiFileName
    if (-not (Test-Path $targetGsiPath)) {
        Write-Host "[Success] Automatically copied GSI configuration to Dota Underlords game folder:" -ForegroundColor Green
        Write-Host "   $targetGsiPath" -ForegroundColor Cyan
        $gsiContent | Out-File -FilePath $targetGsiPath -Encoding utf8
    } else {
        Write-Host "[Success] GSI configuration is already present in your Dota Underlords game folder." -ForegroundColor Green
    }
} else {
    Write-Host "[Warning] Could not automatically locate your Dota Underlords game installation folder." -ForegroundColor Yellow
    Write-Host "Please copy the created file manually to enable Game State Integration:" -ForegroundColor Gray
    Write-Host "   From: $localGsiPath" -ForegroundColor Cyan
    Write-Host "   To:   Steam\steamapps\common\Underlords\game\dac\cfg\gamestate_integration\" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "[Success] Starting Fortify Standalone Service..." -ForegroundColor Green
Write-Host "---------------------------------------------" -ForegroundColor Cyan
npm start

Read-Host "Press Enter to exit"
