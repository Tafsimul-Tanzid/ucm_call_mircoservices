# Redis Pub/Sub and Queue API Documentation

## 🚀 Redis Configuration
Your application is now connected to the live Redis server at `45.114.85.18:6379`

## 📡 Pub/Sub Endpoints

### Publish Message
**POST** `/call-service/pubsub/publish`

Publish a message to a Redis channel.

```json
{
  "channel": "call-events",
  "message": {
    "type": "call-initiated",
    "from": "1001",
    "to": "1002",
    "timestamp": "2025-07-29T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "channel": "call-events",
  "message": { ... },
  "timestamp": "2025-07-29T10:30:00Z",
  "status": "Message published successfully"
}
```

### Subscribe to Channel
**POST** `/call-service/pubsub/subscribe`

Subscribe to a Redis channel for real-time messages.

```json
{
  "channel": "call-events"
}
```

**Response:**
```json
{
  "success": true,
  "channel": "call-events",
  "timestamp": "2025-07-29T10:30:00Z",
  "status": "Subscribed to channel \"call-events\""
}
```

### Pub/Sub Status
**GET** `/call-service/pubsub/status`

Get current Pub/Sub connection status and available channels.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "subscriptions": ["call-events", "cdr-updates"],
  "availableChannels": [
    "call-events",
    "cdr-updates", 
    "extension-changes",
    "system-notifications"
  ],
  "availableQueues": [
    "pending-calls",
    "failed-calls",
    "cdr-processing",
    "notifications"
  ],
  "timestamp": "2025-07-29T10:30:00Z"
}
```

## 📥 Queue Endpoints

### Add to Queue
**POST** `/call-service/queue/add`

Add an item to a Redis queue.

```json
{
  "queueName": "pending-calls",
  "data": {
    "callId": "call-123",
    "from": "1001",
    "to": "1002",
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "queueName": "pending-calls",
  "data": { ... },
  "queueLength": 5,
  "timestamp": "2025-07-29T10:30:00Z",
  "status": "Item added to queue successfully"
}
```

### Get from Queue
**GET** `/call-service/queue/{queueName}/get`

Retrieve and remove the next item from a queue.

**Example:** `GET /call-service/queue/pending-calls/get`

**Response:**
```json
{
  "success": true,
  "queueName": "pending-calls",
  "item": {
    "id": "1722249000000",
    "timestamp": "2025-07-29T10:30:00Z",
    "data": {
      "callId": "call-123",
      "from": "1001",
      "to": "1002",
      "priority": "high"
    }
  },
  "queueLength": 4,
  "timestamp": "2025-07-29T10:30:00Z",
  "status": "Item retrieved from queue"
}
```

### Get Queue Length
**GET** `/call-service/queue/{queueName}/length`

Get the current length of a queue.

**Example:** `GET /call-service/queue/pending-calls/length`

**Response:**
```json
{
  "success": true,
  "queueName": "pending-calls",
  "length": 5,
  "timestamp": "2025-07-29T10:30:00Z"
}
```

## 🔔 Automatic Event Publishing

The application automatically publishes events to Redis channels:

### Call Events
**Channel:** `call-events`

Published when:
- A call is initiated (`makeCall`)
- A call is accepted (`acceptCall`)
- A call is refused (`refuseCall`)

### CDR Updates
**Channel:** `cdr-updates`

Published when:
- CDR data is cached
- CDR data is requested

### Extension Changes
**Channel:** `extension-changes`

Published when:
- Extensions are created
- Extensions are updated
- Extensions are deleted

## 🛠 Use Cases

### 1. Real-time Call Monitoring
```bash
# Subscribe to call events
POST /call-service/pubsub/subscribe
{
  "channel": "call-events"
}

# Make a call (will auto-publish to call-events)
POST /call-service/call/make
{
  "srcExt": "1001",
  "dst": "1002",
  "cookie": "your-session-cookie"
}
```

### 2. Call Queue Management
```bash
# Add failed calls to retry queue
POST /call-service/queue/add
{
  "queueName": "retry-calls",
  "data": {
    "from": "1001",
    "to": "1002",
    "attempts": 1,
    "lastError": "busy"
  }
}

# Process retry queue
GET /call-service/queue/retry-calls/get
```

### 3. CDR Processing Pipeline
```bash
# CDR data requests automatically publish to cdr-updates channel
POST /call-service/cdr-data
{
  "caller": "1001",
  "callee": "1002"
}

# Subscribe to CDR updates for real-time processing
POST /call-service/pubsub/subscribe
{
  "channel": "cdr-updates"
}
```

## 🔧 Testing with Redis CLI

You can also interact directly with Redis:

```bash
# Connect to Redis
redis-cli -h 45.114.85.18 -p 6379

# Subscribe to a channel
SUBSCRIBE call-events

# Publish a test message
PUBLISH call-events "test message"

# Check queue length
LLEN pending-calls

# Add to queue
LPUSH pending-calls "test-item"

# Get from queue
RPOP pending-calls
```

## 🎯 Benefits

1. **Real-time Updates**: Subscribe to channels for instant notifications
2. **Asynchronous Processing**: Use queues for background job processing
3. **Scalability**: Multiple services can subscribe to same channels
4. **Reliability**: Redis provides persistence and high availability
5. **Event-driven Architecture**: Decouple services through pub/sub messaging

Your microservice now supports full Redis pub/sub and queue functionality! 🚀
