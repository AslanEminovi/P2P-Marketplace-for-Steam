/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redisModule = require("../config/redis");
const User = require("../models/User");
const userStatusManager = require("./UserStatusManager");
const mongoose = require("mongoose");

// Initialize Redis clients - Set these as global variables
let pubClient = null;
let subClient = null;

// Initialize Socket.io instance
let io = null;

// Constants
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds

// Redis channels
const REDIS_CHANNEL_NOTIFICATIONS = "notifications";
const REDIS_CHANNEL_USER_STATUS = "user_status";
const REDIS_CHANNEL_MARKET_UPDATE = "market_update";
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";
const REDIS_CHANNEL_OFFER_UPDATE = "offer_update"; // New channel for offer updates

// Check if Redis is enabled
let isRedisEnabled =
  !!process.env.REDIS_URL && process.env.USE_REDIS !== "false";

// Track connected users
const connectedUsers = new Map();

/**
 * Initialize the socket service with the given io instance
 * @param {SocketIO.Server} ioInstance - The Socket.io instance
 */
const init = async (ioInstance) => {
  try {
    io = ioInstance;

    if (!io) {
      console.error(
        "[socketService] Failed to initialize: io instance is null"
      );
      return;
    }

    console.log("[socketService] Initializing socket service with Socket.io");

    // Initialize our UserStatusManager and pass the io instance
    userStatusManager.init();
    userStatusManager.setIoInstance(io);

    // Set up socket connection handler
    io.on("connection", (socket) => {
      console.log(`[socketService] New socket connection: ${socket.id}`);

      // Handle authentication to track users
      socket.on("authenticate", (token) => {
        authenticateAndTrackUser(socket, token);
      });

      // Track disconnection
      socket.on("disconnect", () => {
        handleSocketDisconnect(socket);
      });

      // Handle direct trade panel open request
      socket.on("openTradePanel", (options) => {
        if (socket.userId) {
          // Broadcast to all sockets of this user
          const userSocketIds = [...connectedUsers.entries()]
            .filter(([_, id]) => id === socket.userId)
            .map(([socketId]) => socketId);

          userSocketIds.forEach((socketId) => {
            if (socketId !== socket.id) {
              // Don't send back to same socket
              const targetSocket = io.sockets.sockets.get(socketId);
              if (targetSocket) {
                targetSocket.emit("openTradePanel", options);
              }
            }
          });
        }
      });

      // Let the UserStatusManager handle the connection
      userStatusManager.handleConnection(socket);

      // Handle stats update requests
      socket.on("request_stats_update", async () => {
        console.log(
          `[socketService] Stats update requested by socket ${socket.id}`
        );
        try {
          const stats = await getLatestStats();
          socket.emit("stats_update", stats);
        } catch (error) {
          console.error("[socketService] Error sending stats update:", error);
        }
      });

      // Handle status requests
      socket.on("request_user_status", async (userId) => {
        if (!userId) return;
        try {
          const status = await userStatusManager.getUserStatus(userId);
          socket.emit("user_status_update", {
            userId,
            isOnline: status.isOnline,
            lastSeenFormatted: status.lastSeenFormatted,
          });
        } catch (error) {
          console.error(
            `[socketService] Error getting status for ${userId}:`,
            error
          );
          socket.emit("user_status_update", {
            userId,
            isOnline: false,
            lastSeenFormatted: "Recently",
          });
        }
      });

      // Handle user watching another user
      socket.on("watch_user_status", (userId) => {
        if (!userId) return;

        // Store that this socket is watching this userId
        if (!socket.watchingUsers) {
          socket.watchingUsers = new Set();
        }

        socket.watchingUsers.add(userId);
        console.log(
          `[socketService] Socket ${socket.id} is now watching user ${userId}`
        );

        // Immediately send current status
        getUserStatus(userId)
          .then((status) => {
            socket.emit("user_status_update", {
              userId,
              isOnline: status.isOnline,
              lastSeenFormatted: status.lastSeenFormatted,
            });
          })
          .catch(console.error);
      });

      // Handle ping response (used to check if socket is still alive)
      socket.on("pong", (data) => {
        // Update last active time for this user
        if (socket.userId) {
          console.log(
            `[socketService] Received pong from socket ${socket.id} for user ${socket.userId}`
          );
          userStatusManager.updateLastActive(socket.userId);
        } else {
          console.log(
            `[socketService] Received pong from anonymous socket ${socket.id}`
          );
        }
      });

      // Handle direct heartbeat from client
      socket.on("heartbeat", () => {
        if (socket.userId) {
          console.log(
            `[socketService] Received heartbeat from socket ${socket.id} for user ${socket.userId}`
          );
          userStatusManager.updateLastActive(socket.userId);
        } else {
          console.log(
            `[socketService] Received heartbeat from anonymous socket ${socket.id}`
          );
        }
      });

      // Handle user activity notification
      socket.on("user_active", () => {
        if (socket.userId) {
          console.log(
            `[socketService] User ${socket.userId} reported activity via socket ${socket.id}`
          );
          userStatusManager.updateLastActive(socket.userId);
        } else {
          console.log(
            `[socketService] Anonymous socket ${socket.id} reported activity`
          );
        }
      });

      // Handle beforeunload event from client
      socket.on("browser_closing", () => {
        console.log(
          `[socketService] Browser closing event from socket ${socket.id}`
        );
        // Immediately disconnect this socket
        try {
          socket.disconnect(true);
        } catch (error) {
          console.error(`[socketService] Error disconnecting socket:`, error);
        }
      });

      // Periodically ping the socket to check connection
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("ping", { timestamp: Date.now() });
        } else {
          clearInterval(pingInterval);
        }
      }, 25000); // Every 25 seconds

      // Clean up interval on disconnect
      socket.on("disconnect", () => {
        clearInterval(pingInterval);
        console.log(
          `[socketService] Socket ${socket.id} disconnected, cleared ping interval`
        );
      });
    });

    // Start periodic stats broadcasting
    startPeriodicStatsBroadcast();

    // Start periodic health checks
    startPeriodicHealthChecks();

    // Start periodic status broadcasts
    startPeriodicStatusBroadcasts();

    console.log("[socketService] Socket service initialized successfully");
  } catch (error) {
    console.error("[socketService] Error initializing socket service:", error);
  }
};

