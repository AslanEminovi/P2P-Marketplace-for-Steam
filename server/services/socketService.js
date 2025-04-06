/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

let io = null;
let activeSockets = new Map(); // Map of userId -> socket.id
let anonymousSockets = new Set(); // Set to track anonymous connections
let lastStatsUpdate = null;
let activeUsers = new Map(); // Map to track user activity timestamps
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds
const USER_ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize the socket service with the io instance
 * @param {Object} ioInstance - The Socket.io instance
 */
const init = (ioInstance) => {
  if (!ioInstance) {
    console.error(
      "Socket service initialization failed: io instance is required"
    );
    return;
  }

  io = ioInstance;
  console.log("Socket service initialized with io instance");

  // Setup global connection events handled in server.js
};

/**
 * Get the latest statistics
 */
const getLatestStats = async () => {
  try {
    const Item = require("../models/Item");
    const User = require("../models/User");
    const Trade = require("../models/Trade");

    const [activeListings, registeredUsers, completedTrades] =
      await Promise.all([
        Item.countDocuments({ isListed: true }),
        User.countDocuments({
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Trade.countDocuments({ status: "completed" }),
      ]);

    // Calculate real active users (both authenticated and anonymous)
    const authenticatedActiveUsers = activeUsers.size;
    const anonymousActiveUsers = anonymousSockets.size;
    const totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;

    const stats = {
      activeListings,
      activeUsers: totalActiveUsers,
      registeredUsers,
      completedTrades,
      onlineUsers: {
        total: totalActiveUsers,
        authenticated: authenticatedActiveUsers,
        anonymous: anonymousActiveUsers,
      },
      timestamp: new Date(),
    };

    lastStatsUpdate = stats;
    return stats;
  } catch (error) {
    console.error("Error getting latest stats:", error);
    return (
      lastStatsUpdate || {
        activeListings: 0,
        activeUsers: 0,
        registeredUsers: 0,
        completedTrades: 0,
        onlineUsers: {
          total: 0,
          authenticated: 0,
          anonymous: 0,
        },
        timestamp: new Date(),
      }
    );
  }
};

/**
 * Broadcast marketplace statistics to all connected clients
 */
const broadcastStats = async () => {
  if (!io) {
    console.error("Cannot broadcast stats: Socket.io not initialized");
    return;
  }

  try {
    const stats = await getLatestStats();
    io.emit("stats_update", stats);
  } catch (error) {
    console.error("Error broadcasting stats:", error);
  }
};

/**
 * Send a market update to all connected clients or a specific user
 * @param {Object} update - The market update object
 * @param {string} [userId] - Optional user ID to send the update to
 */
const sendMarketUpdate = (update, userId = null) => {
  if (!io) {
    console.error("Cannot send market update: Socket.io not initialized");
    return;
  }

  const enrichedUpdate = {
    ...update,
    timestamp: new Date().toISOString(),
  };

  if (userId) {
    io.to(`user:${userId}`).emit("market_update", enrichedUpdate);
  } else {
    io.emit("market_update", enrichedUpdate);
    emitMarketActivity(enrichedUpdate);
  }
};

/**
 * Emit market activity for the live activity feed
 * @param {Object} activity - The market activity object
 */
const emitMarketActivity = (activity) => {
  if (!io) {
    console.error("Cannot emit market activity: Socket.io not initialized");
    return;
  }

  console.log("Emitting market activity:", activity);

  // Format the activity data for consistency
  const activityData = {
    type: activity.type || "listing",
    itemName: activity.itemName || activity.item?.marketHashName || "an item",
    itemImage:
      activity.imageUrl || activity.item?.imageUrl || "/default-item.png",
    price: activity.price || activity.item?.price || 0,
    user: activity.userName || activity.user || "Anonymous",
    userAvatar: activity.userAvatar || "/default-avatar.png",
    timestamp: activity.timestamp || new Date().toISOString(),
  };

  // Send to all clients
  io.emit("market_activity", activityData);

  // Debug log the activity that was sent
  console.log("Emitted market_activity event:", activityData);
};

/**
 * Emit user activity for the live activity feed
 * @param {Object} activity - The user activity object
 */
const emitUserActivity = (activity) => {
  if (!io) {
    console.error("Cannot emit user activity: Socket.io not initialized");
    return;
  }

  const activityData = {
    action: activity.action,
    user: activity.user || "Anonymous",
    timestamp: new Date().toISOString(),
  };

  io.emit("user_activity", activityData);
};

/**
 * Get count of connected clients
 */
const getConnectedClientsCount = () => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

/**
 * Send notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} notification - The notification object
 */
const sendNotification = (userId, notification) => {
  if (!io || !userId) return;

  const socketId = activeSockets.get(userId);
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("notification", notification);
    }
  }
};

module.exports = {
  init,
  broadcastStats,
  sendMarketUpdate,
  emitMarketActivity,
  emitUserActivity,
  getConnectedClientsCount,
  sendNotification,
};
