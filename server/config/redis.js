const Redis = require("ioredis");

const redisConfig = {
  host: "redis-13632.c55.eu-central-1-1.ec2.redns.redis-cloud.com",
  port: 13632,
  username: "default",
  password: "11WgxZSKixv1GTDx6apIlZhK0KWyErR4",
  retryStrategy: (times) => {
    const maxRetryTime = 1000 * 60 * 60; // 1 hour
    const delay = Math.min(times * 1000, maxRetryTime);
    console.log(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: null, // Disable max retries per request
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    console.log("Redis reconnect on error:", err);
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  tls: {}, // Enable TLS/SSL for Redis Cloud
  lazyConnect: true, // Only connect when needed
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
