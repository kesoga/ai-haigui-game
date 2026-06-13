@echo off
setlocal
cd /d "%~dp0frontend"
echo Starting AI Haigui frontend at http://127.0.0.1:5173/
echo Keep this window open while using the site.
npm.cmd run dev -- --host 127.0.0.1
pause
