@echo off
rem Terranet launcher: installs once, starts the local server, opens the browser.
title Terranet
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies, this takes a minute...
  call npm ci
  if errorlevel 1 (
    echo Install failed.
    pause
    exit /b 1
  )
)

echo Starting Terranet at http://localhost:4173 ...
rem Open the browser after the server has had a moment to start.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:4173"
call npm run dev
pause
