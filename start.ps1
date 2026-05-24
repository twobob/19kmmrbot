# start.ps1
# Auto-bootstrap script for complete beginners on Windows

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

# 3. Navigate to repository directory
Set-Location -Path $PSScriptRoot

# 4. Install NPM packages
Write-Host "[Action] Installing project dependencies (npm install)..." -ForegroundColor Cyan
npm install

# 5. Build TypeScript code
Write-Host "[Action] Building application (npm run build)..." -ForegroundColor Cyan
npm run build

# 6. Boot node application
Write-Host "[Success] Starting Fortify Standalone Service..." -ForegroundColor Green
Write-Host "---------------------------------------------" -ForegroundColor Cyan
npm start

Read-Host "Press Enter to exit"