/**
 * Initialize Redis subscriptions for cross-server communication
 */
const initRedisSubscriptions = () => {
  if (!subClient) {
    console.error("Redis subscriber client not available for subscriptions");
    return;
  }

  console.log("[socketService] Setting up Redis subscriptions");

  // Subscribe to channels
  subClient.subscribe(REDIS_CHANNEL_NOTIFICATIONS);
  subClient.subscribe(REDIS_CHANNEL_USER_STATUS);
  subClient.subscribe(REDIS_CHANNEL_MARKET_UPDATE);
  subClient.subscribe(REDIS_CHANNEL_TRADE_UPDATE);

  // Handle messages
  subClient.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[socketService] Redis message on channel ${channel}:`, data);

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

  console.log(
    "[socketService] Redis subscriptions initialized for cross-server communication"
  );
};

/**
 * Handle Redis notification messages
 * @param {Object} data - The notification data
 */
const handleNotificationMessage = (data) => {
  if (!io || !data.userId) return;

  // Find sockets for this user
  const socketsForUser = Array.from(io.sockets.sockets.values()).filter(
    (socket) => socket.userId === data.userId
  );

  for (const socket of socketsForUser) {
    socket.emit("notification", data.notification);
  }
};

/**
 * Handle Redis user status messages
 * @param {Object} data - The user status data
 */
const handleUserStatusMessage = (data) => {
  if (!io || !data.userId) return;

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

  // Always broadcast market updates to all clients for reliability
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
  if (data.targetUserId) {
    const socketsForUser = Array.from(io.sockets.sockets.values()).filter(
      (socket) => socket.userId === data.targetUserId
    );

    for (const socket of socketsForUser) {
      socket.emit("trade_update", data);
    }
  }

  // If we should broadcast this update (e.g., for market items being reserved)
  if (data.broadcast) {
    io.emit("trade_update", data);
  }
};

/**
 * Get the latest marketplace statistics
 * @returns {Object} The latest stats
 */
const getLatestStats = async () => {
  try {
    console.log("[socketService] Fetching latest stats");

    // Get user counts from UserStatusManager
    const userCounts = userStatusManager.getUserCounts();

    // Fetch stats from database - use a direct query for the most up-to-date count
    const Item = require("../models/Item");
    const User = require("../models/User");
    const Trade = require("../models/Trade");

    // Use Promise.all for parallel execution
    const [activeListings, registeredUsers, completedTrades] =
      await Promise.all([
        // Use a lean query for better performance
        Item.countDocuments({ isListed: true }).lean().exec(),
        User.countDocuments({
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .lean()
          .exec(),
        Trade.countDocuments({ status: "completed" }).lean().exec(),
      ]);

    // Create stats object with all data
    const stats = {
      activeListings,
      activeUsers: userCounts.total,
      registeredUsers,
      completedTrades,
      onlineUsers: {
        total: userCounts.total,
        authenticated: userCounts.authenticated,
        anonymous: userCounts.anonymous,
      },
      timestamp: new Date(),
    };

    console.log("[socketService] Returning fresh stats:", {
      activeListings: stats.activeListings,
      activeUsers: stats.activeUsers,
      timestamp: stats.timestamp,
    });

    return stats;
  } catch (error) {
    console.error("[socketService] Error getting latest stats:", error);

    // Return default stats on error
    const userCounts = userStatusManager.getUserCounts();

    return {
      activeListings: 0,
      activeUsers: userCounts.total,
      registeredUsers: 0,
      completedTrades: 0,
      onlineUsers: {
        total: userCounts.total,
        authenticated: userCounts.authenticated,
        anonymous: userCounts.anonymous,
      },
      timestamp: new Date(),
    };
  }
};

/**
 * Broadcast marketplace statistics to all connected clients
 */
const broadcastStats = async () => {
  if (!io) {
    console.warn("[socketService] Cannot broadcast stats: io not initialized");
    return;
  }

  try {
    // Get the latest stats
    const stats = await getLatestStats();

    // Emit to all clients
    io.emit("stats_update", stats);

    console.log("[socketService] Broadcasted stats to all clients:", {
      activeListings: stats.activeListings,
      activeUsers: stats.activeUsers,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[socketService] Error broadcasting stats:", error);
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

  try {
    if (userId) {
      // Send to specific user
      const socketsForUser = Array.from(io.sockets.sockets.values()).filter(
        (socket) => socket.userId === userId
      );

      for (const socket of socketsForUser) {
        socket.emit("market_update", enrichedUpdate);
      }
    } else {
      // Always broadcast to everyone - selective broadcasting was causing missed updates
      if (isRedisEnabled && pubClient) {
        pubClient.publish(
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

      // Force immediate stats update for these important actions
      // This ensures stats are updated right away
      setTimeout(() => {
        broadcastStats().catch(console.error);
      }, 100);
    }
  } catch (err) {
    console.error("Error sending market update:", err);
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
    steamAuth: activity.steamAuth || false,
    timestamp: new Date().toISOString(),
  };

  io.emit("user_activity", activityData);
  broadcastStats(); // Update stats when user activity occurs
};

/**
 * Notify a user about an offer-related event
 * @param {string} userId - The user ID to notify
 * @param {Object} offerData - The offer data
 */
const notifyOfferUpdate = (userId, offerData) => {
  try {
    if (!userId || !offerData) {
      console.error(
        "[socketService] Missing userId or offerData for notifyOfferUpdate"
      );
      return;
    }

    console.log(
      `[socketService] Sending offer update to user ${userId}:`,
      offerData.type
    );

    // First, build the emit data
    const emitData = {
      ...offerData,
      timestamp: new Date().toISOString(),
    };

    // Find all sockets for this user
    const userSocketIds = [...connectedUsers.entries()]
      .filter(([_, id]) => id === userId)
      .map(([socketId]) => socketId);

    if (userSocketIds.length > 0) {
      // Emit directly to each socket
      userSocketIds.forEach((socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(
            `[socketService] Emitting offer_update to socket ${socketId} for user ${userId}`
          );
          socket.emit("offer_update", emitData);
        }
      });
    } else {
      console.log(
        `[socketService] User ${userId} not connected, can't send offer_update`
      );
    }

    // If Redis is enabled, also publish to the offer_update channel
    if (isRedisEnabled && pubClient) {
      pubClient.publish(
        REDIS_CHANNEL_OFFER_UPDATE,
        JSON.stringify({
          userId,
          data: emitData,
        })
      );
    }
  } catch (error) {
    console.error("[socketService] Error in notifyOfferUpdate:", error);
  }
};

