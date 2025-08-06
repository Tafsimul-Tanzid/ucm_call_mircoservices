@echo off
echo Stopping Redis containers...
echo.

docker-compose down

echo.
echo Redis containers stopped.
echo.
pause
