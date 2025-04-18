/**
 * Trade Service
 * This service handles real-time trade operations and notifications using Redis
 */

const redisConfig = require("../config/redis");
const socketService = require("./socketService");
const { pubClient } = redisConfig;

// Trade status constants
const TRADE_STATUS = {
  CREATED: "created",
  PENDING: "pending",
  AWAITING_SELLER: "awaiting_seller",
  AWAITING_BUYER: "awaiting_buyer",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

// Redis keys
const TRADE_KEY_PREFIX = "trade:";
const ACTIVE_TRADES_KEY = "active_trades";
const USER_TRADES_KEY_PREFIX = "user:trades:";

// Redis channel for trade events
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";

// Check if Redis is enabled
const isRedisEnabled = process.env.USE_REDIS === "true";

/**
 * Create a new trade and store it in Redis
 * @param {Object} tradeData - The trade data
 * @returns {Object} The created trade
 */
const createTrade = async (tradeData) => {
  // First, save to database (use existing MongoDB code)
  const Trade = require("../models/Trade");
  const newTrade = new Trade({
    ...tradeData,
    status: TRADE_STATUS.CREATED,
    createdAt: new Date(),
  });

  await newTrade.save();

  // If Redis is enabled, store trade data for real-time access
  if (isRedisEnabled && pubClient) {
    try {
      // Use the new helper function to cache trade object
      await redisConfig.cacheTradeObject(newTrade, 86400); // 24 hour expiry

      // Increment statistics counters
      await redisConfig.incrementTradeStats("totalTrades");
      await redisConfig.incrementTradeStats("activeTrades");

      // Publish trade creation event
      await pubClient.publish(
        REDIS_CHANNEL_TRADE_UPDATE,
        JSON.stringify({
          type: "trade_created",
          tradeId: newTrade._id.toString(),
          sellerId: newTrade.seller.toString(),
          buyerId: newTrade.buyer.toString(),
          itemId: newTrade.item.toString(),
          status: newTrade.status,
          timestamp: new Date().toISOString(),
        })
      );

      // Send notification to seller
      socketService.sendNotification(newTrade.seller.toString(), {
        title: "New Trade Offer",
        message: `You have received a new trade offer for item ${
          newTrade.itemName || "Unknown"
        }`,
        type: "trade",
        link: `/trades/${newTrade._id}`,
      });
    } catch (error) {
      console.error("Redis error in createTrade:", error);
      // Continue anyway since we've saved to MongoDB
    }
  }

  return newTrade;
};

/**
 * Get a trade by ID, checking Redis cache first
 * @param {string} tradeId - The trade ID
 * @returns {Object} The trade
 */
const getTrade = async (tradeId) => {
  // Try Redis first if enabled
  if (isRedisEnabled && pubClient) {
    try {
      const cachedTrade = await redisConfig.getCachedTrade(tradeId);

      if (cachedTrade) {
        console.log(`Trade ${tradeId} retrieved from Redis cache`);
        return cachedTrade;
      }
    } catch (error) {
      console.error(`Redis error in getTrade for ${tradeId}:`, error);
      // Continue to MongoDB if Redis fails
    }
  }

  // Fallback to MongoDB
  const Trade = require("../models/Trade");
  const trade = await Trade.findById(tradeId)
    .populate("item")
    .populate("buyer", "displayName avatar steamId tradeUrl")
    .populate("seller", "displayName avatar steamId tradeUrl");

  // Cache in Redis if found
  if (trade && isRedisEnabled && pubClient) {
    try {
      await redisConfig.cacheTradeObject(trade, 3600); // 1 hour expiry
    } catch (error) {
      console.error(`Redis error caching trade ${tradeId}:`, error);
    }
  }

  return trade;
};

/**
 * Update trade status in both MongoDB and Redis
 * @param {string} tradeId - The trade ID
 * @param {string} newStatus - The new status
 * @param {Object} metadata - Additional metadata
 * @returns {Object} The updated trade
 */
const updateTradeStatus = async (tradeId, newStatus, metadata = {}) => {
  // First, update in MongoDB
  const Trade = require("../models/Trade");
  const updatedTrade = await Trade.findById(tradeId);

  if (!updatedTrade) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  // Store previous status for stats updates
  const previousStatus = updatedTrade.status;

  // Update status and add to history
  updatedTrade.addStatusHistory(newStatus, metadata.note || "");
  await updatedTrade.save();

  // If Redis is enabled, update cache and publish event
  if (isRedisEnabled && pubClient) {
    try {
      // Update trade in Redis cache
      await redisConfig.cacheTradeObject(updatedTrade, 3600); // 1 hour expiry

      // Update trade statistics based on status change
      const completedStatuses = [
        TRADE_STATUS.COMPLETED,
        TRADE_STATUS.CANCELLED,
        TRADE_STATUS.REJECTED,
        TRADE_STATUS.EXPIRED,
      ];

      // If trade became completed, increment completed counter and decrement active
      if (
        completedStatuses.includes(newStatus) &&
        !completedStatuses.includes(previousStatus)
      ) {
        await redisConfig.incrementTradeStats("completedTrades");
        await redisConfig.incrementTradeStats("activeTrades", -1);

        // If specifically completed (not cancelled), add to total value
        if (newStatus === TRADE_STATUS.COMPLETED && updatedTrade.price) {
          await redisConfig.incrementTradeStats(
            "totalValue",
            updatedTrade.price
          );
        }
      }

      // If trade became active from a completed state (rare case)
      else if (
        !completedStatuses.includes(newStatus) &&
        completedStatuses.includes(previousStatus)
      ) {
        await redisConfig.incrementTradeStats("activeTrades");
        if (previousStatus === TRADE_STATUS.COMPLETED && updatedTrade.price) {
          await redisConfig.incrementTradeStats(
            "totalValue",
            -updatedTrade.price
          );
        }
      }

      // Publish trade update event
      await pubClient.publish(
        REDIS_CHANNEL_TRADE_UPDATE,
        JSON.stringify({
          type: "trade_updated",
          tradeId: updatedTrade._id.toString(),
          sellerId: updatedTrade.seller.toString(),
          buyerId: updatedTrade.buyer.toString(),
          previousStatus,
          newStatus: newStatus,
          timestamp: new Date().toISOString(),
          metadata,
        })
      );

      // Send notifications to both parties
      const statusMessages = {
        [TRADE_STATUS.PENDING]: {
          seller: "Buyer has initiated a trade",
          buyer: "Your trade offer is being processed",
        },
        [TRADE_STATUS.AWAITING_SELLER]: {
          seller: "Action required: Confirm trade",
          buyer: "Waiting for seller to confirm",
        },
        [TRADE_STATUS.AWAITING_BUYER]: {
          seller: "Waiting for buyer to confirm",
          buyer: "Action required: Confirm trade",
        },
        [TRADE_STATUS.COMPLETED]: {
          seller: "Trade completed successfully",
          buyer: "Trade completed successfully",
        },
        [TRADE_STATUS.CANCELLED]: {
          seller: "Trade was cancelled",
          buyer: "Trade was cancelled",
        },
        [TRADE_STATUS.REJECTED]: {
          seller: "Trade was rejected",
          buyer: "Your trade offer was rejected",
        },
        [TRADE_STATUS.EXPIRED]: {
          seller: "Trade expired",
          buyer: "Trade expired",
        },
      };

      // Send to seller
      if (statusMessages[newStatus]?.seller) {
        socketService.sendNotification(updatedTrade.seller.toString(), {
          title: "Trade Update",
          message: statusMessages[newStatus].seller,
          type: "trade",
          link: `/trades/${updatedTrade._id}`,
        });
      }

      // Send to buyer
      if (statusMessages[newStatus]?.buyer) {
        socketService.sendNotification(updatedTrade.buyer.toString(), {
          title: "Trade Update",
          message: statusMessages[newStatus].buyer,
          type: "trade",
          link: `/trades/${updatedTrade._id}`,
        });
      }
    } catch (error) {
      console.error(`Redis error in updateTradeStatus for ${tradeId}:`, error);
      // Continue anyway since we've updated MongoDB
    }
  }

  return updatedTrade;
};

/**
 * Get active trades for a user, checking Redis first
 * @param {string} userId - The user ID
 * @returns {Array} Array of active trades
 */
const getUserActiveTrades = async (userId) => {
  // If Redis is enabled, try to get from cache
  if (isRedisEnabled && pubClient) {
    try {
      const userTradesKey = `${redisConfig.USER_TRADES_KEY_PREFIX}${userId}`;
      const tradeIds = await pubClient.smembers(userTradesKey);

      if (tradeIds && tradeIds.length > 0) {
        const activeTrades = await Promise.all(
          tradeIds.map(async (tradeId) => {
            const trade = await redisConfig.getCachedTrade(tradeId);

            // Only return active trades
            if (
              trade &&
              ![
                TRADE_STATUS.COMPLETED,
                TRADE_STATUS.CANCELLED,
                TRADE_STATUS.REJECTED,
                TRADE_STATUS.EXPIRED,
              ].includes(trade.status)
            ) {
              return trade;
            }
            return null;
          })
        );

        // Filter out null values
        const validTrades = activeTrades.filter((t) => t !== null);

        if (validTrades.length > 0) {
          console.log(
            `${validTrades.length} active trades for user ${userId} retrieved from Redis`
          );
          return validTrades;
        }
      }
    } catch (error) {
      console.error(`Redis error in getUserActiveTrades for ${userId}:`, error);
      // Continue to MongoDB if Redis fails
    }
  }

  // Fallback to MongoDB
  const Trade = require("../models/Trade");
  const activeTrades = await Trade.find({
    $or: [{ buyer: userId }, { seller: userId }],
    status: {
      $nin: [
        TRADE_STATUS.COMPLETED,
        TRADE_STATUS.CANCELLED,
        TRADE_STATUS.REJECTED,
        TRADE_STATUS.EXPIRED,
      ],
    },
  })
    .populate("item")
    .populate("buyer", "displayName avatar steamId")
    .populate("seller", "displayName avatar steamId")
    .sort({ createdAt: -1 });

  // Cache active trades in Redis
  if (activeTrades.length > 0 && isRedisEnabled && pubClient) {
    try {
      await Promise.all(
        activeTrades.map((trade) => redisConfig.cacheTradeObject(trade, 1800)) // 30 minute expiry
      );
    } catch (error) {
      console.error(
        `Redis error caching user active trades for ${userId}:`,
        error
      );
    }
  }

  return activeTrades;
};

/**
 * Get trade statistics with caching
 * @returns {Object} Trade statistics
 */
const getTradeStats = async () => {
  // If Redis is enabled, try to get from cache
  if (isRedisEnabled && pubClient) {
    try {
      const cachedStats = await redisConfig.getCachedTradeStats();

      if (cachedStats) {
        console.log("Trade stats retrieved from Redis cache");
        return cachedStats;
      }
    } catch (error) {
      console.error("Redis error in getTradeStats:", error);
      // Continue to MongoDB if Redis fails
    }
  }

  // Fallback to MongoDB
  const Trade = require("../models/Trade");

  // Get counts with aggregation
  const stats = await Trade.aggregate([
    {
      $facet: {
        totalTrades: [{ $count: "count" }],
        completedTrades: [
          { $match: { status: TRADE_STATUS.COMPLETED } },
          { $count: "count" },
        ],
        activeTrades: [
          {
            $match: {
              status: {
                $nin: [
                  TRADE_STATUS.COMPLETED,
                  TRADE_STATUS.CANCELLED,
                  TRADE_STATUS.REJECTED,
                  TRADE_STATUS.EXPIRED,
                ],
              },
            },
          },
          { $count: "count" },
        ],
        totalValue: [
          { $match: { status: TRADE_STATUS.COMPLETED } },
          { $group: { _id: null, sum: { $sum: "$price" } } },
        ],
      },
    },
  ]);

  // Format the stats
  const formattedStats = {
    totalTrades: stats[0].totalTrades[0]?.count || 0,
    completedTrades: stats[0].completedTrades[0]?.count || 0,
    activeTrades: stats[0].activeTrades[0]?.count || 0,
    totalValue: stats[0].totalValue[0]?.sum || 0,
  };

  // Cache in Redis if enabled
  if (isRedisEnabled && pubClient) {
    try {
      // Update each stat individually
      Object.entries(formattedStats).forEach(async ([key, value]) => {
        await pubClient.hset(
          redisConfig.TRADE_STATS_KEY,
          key,
          value.toString()
        );
      });

      // Set expiry
      await pubClient.expire(redisConfig.TRADE_STATS_KEY, 300); // 5 minute expiry
    } catch (error) {
      console.error("Redis error caching trade stats:", error);
    }
  }

  return formattedStats;
};

/**
 * Clear expired trades
 * Run this periodically to clean up Redis
 */
const clearExpiredTrades = async () => {
  if (!isRedisEnabled || !pubClient) {
    return;
  }

  try {
    // Get all active trades
    const tradeIds = await pubClient.smembers(redisConfig.ACTIVE_TRADES_KEY);

    // Check each trade
    for (const tradeId of tradeIds) {
      const tradeKey = `${redisConfig.TRADE_KEY_PREFIX}${tradeId}`;
      const exists = await pubClient.exists(tradeKey);

      // If trade doesn't exist in Redis anymore (TTL expired), remove from active set
      if (!exists) {
        await pubClient.srem(redisConfig.ACTIVE_TRADES_KEY, tradeId);
        console.log(`Removed expired trade ${tradeId} from active trades set`);
      }
    }
  } catch (error) {
    console.error("Redis error in clearExpiredTrades:", error);
  }
};

/**
 * Synchronize Redis trade stats with MongoDB
 * This ensures our Redis counters stay accurate over time
 */
const syncTradeStatsWithDB = async () => {
  if (!isRedisEnabled || !pubClient) {
    return;
  }

  try {
    console.log("Synchronizing Redis trade stats with database...");

    // Get stats from MongoDB
    const Trade = require("../models/Trade");

    // Get counts with aggregation
    const stats = await Trade.aggregate([
      {
        $facet: {
          totalTrades: [{ $count: "count" }],
          completedTrades: [
            { $match: { status: TRADE_STATUS.COMPLETED } },
            { $count: "count" },
          ],
          activeTrades: [
            {
              $match: {
                status: {
                  $nin: [
                    TRADE_STATUS.COMPLETED,
                    TRADE_STATUS.CANCELLED,
                    TRADE_STATUS.REJECTED,
                    TRADE_STATUS.EXPIRED,
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          totalValue: [
            { $match: { status: TRADE_STATUS.COMPLETED } },
            { $group: { _id: null, sum: { $sum: "$price" } } },
          ],
        },
      },
    ]);

    // Format the stats from database
    const dbStats = {
      totalTrades: stats[0].totalTrades[0]?.count || 0,
      completedTrades: stats[0].completedTrades[0]?.count || 0,
      activeTrades: stats[0].activeTrades[0]?.count || 0,
      totalValue: stats[0].totalValue[0]?.sum || 0,
    };

    // Get current stats from Redis
    const redisStats = (await redisConfig.getCachedTradeStats()) || {};

    // Update Redis with the database values
    await Promise.all(
      Object.entries(dbStats).map(async ([key, value]) => {
        // Only update if there's a significant difference (more than 5%)
        const currentValue = redisStats[key] || 0;
        const difference = Math.abs(currentValue - value);
        const percentDiff = value > 0 ? (difference / value) * 100 : 0;

        if (percentDiff > 5 || difference > 10) {
          console.log(
            `Updating Redis stat ${key}: ${currentValue} -> ${value} (${percentDiff.toFixed(
              2
            )}% difference)`
          );
          await pubClient.hset(
            redisConfig.TRADE_STATS_KEY,
            key,
            value.toString()
          );
        }
      })
    );

    // Set expiry
    await pubClient.expire(redisConfig.TRADE_STATS_KEY, 3600); // 1 hour expiry

    console.log("Trade stats synchronization complete");
  } catch (error) {
    console.error("Error synchronizing trade stats:", error);
  }
};

// Initialize cleanup and synchronization jobs if Redis is enabled
if (isRedisEnabled && pubClient) {
  // Run clearExpiredTrades every hour
  setInterval(clearExpiredTrades, 60 * 60 * 1000);

  // Run stats synchronization every 12 hours
  setInterval(syncTradeStatsWithDB, 12 * 60 * 60 * 1000);

  // Also run the initial synchronization after 5 minutes to ensure stats are accurate
  setTimeout(syncTradeStatsWithDB, 5 * 60 * 1000);
}

// Export functions
module.exports = {
  createTrade,
  getTrade,
  updateTradeStatus,
  getUserActiveTrades,
  getTradeStats,
  syncTradeStatsWithDB,
  TRADE_STATUS,
};
