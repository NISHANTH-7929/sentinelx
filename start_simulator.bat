@echo off
curl.exe -X POST http://localhost:8088/api/simulate/start -H "Content-Type: application/json" -d "{\"replay_speed\": 5, \"loop\": true}"
echo.
echo Simulator Triggered! Verified packets are now streaming to WebSockets.
pause
