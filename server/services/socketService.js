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
  io = ioInstance;

  // Setup global connection events
  io.on("connection", async (socket) => {
    console.log("New socket connection:", socket.id);

    // We'll get the userId from the socket handshake auth in server.js
    const userId = socket.userId;

    if (userId) {
      // Store socket association for authenticated users
      activeSockets.set(userId, socket.id);
      socket.join(`user:${userId}`); // Join user-specific room

      // Update user activity timestamp
      activeUsers.set(userId, Date.now());

      // Emit user activity
      emitUserActivity({
        action: "join",
        user: socket.username || "A user",
      });
    } else {
      // Track anonymous connections
      anonymousSockets.add(socket.id);
    }

    // Send initial stats to the new connection
    const stats = await getLatestStats();
    socket.emit("stats_update", stats);

    // Handle stats request
    socket.on("request_stats_update", async () => {
      const stats = await getLatestStats();
      socket.emit("stats_update", stats);
    });

    // Handle user activity
    socket.on("user_active", () => {
      if (userId) {
        activeUsers.set(userId, Date.now());
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (userId) {
        activeSockets.delete(userId);
        // Don't immediately remove from activeUsers to allow for reconnection
        setTimeout(() => {
          // Only remove if they haven't reconnected
          if (!activeSockets.has(userId)) {
            activeUsers.delete(userId);
            emitUserActivity({
              action: "logout",
              user: socket.username || "A user",
            });
          }
        }, 5000); // 5 second grace period for reconnection
      } else {
        anonymousSockets.delete(socket.id);
      }

      // Broadcast updated stats after disconnection
      broadcastStats();
    });

    // Update stats for all clients
    broadcastStats();
  });

  // Set up periodic stats broadcasting
  setInterval(async () => {
    await broadcastStats();
  }, STATS_UPDATE_INTERVAL);

  // Set up periodic cleanup of inactive users
  setInterval(() => {
    const now = Date.now();
    for (const [userId, lastActive] of activeUsers.entries()) {
      if (now - lastActive > USER_ACTIVITY_TIMEOUT) {
        activeUsers.delete(userId);
        if (activeSockets.has(userId)) {
          const socketId = activeSockets.get(userId);
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
          activeSockets.delete(userId);
        }
      }
    }
    broadcastStats();
  }, USER_ACTIVITY_TIMEOUT);
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
  if (!io) return;

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
  if (!io) return;

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
  if (!io) return;

  const activityData = {
    type: activity.type || "listing",
    itemName: activity.itemName || activity.item?.marketHashName || "an item",
    price: activity.price || activity.item?.price,
    user: activity.userName || activity.user || "Anonymous",
    timestamp: activity.timestamp || new Date().toISOString(),
  };

  io.emit("market_activity", activityData);
};

/**
 * Emit user activity for the live activity feed
 * @param {Object} activity - The user activity object
 */
const emitUserActivity = (activity) => {
  if (!io) return;

  const activityData = {
    action: activity.action,
    user: activity.user || "Anonymous",
    timestamp: new Date().toISOString(),
  };

  io.emit("user_activity", activityData);
  broadcastStats(); // Update stats when user activity occurs
};

/**
 * Get the total count of connected clients (both authenticated and anonymous)
 * @returns {number} The number of connected clients
 */
const getConnectedClientsCount = () => {
  if (!io) return 0;
  return activeSockets.size + anonymousSockets.size;
};

module.exports = {
  init,
  broadcastStats,
  sendMarketUpdate,
  getConnectedClientsCount,
  emitMarketActivity,
  emitUserActivity,
};
