@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
set "STUDIO=%ROOT%vipo  סטודיו תמונות"

echo Starting VIPO server (Next.js) and VIPO Image Studio (Electron)...
echo.

start "VIPO Server (3001)" cmd /k "cd /d \"%ROOT%\" && if not exist node_modules (npm install) && npm run dev"

start "VIPO Image Studio (Electron+Vite)" cmd /k "cd /d \"%STUDIO%\" && if not exist node_modules (npm install) && npm run dev"

echo Started.
echo - Server: http://localhost:3001
echo - Studio: will open in a separate window
echo.
echo To stop: close the two opened terminal windows.
echo.
pause
