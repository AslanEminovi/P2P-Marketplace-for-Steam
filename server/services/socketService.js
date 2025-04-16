/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const redisConfig = require("../config/redis");
const { pubClient } = redisConfig;

let io = null;
let activeSockets = new Map(); // Map of userId -> socket.id
let anonymousSockets = new Set(); // Set to track anonymous connections
let lastStatsUpdate = null;
let activeUsers = new Map(); // Map to track user activity timestamps
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds
const USER_ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Track connected users
const connectedUsers = new Map();

// Redis channels
const REDIS_CHANNEL_NOTIFICATIONS = "notifications";
const REDIS_CHANNEL_USER_STATUS = "user_status";
const REDIS_CHANNEL_MARKET_UPDATE = "market_update";
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";

// Check if Redis is enabled
const isRedisEnabled = process.env.USE_REDIS === "true";

/**
 * Initialize the socket service with the io instance
 * @param {Object} ioInstance - The Socket.io instance
 */
const init = (ioInstance) => {
  io = ioInstance;

  // Setup Redis subscriptions if Redis is enabled
  if (isRedisEnabled && redisConfig.subClient) {
    setupRedisSubscriptions();
  }

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

      // Store user status in Redis if enabled
      if (isRedisEnabled && pubClient) {
        try {
          // Store user status with 6-minute expiry (slightly longer than activity timeout)
          await redisConfig.setHashCache(
            `user:${userId}:status`,
            {
              socketId: socket.id,
              isOnline: true,
              lastSeen: new Date().toISOString(),
              serverId: process.env.SERVER_ID || "unknown",
            },
            360
          ); // 6 minutes

          // Publish user status update to all servers
          await pubClient.publish(
            REDIS_CHANNEL_USER_STATUS,
            JSON.stringify({
              userId,
              isOnline: true,
              lastSeen: new Date().toISOString(),
            })
          );
        } catch (error) {
          console.error("Redis error storing user status:", error);
        }
      }

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
        const now = Date.now();
        activeUsers.set(userId, now);

        // Update activity timestamp in Redis if enabled
        if (isRedisEnabled && pubClient) {
          redisConfig
            .setHashCache(
              `user:${userId}:status`,
              {
                lastActivity: now,
                isOnline: true,
                lastSeen: new Date().toISOString(),
              },
              360
            )
            .catch(console.error);
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (userId) {
        // Only remove socket if it's still the current one for this user
        if (activeSockets.get(userId) === socket.id) {
          activeSockets.delete(userId);
          // Don't immediately remove from activeUsers to allow for reconnection
          setTimeout(async () => {
            // Only remove if they haven't reconnected
            if (!activeSockets.has(userId)) {
              activeUsers.delete(userId);
              emitUserActivity({
                action: "logout",
                user: socket.username || "A user",
              });

              // Update user status
              connectedUsers.delete(userId);

              // Update Redis status if enabled
              if (isRedisEnabled && pubClient) {
                try {
                  // Update status to offline
                  await redisConfig.setHashCache(
                    `user:${userId}:status`,
                    {
                      isOnline: false,
                      lastSeen: new Date().toISOString(),
                      serverId: null,
                    },
                    360
                  );

                  // Publish offline status
                  await pubClient.publish(
                    REDIS_CHANNEL_USER_STATUS,
                    JSON.stringify({
                      userId,
                      isOnline: false,
                      lastSeen: new Date().toISOString(),
                    })
                  );
                } catch (error) {
                  console.error("Redis error updating offline status:", error);
                }
              }

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
 * Set up Redis subscriptions for cross-server communication
 */
const setupRedisSubscriptions = () => {
  if (!redisConfig.subClient) {
    console.error("Redis subscriber client not available for subscriptions");
    return;
  }

  const subClient = redisConfig.subClient;

  // Subscribe to channels
  subClient.subscribe(REDIS_CHANNEL_NOTIFICATIONS);
  subClient.subscribe(REDIS_CHANNEL_USER_STATUS);
  subClient.subscribe(REDIS_CHANNEL_MARKET_UPDATE);
  subClient.subscribe(REDIS_CHANNEL_TRADE_UPDATE);

  // Handle messages
  subClient.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNEL_NOTIFICATIONS:
          handleNotificationMessage(data);
          break;
        case REDIS_CHANNEL_USER_STATUS:
          handleUserStatusMessage(data);
          break;
        case REDIS_CHANNEL_MARKET_UPDATE:
          handleMarketUpdateMessage(data);
          break;
        case REDIS_CHANNEL_TRADE_UPDATE:
          handleTradeUpdateMessage(data);
          break;
        default:
          console.log(`Unknown Redis channel: ${channel}`);
      }
    } catch (error) {
      console.error(
        `Error processing Redis message on channel ${channel}:`,
        error
      );
    }
  });

  console.log("Redis subscriptions initialized for cross-server communication");
};

/**
 * Handle Redis notification messages
 * @param {Object} data - The notification data
 */
const handleNotificationMessage = (data) => {
  if (!io || !data.userId) return;

  // If this server has the socket connection for the user, send the notification
  if (activeSockets.has(data.userId)) {
    const socketId = activeSockets.get(data.userId);
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit("notification", data.notification);
    }
  }
};

/**
 * Handle Redis user status messages
 * @param {Object} data - The user status data
 */
const handleUserStatusMessage = (data) => {
  if (!io || !data.userId) return;

  // Update our local tracking map
  if (data.isOnline) {
    // We don't store the actual socket here since it might be on another server
    connectedUsers.set(data.userId, {
      lastSeen: new Date(data.lastSeen),
    });
  } else {
    connectedUsers.delete(data.userId);
  }

  // Broadcast the status update to connected clients on this server
  io.emit("userStatusUpdate", {
    userId: data.userId,
    isOnline: data.isOnline,
    lastSeen: new Date(data.lastSeen),
  });
};

/**
 * Handle Redis market update messages
 * @param {Object} data - The market update data
 */
const handleMarketUpdateMessage = (data) => {
  if (!io) return;

  // Broadcast market update to all clients on this server
  io.emit("market_update", data);

  // Update market activity feed if applicable
  if (
    [
      "new_listing",
      "item_unavailable",
      "item_sold",
      "listing_cancelled",
    ].includes(data.type)
  ) {
    emitMarketActivity(data);
  }
};

/**
 * Handle Redis trade update messages
 * @param {Object} data - The trade update data
 */
const handleTradeUpdateMessage = (data) => {
  if (!io) return;

  // If target user is connected to this server, send direct message
  if (data.targetUserId && activeSockets.has(data.targetUserId)) {
    const socketId = activeSockets.get(data.targetUserId);
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit("trade_update", data);
    }
  }

  // If we should broadcast this update (e.g., for market items being reserved)
  if (data.broadcast) {
    io.emit("trade_update", data);
  }
};

/**
 * Get the latest statistics - now with Redis caching
 */
const getLatestStats = async () => {
  try {
    // Try to get cached stats from Redis
    if (isRedisEnabled && pubClient) {
      const cachedStats = await redisConfig.getCache("site:stats");

      // If stats are recent (< 60 seconds old), use them
      if (
        cachedStats &&
        cachedStats.timestamp &&
        Date.now() - new Date(cachedStats.timestamp).getTime() < 60000
      ) {
        console.log("Using cached stats from Redis:", cachedStats);
        return cachedStats;
      }
    }

    // Fetch fresh stats from database
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

    // Get connected users from Redis if enabled
    let totalActiveUsers = 0;
    let authenticatedActiveUsers = 0;
    let anonymousActiveUsers = 0;

    if (isRedisEnabled && pubClient) {
      try {
        // Get the count of online users from Redis
        const keys = await pubClient.keys("cs2market:user:*:status");

        // Filter keys to only include those with isOnline: true
        authenticatedActiveUsers = 0;
        for (const key of keys) {
          const userStatus = await redisConfig.getHashCache(
            key.replace("cs2market:", "")
          );
          if (userStatus && userStatus.isOnline === true) {
            authenticatedActiveUsers++;
          }
        }

        // For anonymous users, we'll keep track locally
        anonymousActiveUsers = anonymousSockets.size;
        totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
      } catch (error) {
        console.error("Error getting user stats from Redis:", error);
        // Fall back to local tracking
        authenticatedActiveUsers = activeUsers.size;
        anonymousActiveUsers = anonymousSockets.size;
        totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
      }
    } else {
      // Use local tracking if Redis is not enabled
      authenticatedActiveUsers = activeUsers.size;
      anonymousActiveUsers = anonymousSockets.size;
      totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
    }

    // If totalActiveUsers is 0 but we had a previous valid count, use that instead
    if (
      totalActiveUsers === 0 &&
      lastStatsUpdate &&
      lastStatsUpdate.onlineUsers &&
      lastStatsUpdate.onlineUsers.total > 0
    ) {
      console.log(
        "Active users count is 0, using last known count:",
        lastStatsUpdate.onlineUsers.total
      );
      totalActiveUsers = lastStatsUpdate.onlineUsers.total;
      authenticatedActiveUsers =
        lastStatsUpdate.onlineUsers.authenticated || activeUsers.size;
      anonymousActiveUsers =
        lastStatsUpdate.onlineUsers.anonymous || anonymousSockets.size;
    }

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

    // Cache stats in Redis if enabled
    if (isRedisEnabled && pubClient) {
      await redisConfig.setCache("site:stats", stats, 30); // 30 seconds expiry
    }

    lastStatsUpdate = stats;
    return stats;
  } catch (error) {
    console.error("Error getting latest stats:", error);

    // If we have previous stats, use those instead of zeros
    if (lastStatsUpdate) {
      console.log("Using last known stats due to error");
      return {
        ...lastStatsUpdate,
        timestamp: new Date(), // Update timestamp
      };
    }

    // Return zeros as absolute fallback
    return {
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
    };
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
        // Publish to Redis if enabled, otherwise broadcast directly
        if (isRedisEnabled && pubClient) {
          await pubClient.publish(
            REDIS_CHANNEL_MARKET_UPDATE,
            JSON.stringify(enrichedUpdate)
          );
        } else {
          // Broadcast to all clients on this server
          io.emit("market_update", enrichedUpdate);
        }
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

  // Publish to Redis if enabled, otherwise emit directly
  if (isRedisEnabled && pubClient) {
    pubClient
      .publish(
        REDIS_CHANNEL_MARKET_UPDATE,
        JSON.stringify({ ...activityData, activityType: "market_activity" })
      )
      .catch(console.error);
  } else {
    io.emit("market_activity", activityData);
  }
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
const getConnectedClientsCount = async () => {
  if (!io) return 0;

  if (isRedisEnabled && pubClient) {
    try {
      // Get authenticated users from Redis
      const keys = await pubClient.keys("cs2market:user:*:status");
      let onlineCount = 0;

      for (const key of keys) {
        const userStatus = await redisConfig.getHashCache(
          key.replace("cs2market:", "")
        );
        if (userStatus && userStatus.isOnline === true) {
          onlineCount++;
        }
      }

      // Anonymous users are tracked locally only
      return onlineCount + anonymousSockets.size;
    } catch (error) {
      console.error("Error getting connected client count from Redis:", error);
      // Fall back to local tracking
      return activeSockets.size + anonymousSockets.size;
    }
  }

  return activeSockets.size + anonymousSockets.size;
};

/**
 * Send a notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} notification - The notification object
 */
const sendNotification = (userId, notification) => {
  if (!userId || !notification) {
    console.warn("Invalid userId or notification");
    return;
  }

  const enrichedNotification = {
    ...notification,
    timestamp: new Date().toISOString(),
  };

  // Use Redis for cross-server notifications if enabled
  if (isRedisEnabled && pubClient) {
    // Publish notification to Redis channel
    pubClient
      .publish(
        REDIS_CHANNEL_NOTIFICATIONS,
        JSON.stringify({
          userId,
          notification: enrichedNotification,
        })
      )
      .catch((err) =>
        console.error("Error publishing notification to Redis:", err)
      );

    // We still need to try sending it directly if the user is connected to this server
    if (activeSockets.has(userId)) {
      const socketId = activeSockets.get(userId);
      const socket = io.sockets.sockets.get(socketId);

      if (socket) {
        socket.emit("notification", enrichedNotification);
      }
    }

    return;
  }

  // If Redis is not enabled, use the original implementation with retries
  if (!io) {
    console.warn("Socket.io not initialized when trying to send notification");
    return;
  }

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

// Get user status - now with Redis
const getUserStatus = async (userId) => {
  if (!userId) return { isOnline: false, lastSeen: null };

  // If Redis is enabled, check there first
  if (isRedisEnabled && pubClient) {
    try {
      const userStatus = await redisConfig.getHashCache(
        `user:${userId}:status`
      );

      if (userStatus) {
        return {
          isOnline: userStatus.isOnline === true,
          lastSeen: userStatus.lastSeen ? new Date(userStatus.lastSeen) : null,
        };
      }
    } catch (error) {
      console.error(
        `Error getting user status from Redis for ${userId}:`,
        error
      );
      // Fall back to local memory
    }
  }

  // Fall back to local memory
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
  getLatestStats,
};
