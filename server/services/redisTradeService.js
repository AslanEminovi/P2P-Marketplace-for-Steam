const redis = require("../config/redis");
const { logger } = require("../utils/logger");
const Trade = require("../models/Trade");

// Redis key prefixes
const TRADE_KEY_PREFIX = "trade:";
const USER_TRADES_PREFIX = "user:trades:";
const TRADE_STATS_PREFIX = "trade:stats:";

// TTL values (in seconds)
const TRADE_TTL = 60; // 1 minute
const USER_TRADES_TTL = 300; // 5 minutes
const TRADE_STATS_TTL = 600; // 10 minutes

/**
 * Redis channels for pub/sub communication
 */
const CHANNELS = {
  TRADE_CREATED: "trade:created",
  TRADE_UPDATED: "trade:updated",
  TRADE_DELETED: "trade:deleted",
  TRADE_STATUS_CHANGED: "trade:status:changed",
};

/**
 * Format a trade key for Redis
 * @param {string} tradeId - The trade ID
 * @returns {string} The Redis key
 */
const getTradeKey = (tradeId) => `${TRADE_KEY_PREFIX}${tradeId}`;

/**
 * Format a user trades key for Redis
 * @param {string} userId - The user ID
 * @returns {string} The Redis key
 */
const getUserTradesKey = (userId) => `${USER_TRADES_PREFIX}${userId}`;

/**
 * Format a trade stats key for Redis
 * @param {string} userId - The user ID
 * @returns {string} The Redis key
 */
const getTradeStatsKey = (userId) => `${TRADE_STATS_PREFIX}${userId}`;

/**
 * Cache a trade in Redis
 * @param {Object} trade - The trade document
 * @returns {Promise<void>}
 */
const cacheTrade = async (trade) => {
  if (!redis.isEnabled) return null;

  try {
    const tradeKey = getTradeKey(trade._id.toString());

    await redis.setCache(tradeKey, JSON.stringify(trade), TRADE_TTL);
    logger.debug(`Cached trade ${trade._id} in Redis`);

    return true;
  } catch (error) {
    logger.error(`Error caching trade in Redis: ${error.message}`, { error });
    return null;
  }
};

/**
 * Get a trade from Redis cache
 * @param {string} tradeId - The trade ID
 * @returns {Promise<Object|null>} The trade or null if not found
 */
const getTradeFromCache = async (tradeId) => {
  if (!redis.isEnabled) return null;

  try {
    const tradeKey = getTradeKey(tradeId);
    const cachedTrade = await redis.getCache(tradeKey);

    if (!cachedTrade) {
      return null;
    }

    return JSON.parse(cachedTrade);
  } catch (error) {
    logger.error(`Error getting trade from Redis cache: ${error.message}`, {
      error,
    });
    return null;
  }
};

/**
 * Cache a user's trades in Redis
 * @param {string} userId - The user ID
 * @param {Array} trades - The user's trades
 * @returns {Promise<boolean>} True if cached successfully
 */
const cacheUserTrades = async (userId, trades) => {
  if (!redis.isEnabled) return false;

  try {
    const userTradesKey = getUserTradesKey(userId);

    await redis.setCache(
      userTradesKey,
      JSON.stringify(trades),
      USER_TRADES_TTL
    );
    logger.debug(`Cached ${trades.length} trades for user ${userId} in Redis`);

    return true;
  } catch (error) {
    logger.error(`Error caching user trades in Redis: ${error.message}`, {
      error,
    });
    return false;
  }
};

/**
 * Get a user's trades from Redis cache
 * @param {string} userId - The user ID
 * @returns {Promise<Array|null>} The user's trades or null if not found
 */
const getUserTradesFromCache = async (userId) => {
  if (!redis.isEnabled) return null;

  try {
    const userTradesKey = getUserTradesKey(userId);
    const cachedTrades = await redis.getCache(userTradesKey);

    if (!cachedTrades) {
      return null;
    }

    return JSON.parse(cachedTrades);
  } catch (error) {
    logger.error(
      `Error getting user trades from Redis cache: ${error.message}`,
      { error }
    );
    return null;
  }
};

/**
 * Cache a user's trade statistics in Redis
 * @param {string} userId - The user ID
 * @param {Object} stats - The user's trade statistics
 * @returns {Promise<boolean>} True if cached successfully
 */
const cacheTradeStats = async (userId, stats) => {
  if (!redis.isEnabled) return false;

  try {
    const statsKey = getTradeStatsKey(userId);

    await redis.setCache(statsKey, JSON.stringify(stats), TRADE_STATS_TTL);
    logger.debug(`Cached trade stats for user ${userId} in Redis`);

    return true;
  } catch (error) {
    logger.error(`Error caching trade stats in Redis: ${error.message}`, {
      error,
    });
    return false;
  }
};

/**
 * Get a user's trade statistics from Redis cache
 * @param {string} userId - The user ID
 * @returns {Promise<Object|null>} The user's trade statistics or null if not found
 */
