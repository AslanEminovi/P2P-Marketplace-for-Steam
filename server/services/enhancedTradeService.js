/**
 * Enhanced Trade Service with Redis Integration
 * This service provides optimized trade operations using Redis for caching and real-time updates
 */

const redisConfig = require("../config/redis");
const socketService = require("./socketService");
const mongoose = require("mongoose");
const Trade = require("../models/Trade");
const User = require("../models/User");
const Item = require("../models/Item");

// Redis clients
const { pubClient, cacheClient } = redisConfig.getClients
  ? redisConfig.getClients()
  : {};

// Check if Redis is enabled
const isRedisEnabled = redisConfig.USE_REDIS === true;

// Trade-related Redis keys and channels
const TRADE_KEY_PREFIX = "trade:";
const USER_TRADES_PREFIX = "user:trades:";
const ACTIVE_TRADES_KEY = "active_trades";
const TRADE_STATS_KEY = "trade_stats";
const TRADE_CHANNEL = "trade_updates";

/**
 * Get trade by ID with Redis caching
 * @param {string} tradeId - Trade ID
 * @returns {Promise<Object>} - Trade object
 */
const getTradeById = async (tradeId) => {
  // Early validation
  if (!tradeId || !mongoose.Types.ObjectId.isValid(tradeId)) {
    throw new Error("Invalid trade ID");
  }

  try {
    // Try Redis cache first if enabled
    if (isRedisEnabled && cacheClient) {
      const cacheKey = `${TRADE_KEY_PREFIX}${tradeId}`;
      const cachedTrade = await redisConfig.getCache(cacheKey);

      if (cachedTrade) {
        console.log(
          `[EnhancedTradeService] Trade ${tradeId} retrieved from Redis cache`
        );
        return cachedTrade;
      }
    }

    // Fallback to database
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("buyer", "username displayName avatar steamId tradeUrl")
      .populate("seller", "username displayName avatar steamId tradeUrl");

    if (!trade) {
      throw new Error("Trade not found");
    }

    // Cache in Redis if enabled
    if (isRedisEnabled && cacheClient && trade) {
      const cacheKey = `${TRADE_KEY_PREFIX}${tradeId}`;
      await redisConfig.setCache(cacheKey, trade, 3600); // 1 hour TTL
    }

    return trade;
  } catch (error) {
    console.error(
      `[EnhancedTradeService] Error fetching trade ${tradeId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get user's active trades with Redis optimization
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of trades
 */
const getUserActiveTrades = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  try {
    let tradeIds = [];

    // Try Redis cache first if enabled
    if (isRedisEnabled && cacheClient) {
      const userTradesKey = `${USER_TRADES_PREFIX}${userId}:active`;
      tradeIds = await redisConfig.getCache(userTradesKey);

      // If we have cached IDs, fetch trades
      if (tradeIds && tradeIds.length > 0) {
        console.log(
          `[EnhancedTradeService] Found ${tradeIds.length} cached active trade IDs for user ${userId}`
        );

        // Fetch trades from cache or DB
        const trades = [];
        for (const tradeId of tradeIds) {
          try {
            const trade = await getTradeById(tradeId);
            if (trade) trades.push(trade);
          } catch (err) {
            console.warn(
              `[EnhancedTradeService] Error fetching cached trade ${tradeId}:`,
              err
            );
          }
        }

        // If we got most of the trades, return them
        if (trades.length >= tradeIds.length * 0.8) {
          // Return if we got at least 80% of trades
          return trades;
        }
      }
    }

    // Fallback to database if cache failed or was empty
    console.log(
      `[EnhancedTradeService] Fetching active trades for user ${userId} from database`
    );

    // Non-final statuses
    const activeTrades = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
      status: {
        $nin: ["completed", "cancelled", "rejected", "expired"],
      },
    })
      .sort({ createdAt: -1 })
      .populate("item")
      .populate("buyer", "username displayName avatar steamId tradeUrl")
      .populate("seller", "username displayName avatar steamId tradeUrl");

    // Cache results in Redis if enabled
    if (isRedisEnabled && cacheClient && activeTrades.length > 0) {
      const userTradesKey = `${USER_TRADES_PREFIX}${userId}:active`;

      // Cache the trade IDs
      const ids = activeTrades.map((trade) => trade._id.toString());
      await redisConfig.setCache(userTradesKey, ids, 600); // 10 minute TTL

      // Also cache each trade individually
      for (const trade of activeTrades) {
        const cacheKey = `${TRADE_KEY_PREFIX}${trade._id}`;
        await redisConfig.setCache(cacheKey, trade, 3600); // 1 hour TTL
      }
    }

    return activeTrades;
  } catch (error) {
    console.error(
      `[EnhancedTradeService] Error fetching active trades for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get user's trade history with Redis optimization
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of trades
 */
const getUserTradeHistory = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  try {
    let tradeIds = [];

    // Try Redis cache first if enabled
    if (isRedisEnabled && cacheClient) {
      const userHistoryKey = `${USER_TRADES_PREFIX}${userId}:history`;
      tradeIds = await redisConfig.getCache(userHistoryKey);

      // If we have cached IDs, fetch trades
      if (tradeIds && tradeIds.length > 0) {
        console.log(
          `[EnhancedTradeService] Found ${tradeIds.length} cached history trade IDs for user ${userId}`
        );

        // Fetch trades from cache or DB
        const trades = [];
        for (const tradeId of tradeIds) {
          try {
            const trade = await getTradeById(tradeId);
            if (trade) trades.push(trade);
          } catch (err) {
            // Skip invalid trades
          }
        }

        // If we got most of the trades, return them
        if (trades.length >= tradeIds.length * 0.8) {
          return trades;
        }
      }
    }

    // Fallback to database
    console.log(
      `[EnhancedTradeService] Fetching trade history for user ${userId} from database`
    );

    // Final statuses
    const tradeHistory = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
      status: {
        $in: ["completed", "cancelled", "rejected", "expired"],
      },
    })
      .sort({ updatedAt: -1 })
      .populate("item")
      .populate("buyer", "username displayName avatar steamId tradeUrl")
      .populate("seller", "username displayName avatar steamId tradeUrl");

    // Cache results in Redis if enabled
    if (isRedisEnabled && cacheClient && tradeHistory.length > 0) {
      const userHistoryKey = `${USER_TRADES_PREFIX}${userId}:history`;

      // Cache the trade IDs
      const ids = tradeHistory.map((trade) => trade._id.toString());
      await redisConfig.setCache(userHistoryKey, ids, 3600); // 1 hour TTL

      // Also cache each trade individually
      for (const trade of tradeHistory) {
        const cacheKey = `${TRADE_KEY_PREFIX}${trade._id}`;
        await redisConfig.setCache(cacheKey, trade, 3600); // 1 hour TTL
      }
    }

    return tradeHistory;
  } catch (error) {
    console.error(
      `[EnhancedTradeService] Error fetching trade history for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get trade statistics with Redis caching
 * @returns {Promise<Object>} - Trade statistics
 */
const getTradeStats = async () => {
  try {
    // Try Redis cache first if enabled
    if (isRedisEnabled && cacheClient) {
      const stats = await redisConfig.getCache(TRADE_STATS_KEY);

      if (stats) {
        console.log(
          `[EnhancedTradeService] Trade stats retrieved from Redis cache`
        );
        return stats;
      }
    }

    // Fallback to database
    console.log(`[EnhancedTradeService] Calculating trade stats from database`);

    // Run aggregation to calculate stats
    const aggregateResult = await Trade.aggregate([
      {
        $facet: {
          totalTrades: [{ $count: "count" }],
          completedTrades: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],
          activeTrades: [
            {
              $match: {
                status: {
                  $nin: ["completed", "cancelled", "rejected", "expired"],
                },
              },
            },
            { $count: "count" },
          ],
          totalValue: [
            { $match: { status: "completed" } },
            { $group: { _id: null, sum: { $sum: "$price" } } },
          ],
        },
      },
    ]);

    // Format the stats
    const stats = {
      totalTrades: aggregateResult[0].totalTrades[0]?.count || 0,
      completedTrades: aggregateResult[0].completedTrades[0]?.count || 0,
      activeTrades: aggregateResult[0].activeTrades[0]?.count || 0,
      totalValue: aggregateResult[0].totalValue[0]?.sum || 0,
    };

    // Cache stats in Redis if enabled
    if (isRedisEnabled && cacheClient) {
      await redisConfig.setCache(TRADE_STATS_KEY, stats, 300); // 5 minute TTL
    }

    return stats;
  } catch (error) {
    console.error(`[EnhancedTradeService] Error fetching trade stats:`, error);
    return {
      totalTrades: 0,
      completedTrades: 0,
      activeTrades: 0,
      totalValue: 0,
    };
  }
};

/**
 * Update trade status with Redis and socket notification
 * @param {string} tradeId - Trade ID
 * @param {string} status - New status
 * @param {string} userId - User ID making the change
 * @param {string} note - Optional note about the status change
 */
const updateTradeStatus = async (tradeId, status, userId, note = "") => {
  if (!tradeId || !status) {
    throw new Error("Trade ID and status are required");
  }

  try {
    // Get the trade first
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      throw new Error("Trade not found");
    }

    // Update status and add to history
    trade.status = status;
    trade.updatedAt = new Date();

    // Add status to history
    trade.statusHistory.push({
      status,
      timestamp: new Date(),
      note,
    });

    // If trade is completed, update completed timestamp
    if (status === "completed") {
      trade.completedAt = new Date();

      // Increment stats
      if (isRedisEnabled && cacheClient) {
        await redisConfig.incrementTradeStats("completedTrades", 1);
        await redisConfig.incrementTradeStats("totalValue", trade.price || 0);
      }
    }

    // If trade is in a final state, decrement active trades count
    if (["completed", "cancelled", "rejected", "expired"].includes(status)) {
      if (isRedisEnabled && cacheClient) {
        await redisConfig.incrementTradeStats("activeTrades", -1);
      }
    }

    // Save to database
    await trade.save();

    // Update Redis cache if enabled
    if (isRedisEnabled && cacheClient) {
      const cacheKey = `${TRADE_KEY_PREFIX}${tradeId}`;
      await redisConfig.setCache(cacheKey, trade, 3600); // 1 hour TTL

      // Update user's active/history trade lists if the status changed categories
      const finalStatuses = ["completed", "cancelled", "rejected", "expired"];

      // If the trade moved to a final status
      if (finalStatuses.includes(status)) {
        // Remove from active trade lists and add to history lists
        const buyerActiveKey = `${USER_TRADES_PREFIX}${trade.buyer}:active`;
        const sellerActiveKey = `${USER_TRADES_PREFIX}${trade.seller}:active`;
        const buyerHistoryKey = `${USER_TRADES_PREFIX}${trade.buyer}:history`;
        const sellerHistoryKey = `${USER_TRADES_PREFIX}${trade.seller}:history`;

        // Get current lists from Redis
        const buyerActive = (await redisConfig.getCache(buyerActiveKey)) || [];
        const sellerActive =
          (await redisConfig.getCache(sellerActiveKey)) || [];
        const buyerHistory =
          (await redisConfig.getCache(buyerHistoryKey)) || [];
        const sellerHistory =
          (await redisConfig.getCache(sellerHistoryKey)) || [];

        // Update lists
        const tradeIdStr = tradeId.toString();

        // Remove from active lists if present
        const updatedBuyerActive = buyerActive.filter(
          (id) => id !== tradeIdStr
        );
        const updatedSellerActive = sellerActive.filter(
          (id) => id !== tradeIdStr
        );

        // Add to history lists if not already present
        if (!buyerHistory.includes(tradeIdStr)) {
          buyerHistory.unshift(tradeIdStr);
        }

        if (!sellerHistory.includes(tradeIdStr)) {
          sellerHistory.unshift(tradeIdStr);
        }

        // Save updated lists
        await redisConfig.setCache(buyerActiveKey, updatedBuyerActive, 600);
        await redisConfig.setCache(sellerActiveKey, updatedSellerActive, 600);
        await redisConfig.setCache(buyerHistoryKey, buyerHistory, 3600);
        await redisConfig.setCache(sellerHistoryKey, sellerHistory, 3600);
      }
    }

    // Send socket notifications
    const notification = {
      tradeId: trade._id.toString(),
      status,
      timestamp: new Date().toISOString(),
      note,
    };

    // Notify both trade parties
    socketService.sendNotification(trade.buyer.toString(), {
      type: "trade",
      title: "Trade Status Updated",
      message: `Your trade ${tradeId.substr(-6)} has been updated to ${status}`,
      data: notification,
      link: `/trades/${tradeId}`,
    });

    socketService.sendNotification(trade.seller.toString(), {
      type: "trade",
      title: "Trade Status Updated",
      message: `Your trade ${tradeId.substr(-6)} has been updated to ${status}`,
      data: notification,
      link: `/trades/${tradeId}`,
    });

    // Publish to Redis channel for cross-server communication
    if (isRedisEnabled && pubClient) {
      await pubClient.publish(
        TRADE_CHANNEL,
        JSON.stringify({
          type: "status_update",
          tradeId: trade._id.toString(),
          status,
          timestamp: new Date().toISOString(),
          note,
          userId: userId?.toString(),
        })
      );
    }

    return trade;
  } catch (error) {
    console.error(`[EnhancedTradeService] Error updating trade status:`, error);
    throw error;
  }
};

module.exports = {
  getTradeById,
  getUserActiveTrades,
  getUserTradeHistory,
  getTradeStats,
  updateTradeStatus,
  isRedisEnabled,
};
