const Redis = require("ioredis");
const url = require("url");

// Redis Cloud configuration
const REDIS_URL =
  process.env.REDIS_URL ||
  "rediss://default:11WgxZSKixv1GTDx6apIlZhK0KWyErR4@redis-13632.c55.eu-central-1-1.ec2.redns.redis-cloud.com:13632";

const createRedisClient = () => {
  try {
    // Parse Redis URL from environment
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const parsedUrl = url.parse(redisUrl);

    // Ensure we're using SSL for non-localhost connections
    const isLocalhost = parsedUrl.hostname === "localhost";

    const redisConfig = {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port, 10),
      username: parsedUrl.auth ? parsedUrl.auth.split(":")[0] : undefined,
      password: parsedUrl.auth ? parsedUrl.auth.split(":")[1] : undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      showFriendlyErrorStack: true,
      lazyConnect: true, // Add lazy connect to prevent immediate connection attempts
    };

    // Add TLS options for non-localhost connections
    if (!isLocalhost) {
      redisConfig.tls = {
        // Remove secureProtocol and use only minVersion
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
      };
    }

    console.log(
      `Connecting to Redis at ${parsedUrl.hostname}:${parsedUrl.port} with ${
        !isLocalhost ? "TLS" : "no TLS"
      }`
    );

    const client = new Redis(redisConfig);

    // Add more detailed error handling
    client.on("connect", () => {
      console.log("Successfully connected to Redis");
    });

    client.on("error", (err) => {
      console.error("Redis connection error:", err);
      if (err.code === "ECONNREFUSED") {
        console.log("Attempting to reconnect to Redis...");
      }
    });

    client.on("ready", () => {
      console.log("Redis client is ready");
    });

    client.on("reconnecting", (ms) => {
      console.log(`Reconnecting to Redis in ${ms}ms...`);
    });

    return client;
  } catch (error) {
    console.error("Error creating Redis client:", error);
    throw error;
  }
};

module.exports = {
  createRedisClient,
  REDIS_URL,
};