const getTradeStatsFromCache = async (userId) => {
  if (!redis.isEnabled) return null;

  try {
    const statsKey = getTradeStatsKey(userId);
    const cachedStats = await redis.getCache(statsKey);

    if (!cachedStats) {
      return null;
    }

    return JSON.parse(cachedStats);
  } catch (error) {
    logger.error(
      `Error getting trade stats from Redis cache: ${error.message}`,
      { error }
    );
    return null;
  }
};

/**
 * Update trade statistics counters in Redis
 * @param {string} userId - The user ID
 * @param {string} counterName - The counter to increment/decrement
 * @param {number} amount - The amount to increment/decrement by (default: 1)
 * @returns {Promise<boolean>} True if updated successfully
 */
const updateTradeStatsCounter = async (userId, counterName, amount = 1) => {
  if (!redis.isEnabled) return false;

  try {
    const statsKey = getTradeStatsKey(userId);

    // Get current stats or create empty object
    const existingStats = (await getTradeStatsFromCache(userId)) || {
      completedTrades: 0,
      pendingTrades: 0,
      cancelledTrades: 0,
      totalValue: 0,
    };

    // Update the counter
    if (existingStats[counterName] !== undefined) {
      existingStats[counterName] += amount;

      // Don't allow negative values for counters
      if (existingStats[counterName] < 0) {
        existingStats[counterName] = 0;
      }

      // Cache the updated stats
      await cacheTradeStats(userId, existingStats);
      logger.debug(
        `Updated ${counterName} counter for user ${userId} by ${amount}`
      );

      return true;
    }

    return false;
  } catch (error) {
    logger.error(
      `Error updating trade stats counter in Redis: ${error.message}`,
      { error }
    );
    return false;
  }
};

/**
 * Publish a trade event to Redis pub/sub
 * @param {string} channel - The channel to publish to
 * @param {Object} data - The data to publish
 * @returns {Promise<boolean>} True if published successfully
 */
const publishTradeEvent = async (channel, data) => {
  if (!redis.isEnabled) return false;

  try {
    await redis.publisher.publish(channel, JSON.stringify(data));
    logger.debug(`Published event to ${channel}`);

    return true;
  } catch (error) {
    logger.error(`Error publishing trade event to Redis: ${error.message}`, {
      error,
    });
    return false;
  }
};

/**
 * Invalidate a trade in Redis cache
 * @param {string} tradeId - The trade ID
 * @returns {Promise<boolean>} True if invalidated successfully
 */
const invalidateTrade = async (tradeId) => {
  if (!redis.isEnabled) return false;

  try {
    const tradeKey = getTradeKey(tradeId);

    await redis.deleteCache(tradeKey);
    logger.debug(`Invalidated trade ${tradeId} in Redis cache`);

    return true;
  } catch (error) {
    logger.error(`Error invalidating trade in Redis cache: ${error.message}`, {
      error,
    });
    return false;
  }
};

/**
 * Invalidate a user's trades in Redis cache
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} True if invalidated successfully
 */
const invalidateUserTrades = async (userId) => {
  if (!redis.isEnabled) return false;

  try {
    const userTradesKey = getUserTradesKey(userId);

    await redis.deleteCache(userTradesKey);
    logger.debug(`Invalidated trades for user ${userId} in Redis cache`);

    return true;
  } catch (error) {
    logger.error(
      `Error invalidating user trades in Redis cache: ${error.message}`,
      { error }
    );
    return false;
  }
};

/**
 * Subscribe to trade events for real-time updates
 * @param {Function} callback - Function to call when an event is received
 * @returns {Promise<void>}
 */
const subscribeToTradeEvents = async (callback) => {
  if (!redis.isEnabled) return;

  try {
    // Subscribe to all trade event channels
    const channels = Object.values(CHANNELS);

    for (const channel of channels) {
      await redis.subscriber.subscribe(channel);
      logger.info(`Subscribed to Redis channel: ${channel}`);
    }

    // Set up message handler
    redis.subscriber.on("message", (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(channel, data);
      } catch (error) {
        logger.error(`Error handling Redis message: ${error.message}`, {
          error,
        });
      }
    });
  } catch (error) {
    logger.error(`Error subscribing to trade events: ${error.message}`, {
      error,
    });
  }
};

/**
 * Fetch trade from MongoDB and update Redis cache
 * @param {string} tradeId - The trade ID
 * @returns {Promise<Object|null>} The trade or null if not found
 */
const refreshTradeCache = async (tradeId) => {
  try {
    const trade = await Trade.findById(tradeId).populate("buyer seller item");

    if (!trade) {
      return null;
    }

    // Cache the trade
    await cacheTrade(trade);

    return trade;
  } catch (error) {
    logger.error(`Error refreshing trade cache: ${error.message}`, { error });
    return null;
  }
};

module.exports = {
  // Cache methods
  cacheTrade,
  getTradeFromCache,
  cacheUserTrades,
  getUserTradesFromCache,
  cacheTradeStats,
  getTradeStatsFromCache,
  updateTradeStatsCounter,

  // Pub/sub methods
  publishTradeEvent,
  subscribeToTradeEvents,

  // Cache invalidation methods
  invalidateTrade,
  invalidateUserTrades,
  refreshTradeCache,

  // Constants
  CHANNELS,
  TRADE_TTL,
  USER_TRADES_TTL,
  TRADE_STATS_TTL,
};
