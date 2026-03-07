@echo off
echo ==================================================
echo         STARTING SENTINELX ECOSYSTEM
echo ==================================================

echo.
echo [1/4] Cleaning up old background processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Starting Backend Server (Port 8088)...
start "SentinelX Backend" cmd /k "cd /d "%~dp0sentinelx\server" && npm start"

echo.
echo [3/4] Starting Admin Dashboard (Port 3000)...
start "SentinelX Admin" cmd /k "cd /d "%~dp0sentinelx\admin" && npm run dev"

echo.
echo [4/4] Starting Mobile Packager (Port 8081)...
start "SentinelX React Native Metro" cmd /k "cd /d "%~dp0sentinelx\mobile\react-native-mapbox-app" && npx react-native start --reset-cache"

echo.
echo ==================================================
echo All services are booting up in separate windows!
echo Once the Metro packager window says 'Welcome to React Native',
echo hit 'a' in that window to launch the Android app, OR run:
echo    npx react-native run-android
echo inside the mobile app folder.
echo ==================================================
pause
