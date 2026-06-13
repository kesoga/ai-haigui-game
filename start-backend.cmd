@echo off
setlocal
cd /d "%~dp0backend"
echo Starting AI Haigui backend at http://127.0.0.1:3000/
echo Keep this window open while asking questions in the game.
npm.cmd start
pause
