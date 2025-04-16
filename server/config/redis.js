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

// Create a Redis client with retry strategy
const createRedisClient = () => {
  const options = {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis connection retry in ${delay}ms (attempt #${times})`);
      return delay;
    },
  };

  // Add password if provided
  if (REDIS_PASSWORD) {
    options.password = REDIS_PASSWORD;
  }

  return new Redis(REDIS_URL, options);
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
    pubClient.on("error", (err) =>
      console.error("Redis Publisher Error:", err)
    );
    subClient.on("error", (err) =>
      console.error("Redis Subscriber Error:", err)
    );

    // Add connection handlers
    pubClient.on("connect", () => console.log("Redis Publisher connected"));
    subClient.on("connect", () => console.log("Redis Subscriber connected"));

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
