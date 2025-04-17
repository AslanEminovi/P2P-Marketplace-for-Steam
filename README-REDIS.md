# Redis Configuration for CS2 Marketplace

This document provides instructions for setting up Redis for the online status tracking functionality in CS2 Marketplace.

## Why Redis is Important

Redis is used for:

1. Real-time online status tracking
2. Cross-server communication for multi-instance deployments
3. Fast data access for user presence information
4. Reliable message queueing

## Local Development Setup

### Option 1: Using Docker (Recommended)

1. Install Docker from [docker.com](https://www.docker.com/products/docker-desktop)

2. Run Redis using Docker:

   ```bash
   docker run --name cs2-redis -p 6379:6379 -d redis:alpine
   ```

3. Set environment variable in your `.env` file:
   ```
   REDIS_URL=redis://localhost:6379
   ```

### Option 2: Native Installation

1. Install Redis for your operating system:

   - Mac: `brew install redis`
   - Ubuntu/Debian: `sudo apt install redis-server`
   - Windows: Use Redis for Windows from [https://github.com/tporadowski/redis/releases](https://github.com/tporadowski/redis/releases)

2. Start Redis server:

   - Mac/Linux: `redis-server`
   - Windows: Start the Redis service

3. Set environment variable in your `.env` file:
   ```
   REDIS_URL=redis://localhost:6379
   ```

## Production Setup

For production, we recommend using a managed Redis service:

### Option 1: Redis Cloud (Easy setup)

1. Sign up for an account at [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
2. Create a free or paid subscription
3. Create a new database
4. Get the connection string
5. Set the environment variable:
   ```
   REDIS_URL=redis://username:password@host:port
   ```

### Option 2: AWS ElastiCache

1. Create an ElastiCache Redis cluster
2. Configure VPC security groups to allow access
3. Use the connection string from the ElastiCache console
4. Set the environment variable:
   ```
   REDIS_URL=redis://username:password@host:port
   ```

## Verifying Redis Connection

To verify that Redis is properly connected:

1. Start the server
2. Check the logs for messages like:

   ```
   [socketService] Redis URL detected (redis://localhost:6379), initializing Redis
   Redis Publisher connected
   Redis Subscriber connected
   [socketService] Redis test write successful
   [socketService] Redis subscriptions initialized successfully
   ```

3. If you see any errors, check:
   - Redis server is running
   - REDIS_URL is correct
   - Network connectivity
   - Firewall settings

## Troubleshooting

If online status isn't working:

1. Check server logs for Redis connection errors
2. Verify Redis is running with `redis-cli ping` (should return "PONG")
3. Check that heartbeats are being received and processed
4. Verify that the Redis TTL values are appropriate (currently set to 120 seconds)
5. Make sure your browser is sending heartbeat events

## Additional Redis Configuration Options

You can configure additional Redis options by setting these environment variables:

```
REDIS_PASSWORD=your_password
REDIS_PREFIX=cs2market:
```

For more information, refer to the Redis documentation at [redis.io](https://redis.io/documentation).
