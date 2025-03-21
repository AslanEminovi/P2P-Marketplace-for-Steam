const Redis = require("ioredis");

// Redis Cloud configuration
const REDIS_URL =
  process.env.REDIS_URL ||
  "rediss://default:11WgxZSKixv1GTDx6apIlZhK0KWyErR4@redis-13632.c55.eu-central-1-1.ec2.redns.redis-cloud.com:13632";

function createRedisClient() {
  // Parse the Redis URL
  const url = new URL(REDIS_URL);

  // Force SSL by ensuring rediss:// protocol
  url.protocol = "rediss:";

  // Log sanitized URL
  console.log(
    "Creating Redis client with URL:",
    url.toString().replace(/\/\/[^@]+@/, "//*****@")
  );

  const client = new Redis({
    host: url.hostname,
    port: parseInt(url.port) || 13632,
    username: url.username || "default",
    password: url.password,
    tls: {
      rejectUnauthorized: false,
      servername: url.hostname,
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
    enableTLSForSentinelMode: true,
    sentinels: null, // Disable sentinel mode
    natMap: null, // Disable NAT mapping
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
