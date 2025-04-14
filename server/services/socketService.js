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

// Track connected users
const connectedUsers = new Map();

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
      // Check if user already has an active socket
      const existingSocketId = activeSockets.get(userId);
      if (existingSocketId) {
        // If user has an existing socket, disconnect it first
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.disconnect(true);
        }
      }

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

      // Update user status
      connectedUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
      });

      // Broadcast user status update
      io.emit("userStatusUpdate", {
        userId,
        isOnline: true,
        lastSeen: new Date(),
      });

      // Log connection
      console.log(
        `User ${userId} connected. Total connected users: ${connectedUsers.size}`
      );
    } else {
      // Track anonymous connections with a timestamp
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
        // Only remove socket if it's still the current one for this user
        if (activeSockets.get(userId) === socket.id) {
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

              // Update user status
              connectedUsers.delete(userId);

              // Broadcast user status update
              io.emit("userStatusUpdate", {
                userId,
                isOnline: false,
                lastSeen: new Date(),
              });

              // Log disconnection
              console.log(
                `User ${userId} disconnected. Total connected users: ${connectedUsers.size}`
              );
            }
          }, 5000); // 5 second grace period for reconnection
        }
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
  if (!io) {
    console.warn("Socket.io not initialized when trying to send market update");
    return;
  }

  const enrichedUpdate = {
    ...update,
    timestamp: new Date().toISOString(),
  };

  // Add retry logic for important updates
  const maxRetries = 3;
  let retryCount = 0;

  const sendUpdate = async (retryDelay = 1000) => {
    try {
      if (userId) {
        // Send to specific user
        const userSocket = Array.from(io.sockets.sockets.values()).find(
          (socket) => socket.userId === userId
        );

        if (userSocket) {
          userSocket.emit("market_update", enrichedUpdate);
        } else {
          throw new Error("User socket not found");
        }
      } else {
        // Broadcast to all clients
        io.emit("market_update", enrichedUpdate);
      }

      // Also emit market activity for certain update types
      if (
        [
          "new_listing",
          "item_unavailable",
          "item_sold",
          "listing_cancelled",
        ].includes(update.type)
      ) {
        emitMarketActivity(enrichedUpdate);
      }

      // Broadcast updated stats after market changes
      broadcastStats().catch(console.error);
    } catch (err) {
      console.error("Error sending market update:", err);

      // Retry logic for important updates
      if (
        [
          "new_listing",
          "item_unavailable",
          "item_sold",
          "listing_cancelled",
        ].includes(update.type)
      ) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Retrying market update (attempt ${retryCount}/${maxRetries})`
          );
          setTimeout(() => sendUpdate(retryDelay * 2), retryDelay);
        } else {
          console.error("Failed to send market update after max retries");
        }
      }
    }
  };

  // Start sending the update
  sendUpdate();
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

/**
 * Send a notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} notification - The notification object
 */
const sendNotification = (userId, notification) => {
  if (!io) {
    console.warn("Socket.io not initialized when trying to send notification");
    return;
  }

  if (!userId || !notification) {
    console.warn("Invalid userId or notification");
    return;
  }

  const enrichedNotification = {
    ...notification,
    timestamp: new Date().toISOString(),
  };

  // Add retry logic for notifications
  const maxRetries = 3;
  let retryCount = 0;

  const sendNotification = async (retryDelay = 1000) => {
    try {
      // Find all sockets for this user
      const userSockets = Array.from(io.sockets.sockets.values()).filter(
        (socket) => socket.userId === userId
      );

      if (userSockets.length > 0) {
        // Send to all user's sockets
        userSockets.forEach((socket) => {
          socket.emit("notification", enrichedNotification);
        });
      } else {
        throw new Error("No active sockets found for user");
      }
    } catch (err) {
      console.error("Error sending notification:", err);

      // Retry logic
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(
          `Retrying notification (attempt ${retryCount}/${maxRetries})`
        );
        setTimeout(() => sendNotification(retryDelay * 2), retryDelay);
      } else {
        console.error("Failed to send notification after max retries");
      }
    }
  };

  // Start sending the notification
  sendNotification();
};

// Get user status
const getUserStatus = (userId) => {
  const userData = connectedUsers.get(userId);
  return {
    isOnline: !!userData,
    lastSeen: userData?.lastSeen || null,
  };
};

module.exports = {
  init,
  broadcastStats,
  sendMarketUpdate,
  getConnectedClientsCount,
  emitMarketActivity,
  emitUserActivity,
  sendNotification,
  getUserStatus,
};
