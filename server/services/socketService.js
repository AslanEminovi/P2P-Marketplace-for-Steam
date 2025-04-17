/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redisModule = require("../config/redis");
const User = require("../models/User");
const userStatusManager = require("./UserStatusManager");

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

// Check if Redis is enabled
let isRedisEnabled =
  !!process.env.REDIS_URL && process.env.USE_REDIS !== "false";

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
      try {
        console.log(`[socketService] New socket connection: ${socket.id}`);

        // Process the socket connection through UserStatusManager
        userStatusManager.handleSocketConnection(socket);

        // Set up connection health monitoring
        let pingInterval = setInterval(() => {
          // Record ping start time
          const startTime = Date.now();

          // Emit ping event to client
          socket.emit("ping", { timestamp: startTime }, (response) => {
            // Calculate round-trip time
            const latency = Date.now() - startTime;

            // Store latency in socket metadata
            if (socket.metadata) {
              socket.metadata.latency = latency;
              socket.metadata.lastPingResponse = Date.now();
            }

            // Log latency for monitoring (only if unusually high)
            if (latency > 500) {
              console.log(
                `[Socket] High latency detected for ${socket.id}: ${latency}ms`
              );
            }
          });
        }, 30000); // Send ping every 30 seconds

        // Clean up interval on disconnect
        socket.on("disconnect", () => {
          clearInterval(pingInterval);
        });

        // Handle client pong response
        socket.on("pong", (data) => {
          if (socket.metadata) {
            socket.metadata.lastPongTime = Date.now();
          }
        });

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
      } catch (error) {
        console.error("[socketService] Error in connection handler:", error);
      }
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

    // Fetch stats from database
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
    const stats = await getLatestStats();
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
    }

    // Broadcast updated stats after market changes
    broadcastStats().catch(console.error);
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

  // Store the notification in the database even if socket delivery fails
  try {
    // Add to user's notifications array in database
    const User = require("../models/User");
    User.findByIdAndUpdate(
      userId,
      { $push: { notifications: enrichedNotification } },
      { new: true }
    ).catch((err) =>
      console.error("Failed to save notification to database:", err)
    );
  } catch (dbError) {
    console.error("Error saving notification to database:", dbError);
  }

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
  }

  // Send directly to any sockets for this user on this server
  if (io) {
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
        return true; // Successfully sent notification
      } else {
        console.log(
          `No active sockets found for user ${userId}, notification stored for later delivery`
        );
        return false;
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      return false;
    }
  }

  return false;
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
 * Broadcast online status changes to interested clients
 */
const broadcastUserStatusChange = async (
  userId,
  isOnline,
  lastSeenFormatted
) => {
  if (!io) return;

  try {
    // Broadcast to all sockets watching this user
    const allSockets = Array.from(io.sockets.sockets.values());
    for (const socket of allSockets) {
      if (socket.watchingUsers && socket.watchingUsers.has(userId)) {
        socket.emit("user_status_update", {
          userId,
          isOnline,
          lastSeenFormatted,
        });
      }
    }
  } catch (error) {
    console.error(
      `[socketService] Error broadcasting status change for ${userId}:`,
      error
    );
  }
};

/**
 * Start periodic status broadcasts to watching clients
 */
const startPeriodicStatusBroadcasts = () => {
  // Every 30 seconds, broadcast all watched statuses
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
  }, 30000); // Every 30 seconds
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
};
