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
      const tradeKey = `${TRADE_KEY_PREFIX}${newTrade._id}`;

      // Store trade in Redis with 24 hour expiry
      await redisConfig.setHashCache(
        tradeKey,
        {
          _id: newTrade._id.toString(),
          sellerId: newTrade.sellerId.toString(),
          buyerId: newTrade.buyerId.toString(),
          itemId: newTrade.itemId.toString(),
          price: newTrade.price,
          status: newTrade.status,
          createdAt: newTrade.createdAt.toISOString(),
          updatedAt: newTrade.updatedAt.toISOString(),
        },
        86400
      ); // 24 hour expiry

      // Add to active trades set
      await pubClient.sadd(ACTIVE_TRADES_KEY, newTrade._id.toString());

      // Add to seller's trades
      await pubClient.sadd(
        `${USER_TRADES_KEY_PREFIX}${newTrade.sellerId}`,
        newTrade._id.toString()
      );

      // Add to buyer's trades
      await pubClient.sadd(
        `${USER_TRADES_KEY_PREFIX}${newTrade.buyerId}`,
        newTrade._id.toString()
      );

      // Publish trade creation event
      await pubClient.publish(
        REDIS_CHANNEL_TRADE_UPDATE,
        JSON.stringify({
          type: "trade_created",
          tradeId: newTrade._id.toString(),
          sellerId: newTrade.sellerId.toString(),
          buyerId: newTrade.buyerId.toString(),
          itemId: newTrade.itemId.toString(),
          status: newTrade.status,
          timestamp: new Date().toISOString(),
        })
      );

      // Send notification to seller
      socketService.sendNotification(newTrade.sellerId.toString(), {
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
 * Update a trade's status
 * @param {string} tradeId - The trade ID
 * @param {string} newStatus - The new status
 * @param {Object} metadata - Additional metadata for the update
 * @returns {Object} The updated trade
 */
const updateTradeStatus = async (tradeId, newStatus, metadata = {}) => {
  // First, update in database
  const Trade = require("../models/Trade");
  const updatedTrade = await Trade.findByIdAndUpdate(
    tradeId,
    {
      $set: {
        status: newStatus,
        ...metadata,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!updatedTrade) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  // If Redis is enabled, update trade data
  if (isRedisEnabled && pubClient) {
    try {
      const tradeKey = `${TRADE_KEY_PREFIX}${tradeId}`;

      // Update trade in Redis
      await redisConfig.setHashCache(
        tradeKey,
        {
          _id: updatedTrade._id.toString(),
          sellerId: updatedTrade.sellerId.toString(),
          buyerId: updatedTrade.buyerId.toString(),
          itemId: updatedTrade.itemId.toString(),
          price: updatedTrade.price,
          status: newStatus,
          createdAt: updatedTrade.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
          ...metadata,
        },
        86400
      ); // 24 hour expiry

      // Remove from active trades set if completed or cancelled
      if (
        [
          TRADE_STATUS.COMPLETED,
          TRADE_STATUS.CANCELLED,
          TRADE_STATUS.REJECTED,
          TRADE_STATUS.EXPIRED,
        ].includes(newStatus)
      ) {
        await pubClient.srem(ACTIVE_TRADES_KEY, tradeId);
      }

      // Publish trade update event
      await pubClient.publish(
        REDIS_CHANNEL_TRADE_UPDATE,
        JSON.stringify({
          type: "trade_updated",
          tradeId: updatedTrade._id.toString(),
          sellerId: updatedTrade.sellerId.toString(),
          buyerId: updatedTrade.buyerId.toString(),
          previousStatus: updatedTrade.status,
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
        socketService.sendNotification(updatedTrade.sellerId.toString(), {
          title: "Trade Update",
          message: statusMessages[newStatus].seller,
          type: "trade",
          link: `/trades/${updatedTrade._id}`,
        });
      }

      // Send to buyer
      if (statusMessages[newStatus]?.buyer) {
        socketService.sendNotification(updatedTrade.buyerId.toString(), {
          title: "Trade Update",
          message: statusMessages[newStatus].buyer,
          type: "trade",
          link: `/trades/${updatedTrade._id}`,
        });
      }
    } catch (error) {
      console.error("Redis error in updateTradeStatus:", error);
      // Continue anyway since we've updated MongoDB
    }
  }

  return updatedTrade;
};

/**
 * Get a user's active trades
 * @param {string} userId - The user ID
 * @returns {Array} The user's active trades
 */
const getUserActiveTrades = async (userId) => {
  // If Redis is enabled, get from cache first
  if (isRedisEnabled && pubClient) {
    try {
      // Get user's trade IDs from Redis
      const tradeIds = await pubClient.smembers(
        `${USER_TRADES_KEY_PREFIX}${userId}`
      );

      if (tradeIds && tradeIds.length > 0) {
        // Get trade details for each ID
        const trades = [];

        for (const tradeId of tradeIds) {
          const trade = await redisConfig.getHashCache(
            `${TRADE_KEY_PREFIX}${tradeId}`
          );

          // Only include active trades
          if (
            trade &&
            ![
              TRADE_STATUS.COMPLETED,
              TRADE_STATUS.CANCELLED,
              TRADE_STATUS.REJECTED,
              TRADE_STATUS.EXPIRED,
            ].includes(trade.status)
          ) {
            trades.push(trade);
          }
        }

        // If we got trades from Redis, return them
        if (trades.length > 0) {
          return trades;
        }
      }
    } catch (error) {
      console.error("Redis error in getUserActiveTrades:", error);
      // Fall back to database
    }
  }

  // Get from database
  const Trade = require("../models/Trade");
  const activeTrades = await Trade.find({
    $or: [{ sellerId: userId }, { buyerId: userId }],
    status: {
      $nin: [
        TRADE_STATUS.COMPLETED,
        TRADE_STATUS.CANCELLED,
        TRADE_STATUS.REJECTED,
        TRADE_STATUS.EXPIRED,
      ],
    },
  }).sort({ createdAt: -1 });

  return activeTrades;
};

/**
 * Get a specific trade by ID
 * @param {string} tradeId - The trade ID
 * @returns {Object} The trade
 */
const getTradeById = async (tradeId) => {
  // If Redis is enabled, get from cache first
  if (isRedisEnabled && pubClient) {
    try {
      const trade = await redisConfig.getHashCache(
        `${TRADE_KEY_PREFIX}${tradeId}`
      );

      if (trade) {
        return trade;
      }
    } catch (error) {
      console.error("Redis error in getTradeById:", error);
      // Fall back to database
    }
  }

  // Get from database
  const Trade = require("../models/Trade");
  const trade = await Trade.findById(tradeId);

  return trade;
};

module.exports = {
  createTrade,
  updateTradeStatus,
  getUserActiveTrades,
  getTradeById,
  TRADE_STATUS,
};
