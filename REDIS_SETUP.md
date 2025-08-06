# Redis Setup Guide

## Option 1: Using Docker Desktop (Recommended)

### Step 1: Start Docker Desktop
1. **Open Docker Desktop** from your Windows Start menu
2. **Wait for Docker to start** (you'll see "Docker Desktop is running" in the system tray)
3. **Verify Docker is running** by opening a terminal and running:
   ```bash
   docker info
   ```

### Step 2: Start Redis Container
Once Docker Desktop is running, execute these commands in your project directory:

```bash
# Start Redis container
docker-compose up -d redis

# Verify Redis is running
docker ps
```

### Step 3: Optional - Start Redis Web UI
```bash
# Start Redis Commander (Web UI)
docker-compose up -d redis-commander

# Access Redis Commander at: http://localhost:8081
```

### Step 4: Test Redis Connection
```bash
# Test Redis connection
docker exec call-service-redis redis-cli ping
# Should return: PONG
```

## Option 2: Direct Docker Commands (If docker-compose fails)

```bash
# Pull Redis image
docker pull redis:7-alpine

# Run Redis container
docker run -d --name call-service-redis -p 6379:6379 redis:7-alpine

# Test connection
docker exec call-service-redis redis-cli ping
```

## Option 3: Windows Redis Installation (Alternative)

1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Install and start Redis service
3. Redis will run on localhost:6379

## Verify Your Application Can Connect

1. **Start your NestJS application**:
   ```bash
   npm run start:dev
   ```

2. **Check cache status**:
   ```bash
   GET http://localhost:3000/call-service/cache/status
   ```

3. **You should see**:
   ```json
   {
     "success": true,
     "redisConnected": true,
     "message": "Cache service is running with Redis"
   }
   ```

## Troubleshooting

### If Docker Desktop won't start:
- Restart your computer
- Check Windows features: Enable "Windows Subsystem for Linux" and "Virtual Machine Platform"
- Run Docker Desktop as Administrator

### If Redis connection fails:
- Check if port 6379 is available: `netstat -an | findstr 6379`
- Verify Docker container is running: `docker ps`
- Check container logs: `docker logs call-service-redis`

### Application works without Redis:
- Your app will function normally but without caching
- Cache status will show: `"redisConnected": false`
- All CDR requests will hit the external API directly

## Stop Redis

```bash
# Stop all containers
docker-compose down

# Or stop specific container
docker stop call-service-redis
```
