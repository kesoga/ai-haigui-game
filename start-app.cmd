@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"
echo Starting AI Haigui backend and frontend...
echo.
start "AI Haigui Backend" /D "%ROOT%backend" cmd /k "npm.cmd start"
start "AI Haigui Frontend" /D "%ROOT%frontend" cmd /k "npm.cmd run dev -- --host 127.0.0.1"
echo.
echo Frontend: http://127.0.0.1:5173/
echo Backend:  http://127.0.0.1:3000/api/test
echo Keep both windows open while playing.
pause
