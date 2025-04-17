/**
 * Redis configuration for CS2 Marketplace
 * This module initializes and provides Redis clients for pub/sub and caching
 */

const Redis = require("ioredis");
let pubClient = null;
let subClient = null;

// Set up Redis environment variables with defaults
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_PREFIX = process.env.REDIS_PREFIX || "cs2market:";
const REDIS_DB_NAME = process.env.REDIS_DB_NAME || "database-M9JSRNME"; // Add database name
const USE_REDIS = process.env.USE_REDIS === "true" || !!process.env.REDIS_URL;

// Create a Redis client with retry strategy
const createRedisClient = () => {
  // Extract host and port from URL for better error handling
  let options = {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis connection retry in ${delay}ms (attempt #${times})`);
      return delay;
    },
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    keepAlive: 10000,
    enableOfflineQueue: true,
    db: 0, // Default database index
  };

  console.log(`Creating Redis client for ${maskRedisUrl(REDIS_URL)}`);

  // Add password if provided
  if (REDIS_PASSWORD) {
    options.password = REDIS_PASSWORD;
    console.log("Using provided Redis password");
  }

  try {
    // For Redis Cloud and similar services that provide full URLs
    const client = new Redis(REDIS_URL, options);

    // For debugging purposes
    console.log(
      `Redis client created with options: ${JSON.stringify({
        ...options,
        password: options.password ? "******" : undefined,
      })}`
    );

    return client;
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    return null;
  }
};

// Function to mask Redis URL for logs
function maskRedisUrl(url) {
  if (!url) return "undefined";
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.password) {
      parsedUrl.password = "******";
    }
    return parsedUrl.toString();
  } catch (e) {
    return url.replace(/:[^:@]*@/, ":******@");
  }
}

/**
 * Initialize Redis connections
 * @returns {Object} Object containing pubClient and subClient
 */
const initRedis = () => {
  try {
    if (!USE_REDIS) {
      console.log("Redis is disabled by configuration");
      return { pubClient: null, subClient: null };
    }

    console.log(
      `Initializing Redis connections to ${maskRedisUrl(REDIS_URL)}...`
    );

    // Create publisher and subscriber clients
    pubClient = createRedisClient();
    subClient = createRedisClient();

    if (!pubClient || !subClient) {
      throw new Error("Failed to create Redis clients");
    }

    // Add error handling
    pubClient.on("error", (err) => {
      console.error(`Redis Publisher Error: ${err.message}`);
    });

    subClient.on("error", (err) => {
      console.error(`Redis Subscriber Error: ${err.message}`);
    });

    // Add connection handlers
    pubClient.on("connect", () => console.log("Redis Publisher connected"));
    pubClient.on("ready", () => console.log("Redis Publisher ready"));

    subClient.on("connect", () => console.log("Redis Subscriber connected"));
    subClient.on("ready", () => console.log("Redis Subscriber ready"));

    // Add reconnection handlers
    pubClient.on("reconnecting", () =>
      console.log("Redis Publisher reconnecting")
    );
    subClient.on("reconnecting", () =>
      console.log("Redis Subscriber reconnecting")
    );

    // Test the connection
    pubClient
      .set("redis:test:init", Date.now().toString(), "EX", 60)
      .then(() => console.log("Redis connection test successful"))
      .catch((err) => console.error("Redis connection test failed:", err));

    return { pubClient, subClient };
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
    return { pubClient: null, subClient: null };
  }
};

// Initialize clients immediately if Redis is enabled
// and wrap in try/catch to prevent breaking the application
try {
  if (USE_REDIS && !pubClient) {
    console.log("[redis] Initializing Redis clients on module load");
    const clients = initRedis();
    pubClient = clients.pubClient;
    subClient = clients.subClient;

    // Report connection status
    if (pubClient) {
      console.log(`[redis] Redis pub client status: ${pubClient.status}`);
    } else {
      console.log("[redis] Failed to create Redis pub client");
    }
  }
} catch (e) {
  console.error("[redis] Error initializing Redis on module load:", e);
  // Don't rethrow, just log the error
}

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
  if (!pubClient) {
    console.log("Redis not initialized, skipping setCache");
    return false;
  }

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
  if (!pubClient) {
    console.log("Redis not initialized, skipping getCache");
    return null;
  }

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
  if (!pubClient) {
    console.log("Redis not initialized, skipping deleteCache");
    return false;
  }

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
  if (!pubClient) {
    console.log("Redis not initialized, skipping setHashCache");
    return false;
  }

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
  if (!pubClient) {
    console.log("Redis not initialized, skipping getHashCache");
    return null;
  }

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

// Export a function to get the current clients
const getClients = () => {
  // If clients don't exist or are not connected, try to initialize them again
  if (!pubClient || !subClient || pubClient.status !== "ready") {
    console.log("[redis] Clients not ready, reinitializing in getClients()");
    const clients = initRedis();
    // Update module level variables
    pubClient = clients.pubClient;
    subClient = clients.subClient;
  }
  return { pubClient, subClient };
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
  getClients,
  USE_REDIS,
};
