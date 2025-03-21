const Redis = require("ioredis");

const redisConfig = {
  // Use full Redis URL with credentials
  url:
    process.env.REDIS_URL ||
    "rediss://default:11WgxZSKixv1GTDx6apIlZhK0KWyErR4@redis-13632.c55.eu-central-1-1.ec2.redns.redis-cloud.com:13632",
  tls: {
    rejectUnauthorized: false, // Required for Redis Cloud certificates
  },
  retryStrategy: (times) => {
    const maxRetryTime = 1000 * 60; // 1 minute max
    const delay = Math.min(times * 1000, maxRetryTime);
    console.log(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: 3, // Limit retries per request
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // Only reconnect on specific errors
      return true;
    }
    return false;
  },
  lazyConnect: true, // Only connect when needed
  showFriendlyErrorStack: true, // Better error messages
};

function createRedisClient() {
  const client = new Redis(redisConfig);

  client.on("connect", () => {
    console.log("Successfully connected to Redis Cloud");
  });

  client.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  client.on("ready", () => {
    console.log("Redis client ready and connected");
  });

  client.on("reconnecting", () => {
    console.log("Redis client reconnecting...");
  });

  // Test the connection
  client
    .ping()
    .then(() => {
      console.log("Redis connection test successful");
    })
    .catch((err) => {
      console.error("Redis connection test failed:", err);
    });

  return client;
}

module.exports = {
  createRedisClient,
  redisConfig,
};
