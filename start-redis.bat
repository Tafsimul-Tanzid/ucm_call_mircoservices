@echo off
echo Starting Redis with Docker...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Docker is running. Starting Redis container...
docker-compose up -d redis

echo.
echo Waiting for Redis to be ready...
timeout /t 5 /nobreak >nul

REM Check if Redis is ready
docker exec call-service-redis redis-cli ping >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Redis is running successfully!
    echo.
    echo Redis is available at: localhost:6379
    echo Redis Commander (Web UI) will be available at: http://localhost:8081
    echo.
    echo To start Redis Commander (optional):
    echo docker-compose up -d redis-commander
    echo.
    echo To stop Redis:
    echo docker-compose down
) else (
    echo ❌ Redis failed to start properly
)

echo.
pause
