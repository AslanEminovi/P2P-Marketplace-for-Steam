const Redis = require("ioredis");

const REDIS_URL =
  process.env.REDIS_URL ||
  "rediss://default:11WgxZSKixv1GTDx6apIlZhK0KWyErR4@redis-13632.c55.eu-central-1-1.ec2.redns.redis-cloud.com:13632";

function createRedisClient() {
  console.log(
    "Creating Redis client with URL:",
    REDIS_URL.replace(/\/\/[^@]+@/, "//*****@")
  ); // Log URL with hidden credentials

  const client = new Redis(REDIS_URL, {
    tls: {
      rejectUnauthorized: false,
    },
    retryStrategy(times) {
      const delay = Math.min(times * 1000, 60000);
      console.log(`Retrying Redis connection in ${delay}ms...`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    connectTimeout: 20000,
    lazyConnect: false,
    showFriendlyErrorStack: true,
  });

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

  client.on("end", () => {
    console.log("Redis connection ended");
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
  REDIS_URL,
};