/**
 * Send a notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {Object} notification - The notification data
 */
const sendNotification = (userId, notification) => {
  try {
    if (!userId || !notification) {
      console.error(
        "[socketService] Missing userId or notification for sendNotification"
      );
      return;
    }

    // First check if this is specifically an offer-related notification
    if (
      notification.type === "offer" ||
      notification.title?.toLowerCase().includes("offer") ||
      (notification.data &&
        notification.data.type &&
        (notification.data.type.includes("offer") ||
          notification.data.type === "counter_offer"))
    ) {
      console.log(
        `[socketService] Processing special offer notification for user ${userId}`
      );

      // If it's an offer notification, also send it through the offer_update channel
      notifyOfferUpdate(userId, {
        type: notification.data?.type || "offer_update",
        title: notification.title || "Offer Update",
        message: notification.message || "Your offer status has been updated",
        itemId: notification.relatedItemId || notification.data?.itemId,
        tradeId: notification.relatedTradeId || notification.data?.tradeId,
        offerId: notification.data?.offerId,
        timestamp: new Date().toISOString(),
      });
    }

    // Find all sockets for this user
    const userSocketIds = [...connectedUsers.entries()]
      .filter(([_, id]) => id === userId)
      .map(([socketId]) => socketId);

    if (userSocketIds.length > 0) {
      // Emit directly to each socket
      userSocketIds.forEach((socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(
            `[socketService] Emitting notification to socket ${socketId} for user ${userId}`
          );
          socket.emit("notification", notification);
        }
      });
    } else {
      console.log(
        `[socketService] User ${userId} not connected, can't send notification`
      );
    }

    // If Redis is enabled, also publish to the notifications channel
    if (isRedisEnabled && pubClient) {
      pubClient.publish(
        REDIS_CHANNEL_NOTIFICATIONS,
        JSON.stringify({
          userId,
          notification,
        })
      );
    }
  } catch (error) {
    console.error("[socketService] Error in sendNotification:", error);
  }
};

