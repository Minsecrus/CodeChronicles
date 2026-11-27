@echo off
cd /d "%~dp0"
echo Starting Minimal Card RPG server on http://localhost:3456 ...
start "" http://localhost:3456
node server.mjs
pause
