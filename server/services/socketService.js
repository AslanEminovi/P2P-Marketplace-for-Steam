/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

let io = null;
let activeSockets = new Map(); // Map of userId -> socket.id

/**
 * Initialize the socket service with the io instance
 * @param {Object} ioInstance - The Socket.io instance
 */
const init = (ioInstance) => {
  io = ioInstance;

  // Setup global connection events if needed
  io.on("connection", (socket) => {
    // We'll get the userId from the socket handshake auth in server.js
    const userId = socket.userId;

    if (userId) {
      // Store socket association
      activeSockets.set(userId, socket.id);

      // Emit user activity
      emitUserActivity({
        action: "join",
        user: socket.username || "A user",
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        activeSockets.delete(userId);

        // Emit user activity
        emitUserActivity({
          action: "logout",
          user: socket.username || "A user",
        });

        // Update active users count
        broadcastStats();
      });
    }
  });
};

/**
 * Send a notification to a specific user
 * @param {string} userId - The user to notify
 * @param {Object} notification - The notification object
 */
const sendNotification = (userId, notification) => {
  if (!io) return;

  const socketId = activeSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit("notification", notification);
  }
};

/**
 * Broadcast marketplace statistics to all connected clients
 * @param {Object} stats - Optional stats object to broadcast
 */
const broadcastStats = async (stats) => {
  if (!io) return;

  try {
    // If stats not provided, fetch them
    if (!stats) {
      // Get counts from database or services
      const activeListings = await getActiveListingsCount();
      const activeTrades = await getActiveTradesCount();
      const activeUsers = getConnectedClientsCount();

      stats = { activeListings, activeTrades, activeUsers };
    }

    io.emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting stats:", error);
  }
};

/**
 * Send a trade update to a specific user
 * @param {string} userId - The user to notify
 * @param {Object} update - The trade update object
 */
const sendTradeUpdate = (userId, update) => {
  if (!io) return;

  const socketId = activeSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit("trade_update", update);
  }
};

/**
 * Send a market update to all connected clients or a specific user
 * @param {Object} update - The market update object
 * @param {string} [userId] - Optional user ID to send the update to
 */
const sendMarketUpdate = (update, userId = null) => {
  if (!io) return;

  // Enrich the update with additional information if needed
  const enrichedUpdate = {
    ...update,
    timestamp: new Date().toISOString(),
  };

  if (userId) {
    const socketId = activeSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit("market_update", enrichedUpdate);
    }
  } else {
    io.emit("market_update", enrichedUpdate);

    // Log market activity for all users to see
    // This is useful for the live activity feed
    emitMarketActivity(enrichedUpdate);
  }
};

/**
 * Emit market activity for the live activity feed
 * @param {Object} activity - The market activity object
 */
const emitMarketActivity = (activity) => {
  if (!io) return;

  io.emit("market_update", {
    type: activity.type || "listing",
    itemName: activity.itemName || activity.item?.marketHashName || "an item",
    price: activity.price || activity.item?.price,
    user: activity.userName || activity.user || "Anonymous",
    timestamp: activity.timestamp || new Date().toISOString(),
  });
};

/**
 * Emit user activity for the live activity feed
 * @param {Object} activity - The user activity object
 */
const emitUserActivity = (activity) => {
  if (!io) return;

  io.emit("user_activity", {
    action: activity.action,
    user: activity.user || "Anonymous",
    timestamp: activity.timestamp || new Date().toISOString(),
  });
};

/**
 * Send an inventory update to a specific user
 * @param {string} userId - The user to update
 * @param {Object} update - The inventory update object
 */
const sendInventoryUpdate = (userId, update) => {
  if (!io) return;

  const socketId = activeSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit("inventory_update", update);
  }
};

/**
 * Send a wallet update to a specific user
 * @param {string} userId - The user to update
 * @param {Object} update - The wallet update object
 */
const sendWalletUpdate = (userId, update) => {
  if (!io) return;

  const socketId = activeSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit("wallet_update", update);
  }
};

/**
 * Get the count of currently connected clients
 * @returns {number} The number of connected clients
 */
const getConnectedClientsCount = () => {
  if (!io) return 0;
  return activeSockets.size;
};

/**
 * Check if a user is online
 * @param {string} userId - The user to check
 * @returns {boolean} Whether the user is online
 */
const isUserOnline = (userId) => {
  return activeSockets.has(userId);
};

// Helper functions to fetch counts (you'll need to implement these based on your data models)
const Item = require("../models/Item");

const getActiveListingsCount = async () => {
  try {
    return await Item.countDocuments({ isListed: true });
  } catch (error) {
    console.error("Error getting active listings count:", error);
    return 0;
  }
};

const getActiveTradesCount = async () => {
  // Implement based on your database structure
  // Example: return await TradeModel.countDocuments({ status: 'active' });
  try {
    const Trade = require("../models/Trade");
    return await Trade.countDocuments({
      status: { $nin: ["completed", "cancelled"] },
    });
  } catch (error) {
    console.error("Error getting active trades count:", error);
    return 0;
  }
};

module.exports = {
  init,
  sendNotification,
  broadcastStats,
  sendTradeUpdate,
  sendMarketUpdate,
  sendInventoryUpdate,
  sendWalletUpdate,
  getConnectedClientsCount,
  isUserOnline,
  emitMarketActivity,
  emitUserActivity,
};
