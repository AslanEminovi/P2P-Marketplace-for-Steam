/**
 * Redis configuration for CS2 Marketplace
 * This module initializes and provides Redis clients for pub/sub and caching
 */

const Redis = require("ioredis");
let pubClient, subClient;

// Set up Redis environment variables with defaults
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_PREFIX = process.env.REDIS_PREFIX || "cs2market:";

// Log Redis config (hiding password)
console.log("=== REDIS CONFIGURATION ===");
console.log("Redis URL:", REDIS_URL.replace(/\/\/(.+?)@/, "//****@"));
console.log("Redis Password:", REDIS_PASSWORD ? "****" : "Not set");
console.log("Redis Prefix:", REDIS_PREFIX);
console.log("Redis Enabled:", process.env.USE_REDIS === "true" ? "Yes" : "No");
console.log("Server ID:", process.env.SERVER_ID || "Not set");
console.log("========================");

// Create a Redis client with retry strategy
const createRedisClient = () => {
  console.log(
    "Creating Redis client with URL:",
    REDIS_URL.replace(/\/\/(.+?)@/, "//****@")
  );

  const options = {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis connection retry in ${delay}ms (attempt #${times})`);
      return delay;
    },
  };

  // Add password if provided
  if (REDIS_PASSWORD) {
    console.log("Using Redis password from environment variable");
    options.password = REDIS_PASSWORD;
  }

  try {
    const client = new Redis(REDIS_URL, options);
    console.log("Redis client created successfully");
    return client;
  } catch (err) {
    console.error("Error creating Redis client:", err);
    throw err;
  }
};

/**
 * Initialize Redis connections
 * @returns {Object} Object containing pubClient and subClient
 */
const initRedis = () => {
  try {
    console.log("Initializing Redis connections...");

    // Create publisher and subscriber clients
    pubClient = createRedisClient();
    subClient = createRedisClient();

    // Add error handling
    pubClient.on("error", (err) => {
      console.error("Redis Publisher Error:", err);
      console.error("Redis connection details:", {
        url: REDIS_URL.replace(/\/\/(.+?)@/, "//****@"),
        hasPassword: !!REDIS_PASSWORD,
        status: pubClient ? pubClient.status : "Not Available",
      });
    });

    subClient.on("error", (err) =>
      console.error("Redis Subscriber Error:", err)
    );

    // Add connection handlers
    pubClient.on("connect", () =>
      console.log("Redis Publisher connected successfully")
    );
    subClient.on("connect", () =>
      console.log("Redis Subscriber connected successfully")
    );

    // Add ready handlers
    pubClient.on("ready", () => {
      console.log("Redis Publisher ready");
      // Test the connection with a ping
      pubClient.ping((err, result) => {
        if (err) {
          console.error("Redis PING failed:", err);
        } else {
          console.log("Redis PING successful:", result);
        }
      });
    });

    return { pubClient, subClient };
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
    throw error;
  }
};

/**
 * Create a key with the application prefix
 * @param {string} key - The key to prefix
 * @returns {string} The prefixed key
 */
const createKey = (key) => `${REDIS_PREFIX}${key}`;

/**
 * Store a value in Redis with optional expiration
 * @param {string} key - The key to store
 * @param {any} value - The value to store (will be JSON stringified)
 * @param {number} [expireSeconds] - Optional expiration time in seconds
 */
const setCache = async (key, value, expireSeconds = null) => {
  const prefixedKey = createKey(key);
  const stringValue = JSON.stringify(value);

  try {
    if (expireSeconds) {
      await pubClient.setex(prefixedKey, expireSeconds, stringValue);
    } else {
      await pubClient.set(prefixedKey, stringValue);
    }
    return true;
  } catch (error) {
    console.error(`Redis setCache error for key ${prefixedKey}:`, error);
    return false;
  }
};

/**
 * Get a value from Redis
 * @param {string} key - The key to retrieve
 * @returns {any} The parsed value or null if not found
 */
const getCache = async (key) => {
  const prefixedKey = createKey(key);

  try {
    const value = await pubClient.get(prefixedKey);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Redis getCache error for key ${prefixedKey}:`, error);
    return null;
  }
};

/**
 * Delete a key from Redis
 * @param {string} key - The key to delete
 */
const deleteCache = async (key) => {
  const prefixedKey = createKey(key);

  try {
    await pubClient.del(prefixedKey);
    return true;
  } catch (error) {
    console.error(`Redis deleteCache error for key ${prefixedKey}:`, error);
    return false;
  }
};

/**
 * Store a hash in Redis
 * @param {string} key - The hash key
 * @param {Object} hash - The hash to store
 * @param {number} [expireSeconds] - Optional expiration time in seconds
 */
const setHashCache = async (key, hash, expireSeconds = null) => {
  const prefixedKey = createKey(key);

  try {
    // Convert all values to strings
    const stringHash = {};
    for (const [field, value] of Object.entries(hash)) {
      stringHash[field] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    }

    // Use pipeline for efficiency
    const pipeline = pubClient.pipeline();
    pipeline.hmset(prefixedKey, stringHash);

    if (expireSeconds) {
      pipeline.expire(prefixedKey, expireSeconds);
    }

    await pipeline.exec();
    return true;
  } catch (error) {
    console.error(`Redis setHashCache error for key ${prefixedKey}:`, error);
    return false;
  }
};

/**
 * Get a hash from Redis
 * @param {string} key - The hash key
 * @returns {Object} The hash or null if not found
 */
const getHashCache = async (key) => {
  const prefixedKey = createKey(key);

  try {
    const hash = await pubClient.hgetall(prefixedKey);

    // Parse JSON values
    if (hash && Object.keys(hash).length > 0) {
      for (const field in hash) {
        try {
          hash[field] = JSON.parse(hash[field]);
        } catch {
          // If not JSON, keep as is
        }
      }
      return hash;
    }

    return null;
  } catch (error) {
    console.error(`Redis getHashCache error for key ${prefixedKey}:`, error);
    return null;
  }
};

/**
 * Check if Redis is connected
 * @returns {boolean} Whether Redis is connected
 */
const isConnected = () => {
  return pubClient && pubClient.status === "ready";
};

/**
 * Gracefully close Redis connections
 */
const closeConnections = async () => {
  console.log("Closing Redis connections...");

  const promises = [];
  if (pubClient) promises.push(pubClient.quit());
  if (subClient) promises.push(subClient.quit());

  await Promise.all(promises);
  console.log("Redis connections closed");
};

module.exports = {
  initRedis,
  pubClient,
  subClient,
  setCache,
  getCache,
  deleteCache,
  setHashCache,
  getHashCache,
  isConnected,
  closeConnections,
};
