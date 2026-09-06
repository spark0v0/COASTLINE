@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run this local launcher.
  echo You can also host the dist folder with any static web server.
  pause
  exit /b 1
)
node scripts\serve.mjs --open
pause