/**
 * Get user status using our UserStatusManager
 * @param {string} userId - The user ID
 * @returns {Object} The user's status
 */
const getUserStatus = async (userId) => {
  if (!userId) {
    return {
      isOnline: false,
      lastSeen: new Date(),
      lastSeenFormatted: "Unknown",
      source: "default",
    };
  }

  return await userStatusManager.getUserStatus(userId);
};

/**
 * Check if user is connected
 * @param {string} userId - The user ID
 * @returns {boolean} Whether the user is connected
 */
const isUserConnected = (userId) => {
  if (!userId) return false;
  return userStatusManager.isUserOnline(userId);
};

/**
 * Start periodic broadcasting of statistics
 */
const startPeriodicStatsBroadcast = () => {
  // Initial broadcast
  broadcastStats().catch((err) => {
    console.error("[socketService] Error in initial stats broadcast:", err);
  });

  // Set up interval for periodic broadcasting
  setInterval(() => {
    broadcastStats().catch((err) => {
      console.error("[socketService] Error in periodic stats broadcast:", err);
    });
  }, STATS_UPDATE_INTERVAL); // Every 10 seconds
};

/**
 * Run periodic health checks on UserStatusManager
 */
const startPeriodicHealthChecks = () => {
  // Run a health check every 5 minutes
  setInterval(() => {
    try {
      console.log("[socketService] Running UserStatusManager health check");

      // Check if UserStatusManager is properly initialized
      if (!userStatusManager.isInitialized) {
        console.warn(
          "[socketService] UserStatusManager not initialized, initializing now"
        );
        userStatusManager.init();
      }

      // Check if maps exist
      if (
        !userStatusManager.onlineUsers ||
        !userStatusManager.anonymousSockets
      ) {
        console.warn(
          "[socketService] UserStatusManager maps missing, reinitializing"
        );
        userStatusManager.init();
      }

      // Check socket connection counts
      const authenticatedCount = userStatusManager.onlineUsers
        ? userStatusManager.onlineUsers.size
        : 0;
      const anonymousCount = userStatusManager.anonymousSockets
        ? userStatusManager.anonymousSockets.size
        : 0;

      console.log("[socketService] Health check results:", {
        userStatusInitialized: userStatusManager.isInitialized,
        authenticatedUsers: authenticatedCount,
        anonymousSockets: anonymousCount,
        ioConnectedSockets: io ? io.sockets.sockets.size : 0,
      });

      // Force a sync with database if we have socket connections but no tracked users
      if (
        io &&
        io.sockets.sockets.size > 0 &&
        authenticatedCount === 0 &&
        anonymousCount === 0
      ) {
        console.warn(
          "[socketService] Potential issue detected: Socket connections exist but no users tracked"
        );
        userStatusManager.syncWithDatabase().catch(console.error);
      }
    } catch (error) {
      console.error(
        "[socketService] Error in UserStatusManager health check:",
        error
      );
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

/**
 * Setup presence API endpoint
 * @param {Express} app - The Express app
 */
const setupPresenceApi = (app) => {
  app.get("/api/presence/:id", async (req, res) => {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({
          error: "User ID is required",
          status: "offline",
          lastActive: Date.now(),
        });
      }

      console.log(`[socketService] Presence API request for user ${id}`);

      // Get user status from UserStatusManager
      const status = await userStatusManager.getUserStatus(id);

      console.log(`[socketService] Status for user ${id}:`, status);

      // Always return a valid response
      res.json({
        userId: id,
        status: status.isOnline ? "online" : "offline",
        lastActive: status.lastSeen ? status.lastSeen.getTime() : Date.now(),
        lastSeenFormatted: status.lastSeenFormatted || "Recently",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`[socketService] Error in presence API:`, error);
      res.status(500).json({
        error: "Server error",
        status: "unknown",
        lastActive: Date.now(),
      });
    }
  });
};

/**
 * Broadcast user status change to connected clients
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Whether user is online
 * @param {string} lastSeenFormatted - Formatted last seen time
 */
const broadcastUserStatusChange = async (
  userId,
  isOnline,
  lastSeenFormatted
) => {
  if (!io) return;

  console.log(
    `[socketService] Broadcasting status change for user ${userId}: ${
      isOnline ? "online" : "offline"
    }, ${lastSeenFormatted}`
  );

  // Create status update object
  const statusUpdate = {
    userId,
    isOnline,
    lastSeenFormatted,
    timestamp: new Date().toISOString(),
  };

  // Immediately broadcast to ALL connected clients for real-time updates
  io.emit("user_status_update", statusUpdate);

  // Also publish to Redis for cross-server communication
  if (pubClient) {
    try {
      pubClient.publish(
        REDIS_CHANNEL_USER_STATUS,
        JSON.stringify(statusUpdate)
      );
    } catch (error) {
      console.error("[socketService] Error publishing to Redis:", error);
    }
  }

  // If this is a status change to offline, also trigger a stats update
  if (!isOnline) {
    try {
      await broadcastStats();
    } catch (error) {
      console.error("[socketService] Error broadcasting stats:", error);
    }
  }
};

/**
 * Start periodic status broadcasts to watching clients
 */
const startPeriodicStatusBroadcasts = () => {
  // Every 15 seconds, broadcast all watched statuses (reduced from 30 seconds)
  setInterval(async () => {
    if (!io) return;

    try {
      // Find all distinct userIds being watched by any socket
      const watchedUsers = new Set();
      const allSockets = Array.from(io.sockets.sockets.values());

      for (const socket of allSockets) {
        if (socket.watchingUsers) {
          for (const userId of socket.watchingUsers) {
            watchedUsers.add(userId);
          }
        }
      }

      // For each watched user, get current status and broadcast to interested sockets
      for (const userId of watchedUsers) {
        try {
          const status = await getUserStatus(userId);
          broadcastUserStatusChange(
            userId,
            status.isOnline,
            status.lastSeenFormatted
          );
        } catch (error) {
          console.error(
            `[socketService] Error getting status for watched user ${userId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `[socketService] Error in periodic status broadcast:`,
        error
      );
    }
  }, 15000); // Every 15 seconds (reduced from 30 seconds)
};

// Enhanced authentication to track connected users
const authenticateAndTrackUser = (socket, token) => {
  try {
    if (!token) {
      console.log(
        `[socketService] No auth token provided for socket ${socket.id}`
      );
      return false;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      console.error(`[socketService] Invalid token for socket ${socket.id}`);
      return false;
    }

    const userId = decoded.id;

    // Store the socket and user association
    socket.userId = userId;
    connectedUsers.set(socket.id, userId);

    console.log(
      `[socketService] User ${userId} authenticated for socket ${socket.id}`
    );
    return true;
  } catch (error) {
    console.error(`[socketService] Auth error for socket ${socket.id}:`, error);
    return false;
  }
};

// Track socket disconnection
const handleSocketDisconnect = (socket) => {
  try {
    if (socket.id) {
      connectedUsers.delete(socket.id);
      console.log(
        `[socketService] Socket ${socket.id} disconnected and removed from tracking`
      );
    }
  } catch (error) {
    console.error(`[socketService] Error in handleSocketDisconnect:`, error);
  }
};

module.exports = {
  init,
  broadcastStats,
  getUserStatus,
  isUserConnected,
  setupPresenceApi,
  getLatestStats,
  sendMarketUpdate,
  emitMarketActivity,
  emitUserActivity,
  sendNotification,
  broadcastUserStatusChange,
  notifyOfferUpdate,
  notifyUser: sendNotification, // Alias for backward compatibility
};
