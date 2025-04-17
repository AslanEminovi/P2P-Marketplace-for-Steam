/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redisModule = require("../config/redis");
const User = require("../models/User");

// Make these variables not constants so we can reassign them
let pubClient = null;
let subClient = null;

let io = null;
let activeSockets = new Map(); // Map of userId -> socket.id
let anonymousSockets = new Set(); // Set to track anonymous connections
let lastStatsUpdate = null;
let activeUsers = new Map(); // Map to track user activity timestamps
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds
const USER_ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const OFFLINE_GRACE_PERIOD_MS = 10000; // 10 seconds grace period before marking a user offline

// Track connected users
const connectedUsers = new Map();

// New tracking for multiple sockets per user (for multi-tab support)
let connectedUserSockets = new Map(); // Map of userId -> Set of socket.ids
let userHeartbeatIntervals = new Map(); // Map of userId -> interval ID

// Track which users are on the marketplace page
const usersOnMarketplace = new Set();

// Redis channels
const REDIS_CHANNEL_NOTIFICATIONS = "notifications";
const REDIS_CHANNEL_USER_STATUS = "user_status";
const REDIS_CHANNEL_MARKET_UPDATE = "market_update";
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";

// Check if Redis is enabled - use the flag from the redis module
let isRedisEnabled = redisModule.USE_REDIS;

/**
 * Format last seen time for user-friendly display
 * @param {Date} lastSeenDate - The last seen date
 * @returns {string} Formatted string (e.g., "2 minutes ago")
 */
const formatLastSeen = (lastSeenDate) => {
  if (!lastSeenDate) return null;

  const now = new Date();
  const lastSeen = new Date(lastSeenDate);
  const diffMs = now - lastSeen;

  // If less than a minute
  if (diffMs < 60 * 1000) {
    return "just now";
  }

  // If less than an hour
  if (diffMs < 60 * 60 * 1000) {
    const minutes = Math.floor(diffMs / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  // If less than a day
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  // If less than a week
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // More than a week
  return lastSeen.toLocaleDateString();
};

/**
 * Initialize the socket service with the given io instance
 * @param {SocketIO.Server} ioInstance - The Socket.io instance
 */
const init = async (ioInstance) => {
  io = ioInstance;

  if (!io) {
    console.error("Failed to initialize socket service: io instance is null");
    return;
  }
  console.log("Initializing socket service with Socket.io");

  // Get Redis flag from module
  isRedisEnabled = redisModule.USE_REDIS;
  console.log(
    `[socketService] Redis is ${
      isRedisEnabled ? "enabled" : "disabled"
    } (USE_REDIS=${redisModule.USE_REDIS})`
  );

  if (isRedisEnabled) {
    try {
      // Get clients from the redis module
      const redisClients = redisModule.getClients();

      // Verify clients are created
      if (!redisClients.pubClient || !redisClients.subClient) {
        throw new Error("Redis clients not properly initialized");
      }

      // Assign to our module-level variables
      pubClient = redisClients.pubClient;
      subClient = redisClients.subClient;

      console.log(
        `[socketService] Redis clients obtained, status: pub=${
          pubClient?.status || "null"
        }, sub=${subClient?.status || "null"}`
      );

      // Test Redis connectivity
      console.log("[socketService] Testing Redis connection...");
      const pingResult = await pubClient.ping();
      console.log(`[socketService] Redis ping result: ${pingResult}`);

      // Publish a test message to confirm Redis is working
      console.log("[socketService] Publishing Redis test message...");
      const testResult = await pubClient.publish(
        "test_channel",
        JSON.stringify({ message: "Redis test", time: Date.now() })
      );
      console.log(`[socketService] Redis test publish result: ${testResult}`);

      // Initialize Redis subscriptions
      console.log("[socketService] Initializing Redis subscriptions...");
      await initRedisSubscriptions();
    } catch (error) {
      console.error("[socketService] Redis initialization error:", error);
      console.warn("[socketService] Falling back to local tracking only");
      isRedisEnabled = false;
    }
  }

  // Set up socket connection handler
  io.on("connection", (socket) => {
    handleSocketConnection(socket);
  });

  // Start periodic clean-up of stale connections
  startConnectionCleanup();

  console.log("[socketService] Socket service initialized successfully");
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

  // Always broadcast market updates to all clients for reliability
  // Previous page-specific filtering was too restrictive
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
 * Function to get the count of unique authenticated and anonymous users
 * @returns {Object} Counts of authenticated and anonymous users
 */
const getUniqueUserCounts = () => {
  // Unique authenticated users is the size of the connected users map
  const authenticatedCount = connectedUserSockets
    ? connectedUserSockets.size
    : 0;

  // Anonymous users are still counted by socket since they don't have userId
  const anonymousCount = anonymousSockets.size;

  console.log("[socketService] Current user counts:", {
    authenticated: authenticatedCount,
    anonymous: anonymousCount,
    total: authenticatedCount + anonymousCount,
  });

  return {
    authenticated: authenticatedCount,
    anonymous: anonymousCount,
    total: authenticatedCount + anonymousCount,
  };
};

/**
 * Get the latest statistics - now with Redis caching
 */
const getLatestStats = async () => {
  try {
    console.log("[socketService] Fetching latest stats");

    // Double check Redis is enabled and we have a client
    const redisAvailable = !!process.env.REDIS_URL && !!pubClient;
    if (!isRedisEnabled) {
      console.log(
        "[socketService] Redis not enabled, updating flag if URL is available"
      );
      isRedisEnabled = !!process.env.REDIS_URL;
    }

    // Try to get cached stats from Redis
    if (redisAvailable && pubClient) {
      try {
        console.log("[socketService] Attempting to get stats from Redis cache");

        // Test Redis connection first
        const testResult = await pubClient.set(
          "socket:statsTest",
          `Stats request at ${new Date().toISOString()}`,
          "EX",
          60
        );
        console.log(`[socketService] Redis test result: ${testResult}`);

        const cachedStats = await redisModule.getCache("site:stats");

        // If stats are recent (< 10 seconds old), use them for better performance
        if (
          cachedStats &&
          cachedStats.timestamp &&
          Date.now() - new Date(cachedStats.timestamp).getTime() < 10000
        ) {
          console.log("[socketService] Using fresh cached stats from Redis:", {
            activeListings: cachedStats.activeListings,
            activeUsers: cachedStats.activeUsers,
            timestamp: cachedStats.timestamp,
          });
          return cachedStats;
        } else {
          console.log(
            "[socketService] Redis cache expired or not found, fetching fresh stats"
          );
        }
      } catch (redisError) {
        console.error(
          "[socketService] Error retrieving stats from Redis:",
          redisError.message
        );
        // Continue to fetch stats from database
      }
    } else {
      console.log(
        `[socketService] Redis not available: URL=${!!process.env
          .REDIS_URL}, client=${!!pubClient}, enabled=${isRedisEnabled}`
      );
    }

    // Fetch fresh stats from database
    const Item = require("../models/Item");
    const User = require("../models/User");
    const Trade = require("../models/Trade");

    console.log("[socketService] Running database queries for stats");
    const [activeListings, registeredUsers, completedTrades] =
      await Promise.all([
        Item.countDocuments({ isListed: true }),
        User.countDocuments({
          lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Trade.countDocuments({ status: "completed" }),
      ]);
    console.log("[socketService] Database query results:", {
      activeListings,
      registeredUsers,
      completedTrades,
    });

    // Get connected users from the new tracking method
    const userCounts = getUniqueUserCounts();
    const totalActiveUsers = userCounts.total;
    const authenticatedActiveUsers = userCounts.authenticated;
    const anonymousActiveUsers = userCounts.anonymous;

    // If totalActiveUsers is 0 but we had a previous valid count, use that instead
    if (
      totalActiveUsers === 0 &&
      lastStatsUpdate &&
      lastStatsUpdate.onlineUsers &&
      lastStatsUpdate.onlineUsers.total > 0
    ) {
      console.log(
        "[socketService] Active users count is 0, using last known count:",
        lastStatsUpdate.onlineUsers.total
      );
      totalActiveUsers = lastStatsUpdate.onlineUsers.total;
      authenticatedActiveUsers = lastStatsUpdate.onlineUsers.authenticated || 0;
      anonymousActiveUsers = lastStatsUpdate.onlineUsers.anonymous || 0;
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

    // Cache stats in Redis if enabled - with very short TTL for high freshness
    if (isRedisEnabled && pubClient) {
      try {
        console.log("[socketService] Caching stats in Redis with short TTL");
        await redisModule.setCache("site:stats", stats, 10); // 10 seconds expiry instead of 30
      } catch (cacheError) {
        console.error(
          "[socketService] Error caching stats in Redis:",
          cacheError.message
        );
      }
    }

    lastStatsUpdate = stats;
    console.log("[socketService] Returning fresh stats:", {
      activeListings: stats.activeListings,
      activeUsers: stats.activeUsers,
      timestamp: stats.timestamp,
    });
    return stats;
  } catch (error) {
    console.error(
      "[socketService] Error getting latest stats:",
      error.message,
      error.stack
    );

    // If we have previous stats, use those instead of zeros
    if (lastStatsUpdate) {
      console.log("[socketService] Using last known stats due to error");
      return {
        ...lastStatsUpdate,
        timestamp: new Date(), // Update timestamp
      };
    }

    // Return zeros as absolute fallback
    console.log("[socketService] No previous stats available, returning zeros");
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
    // Don't use cached stats, get fresh ones directly
    // This ensures data is always current when requested
    const stats = await getLatestStats();

    // Broadcast to all connected clients
    io.emit("stats_update", stats);

    console.log("[socketService] Broadcasted fresh stats to all clients:", {
      activeListings: stats.activeListings,
      activeUsers: stats.activeUsers,
      timestamp: new Date(),
    });

    return stats;
  } catch (error) {
    console.error("[socketService] Error broadcasting stats:", error);
    return null;
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
        // Always broadcast to everyone - selective broadcasting was causing missed updates
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
    steamAuth: activity.steamAuth || false,
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
        const userStatus = await redisModule.getHashCache(
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
      // Fall back to local tracking with unique user counting
      const counts = getUniqueUserCounts();
      return counts.total;
    }
  }

  // Use local tracking with unique user counting
  const counts = getUniqueUserCounts();
  return counts.total;
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

    // We still need to try sending it directly if the user is connected to this server
    if (activeSockets.has(userId)) {
      const socketId = activeSockets.get(userId);
      const socket = io.sockets.sockets.get(socketId);

      if (socket) {
        socket.emit("notification", enrichedNotification);
        return true; // Successfully sent notification
      }
    }

    // Notification was published to Redis, but user might not be connected
    console.log(
      `User ${userId} socket not found, notification stored for later delivery`
    );
    return false;
  }

  // If Redis is not enabled, use direct delivery with minimal retries
  if (!io) {
    console.warn("Socket.io not initialized when trying to send notification");
    return false;
  }

  // Simplified retry logic - only try once per socket
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
};

// Get user status - now with Redis
const getUserStatus = async (userId) => {
  if (!userId) {
    return {
      isOnline: false,
      lastSeen: new Date(),
      lastSeenFormatted: "Unknown",
      source: "default",
    };
  }

  console.log(`[socketService] Getting status for user ${userId}`);

  // First check if user has an active socket connection - most reliable
  const hasActiveSocket = activeSockets.has(userId);
  if (hasActiveSocket) {
    // Verify the socket is still valid
    const socketId = activeSockets.get(userId);
    const socket = io?.sockets?.sockets?.get(socketId);
    if (socket) {
      console.log(
        `[socketService] User ${userId} has active socket connection`
      );
      const lastSeen = activeUsers.get(userId)?.lastSeen || new Date();
      return {
        isOnline: true,
        lastSeen: lastSeen,
        lastSeenFormatted: formatLastSeen(lastSeen),
        source: "socket",
      };
    } else {
      // Socket ID exists in map but not in actual sockets - remove it
      console.log(
        `[socketService] Removing stale socket entry for user ${userId}`
      );
      activeSockets.delete(userId);
    }
  }

  // Then check local tracking in memory
  if (activeUsers.has(userId)) {
    const lastSeen = activeUsers.get(userId)?.lastSeen || new Date();
    console.log(`[socketService] User ${userId} found in local tracking`);
    return {
      isOnline: true,
      lastSeen: lastSeen,
      lastSeenFormatted: formatLastSeen(lastSeen),
      source: "memory",
    };
  }

  // Then check Redis if enabled
  if (isRedisEnabled && pubClient) {
    try {
      console.log(`[socketService] Checking Redis for user ${userId} status`);
      const [status, lastActive] = await pubClient.mget(
        `user:${userId}:status`,
        `user:${userId}:lastActive`
      );

      console.log(
        `[socketService] Redis status for ${userId}: status=${status}, lastActive=${lastActive}`
      );

      if (status) {
        const lastSeen = lastActive
          ? new Date(parseInt(lastActive))
          : new Date();

        return {
          isOnline: status === "online",
          lastSeen: lastSeen,
          lastSeenFormatted: formatLastSeen(lastSeen),
          source: "redis",
        };
      }
    } catch (error) {
      console.error(
        `[socketService] Error getting user status from Redis:`,
        error
      );
    }
  }

  // Check database as fallback
  try {
    const User = require("../models/User");
    const user = await User.findById(userId);

    console.log(
      `[socketService] Database user for ${userId}:`,
      user
        ? {
            lastActive: user.lastActive,
            isOnline: user.isOnline,
          }
        : "not found"
    );

    if (user) {
      // If user exists in database, use their database status
      const lastSeen = user.lastActive ? new Date(user.lastActive) : new Date();
      return {
        isOnline: user.isOnline === true, // Explicit check to ensure false when not true
        lastSeen: lastSeen,
        lastSeenFormatted: formatLastSeen(lastSeen),
        source: "database",
      };
    }
  } catch (error) {
    console.error(
      `[socketService] Error getting user status from database:`,
      error
    );
  }

  // Default to offline with a timestamp rather than null
  const now = new Date();
  return {
    isOnline: false,
    lastSeen: now,
    lastSeenFormatted: "Recently",
    source: "default",
  };
};

/**
 * Check if a user has an active socket connection
 * @param {string} userId - The user ID to check
 * @returns {boolean} - True if the user has an active socket connection
 */
const isUserConnected = (userId) => {
  if (!userId) return false;

  console.log(`[socketService] Checking if user ${userId} is connected`);
  console.log(
    `[socketService] activeSockets has ${userId}:`,
    activeSockets.has(userId)
  );
  console.log(
    `[socketService] connectedUsers has ${userId}:`,
    connectedUsers.has(userId)
  );

  // First check if user has a local socket connection
  if (activeSockets.has(userId)) {
    const socketId = activeSockets.get(userId);
    console.log(`[socketService] User ${userId} has socketId ${socketId}`);

    // Verify the socket is still valid
    const socket = io?.sockets?.sockets?.get(socketId);
    if (socket) {
      console.log(
        `[socketService] Socket for user ${userId} is valid and connected`
      );
      return true;
    } else {
      console.log(
        `[socketService] Socket for user ${userId} is no longer valid`
      );
    }
  }

  // Check if user is in the connectedUsers map
  if (connectedUsers.has(userId)) {
    console.log(`[socketService] User ${userId} is in connectedUsers map`);
    return true;
  }

  // If Redis is enabled, check there
  if (isRedisEnabled && redisModule && redisModule.getHashCache) {
    try {
      // This is async, but we need a sync check, so just log that we should check Redis
      console.log(
        `[socketService] Should check Redis for user ${userId} status`
      );
      // We'll assume not connected here, and the async getUserStatus function will be more accurate
    } catch (error) {
      console.error(
        `[socketService] Error checking Redis for user ${userId}:`,
        error
      );
    }
  }

  console.log(`[socketService] User ${userId} is not connected`);
  return false;
};

// Enhanced user status management with Redis
async function markUserOnline(userId) {
  if (!userId) return;

  console.log(`[socketService] Marking user ${userId} as online`);

  try {
    if (isRedisEnabled && pubClient) {
      const pipeline = pubClient.pipeline();
      // Set user as online with 120-second TTL (increased from 70s)
      pipeline.set(`user:${userId}:status`, "online", "EX", 120);
      pipeline.set(`user:${userId}:lastActive`, Date.now(), "EX", 120);
      await pipeline.exec();
      console.log(
        `[socketService] User ${userId} marked online in Redis with 120s TTL`
      );
    } else {
      // Fall back to local tracking
      console.log(
        `[socketService] Redis disabled, tracking user ${userId} locally only`
      );
      activeUsers.set(userId, { lastSeen: new Date() });
    }

    // Update our local tracking regardless
    connectedUsers.set(userId, { lastSeen: new Date() });

    // Update user status in database
    try {
      const User = require("../models/User");
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastActive: new Date(),
      });
      console.log(`[socketService] User ${userId} marked online in database`);
    } catch (dbError) {
      console.error(
        `[socketService] Error updating user online status in database:`,
        dbError
      );
    }

    // Broadcast the status update to all clients
    io.emit("userStatusUpdate", {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });
  } catch (error) {
    console.error(
      `[socketService] Error marking user ${userId} online:`,
      error
    );
  }
}

async function markUserOffline(userId) {
  if (!userId) return;

  console.log(`[socketService] Marking user ${userId} as offline`);

  try {
    if (isRedisEnabled && pubClient) {
      const pipeline = pubClient.pipeline();
      // Set user as offline with 1-hour TTL for last seen info preservation
      pipeline.set(`user:${userId}:status`, "offline", "EX", 3600);
      pipeline.set(`user:${userId}:lastActive`, Date.now(), "EX", 3600);
      await pipeline.exec();
      console.log(
        `[socketService] User ${userId} marked offline in Redis with 1h history`
      );
    }

    // Update local tracking
    connectedUsers.delete(userId);
    activeUsers.delete(userId);

    // Update user status in database
    try {
      const User = require("../models/User");
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastActive: new Date(),
      });
      console.log(`[socketService] User ${userId} marked offline in database`);
    } catch (dbError) {
      console.error(
        `[socketService] Error updating user offline status in database:`,
        dbError
      );
    }

    // Broadcast the status update to all clients
    io.emit("userStatusUpdate", {
      userId,
      isOnline: false,
      lastSeen: new Date(),
    });
  } catch (error) {
    console.error(
      `[socketService] Error marking user ${userId} offline:`,
      error
    );
  }
}

// Modify handleSocketConnection function to use the new methods
const handleSocketConnection = (socket) => {
  const userId = socket.userId;

  // Handle anonymous users
  if (!userId) {
    anonymousSockets.add(socket.id);

    // Set up disconnect listener for anonymous users
    socket.on("disconnect", () => {
      // Remove from anonymous tracking
      anonymousSockets.delete(socket.id);

      console.log(
        `[socketService] Anonymous socket disconnected: ${socket.id}`
      );
    });

    // Add stats request handler for anonymous users too
    socket.on("request_stats_update", async () => {
      console.log("[socketService] Stats update requested by anonymous user");
      try {
        const stats = await getLatestStats();
        socket.emit("stats_update", stats);
      } catch (error) {
        console.error("[socketService] Error sending stats update:", error);
      }
    });

    return;
  }

  // For authenticated users
  console.log(
    `[socketService] New socket connection: ${socket.id} for user: ${userId}`
  );

  // Store all sockets for each user in a map of arrays instead of just the latest one
  // This properly tracks multiple tabs/devices per user
  if (!connectedUserSockets) {
    connectedUserSockets = new Map(); // Initialize if needed
  }

  if (!connectedUserSockets.has(userId)) {
    connectedUserSockets.set(userId, new Set());
  }

  // Add this socket to the user's socket set
  connectedUserSockets.get(userId).add(socket.id);

  // Still maintain backward compatibility with activeSockets
  activeSockets.set(userId, socket.id);
  activeUsers.set(userId, { lastSeen: new Date() });

  // Mark user as online in Redis and database
  markUserOnline(userId);

  // Log the number of active connections for this user
  const connectionCount = connectedUserSockets.get(userId).size;
  console.log(
    `[socketService] User ${userId} now has ${connectionCount} active connections`
  );

  // Set up a periodic ping to refresh online status - only one per user, not per socket
  let pingInterval;
  if (connectionCount === 1) {
    pingInterval = setInterval(() => markUserOnline(userId), 30000);
    // Store the interval ID with the user
    if (!userHeartbeatIntervals) {
      userHeartbeatIntervals = new Map();
    }
    userHeartbeatIntervals.set(userId, pingInterval);
  } else {
    // Reuse existing interval
    pingInterval = userHeartbeatIntervals.get(userId);
  }

  // Add heartbeat handler - this is critical for maintaining online status
  socket.on("heartbeat", () => {
    console.log(`[socketService] Heartbeat received from user ${userId}`);
    // Update user's last seen timestamp and ensure they're marked as online
    markUserOnline(userId);
  });

  // Add user_active handler - another way the client signals activity
  socket.on("user_active", () => {
    console.log(`[socketService] User activity signal from user ${userId}`);
    // Update user's last seen timestamp and ensure they're marked as online
    markUserOnline(userId);
  });

  // Handler for stats update requests
  socket.on("request_stats_update", async () => {
    console.log(`[socketService] Stats update requested by user ${userId}`);
    try {
      const stats = await getLatestStats();
      // Send directly to this socket for immediate response
      socket.emit("stats_update", stats);
    } catch (error) {
      console.error("[socketService] Error sending stats update:", error);
    }
  });

  // Set up event listeners for this socket
  socket.on("disconnect", async () => {
    console.log(
      `[socketService] Socket ${socket.id} disconnected for user ${userId}`
    );

    // Remove this socket from the user's socket set
    if (connectedUserSockets.has(userId)) {
      connectedUserSockets.get(userId).delete(socket.id);

      // Check if this was the last socket for this user
      const remainingSockets = connectedUserSockets.get(userId).size;
      console.log(
        `[socketService] User ${userId} has ${remainingSockets} remaining connections`
      );

      if (remainingSockets === 0) {
        // This was their last connection, clean up
        connectedUserSockets.delete(userId);

        // Clear the ping interval if this was the last connection
        if (userHeartbeatIntervals && userHeartbeatIntervals.has(userId)) {
          clearInterval(userHeartbeatIntervals.get(userId));
          userHeartbeatIntervals.delete(userId);
        }

        // Check if there's a grace period configuration for brief disconnects
        if (OFFLINE_GRACE_PERIOD_MS > 0) {
          console.log(
            `[socketService] Starting offline grace period for user ${userId}`
          );

          // Wait for grace period before marking offline
          setTimeout(async () => {
            // Check if user reconnected during grace period
            if (
              !connectedUserSockets.has(userId) ||
              connectedUserSockets.get(userId).size === 0
            ) {
              await markUserOffline(userId);
            }
          }, OFFLINE_GRACE_PERIOD_MS);
        } else {
          // No grace period, mark offline immediately
          await markUserOffline(userId);
        }
      }
    }

    // Remove this specific socket from tracking if it's the current active one
    if (activeSockets.get(userId) === socket.id) {
      // If user has other sockets, update the activeSockets reference to another one
      if (
        connectedUserSockets.has(userId) &&
        connectedUserSockets.get(userId).size > 0
      ) {
        // Get the first available socket
        const anotherSocketId = Array.from(connectedUserSockets.get(userId))[0];
        activeSockets.set(userId, anotherSocketId);
      } else {
        activeSockets.delete(userId);
      }
    }
  });

  // ... existing user socket event handlers ...
};

// Add a new REST API endpoint for presence
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

      // Get user status
      const status = await getUserStatus(id);

      console.log(`[socketService] Status for user ${id}:`, status);

      // Always return a valid response with defaults if needed
      res.json({
        userId: id,
        status: status.isOnline ? "online" : "offline",
        lastActive: status.lastSeen ? status.lastSeen.getTime() : Date.now(),
        lastSeenFormatted:
          status.lastSeenFormatted || formatLastSeen(status.lastSeen),
        timestamp: new Date(),
        // Include debug info
        debug: {
          redisEnabled: isRedisEnabled,
          inLocalTracking: activeUsers.has(id),
          inSocketMap: activeSockets.has(id),
        },
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
 * Periodically clean up stale connections and ensure user status is accurate
 */
const startConnectionCleanup = () => {
  const CLEANUP_INTERVAL = 15000; // Run cleanup every 15 seconds (was 60 seconds)
  const FORCE_OFFLINE_AFTER = 5 * 60 * 1000; // 5 minutes of inactivity (was 20 minutes)

  console.log("[socketService] Starting connection cleanup interval");

  setInterval(async () => {
    console.log("[socketService] Running connection cleanup...");

    try {
      // 1. Clean up stale socket references
      for (const [userId, socketSet] of connectedUserSockets.entries()) {
        const validSockets = new Set();

        // Check each socket for validity
        for (const socketId of socketSet) {
          const socket = io?.sockets?.sockets?.get(socketId);
          if (socket && socket.connected) {
            validSockets.add(socketId);
          }
        }

        // Update with only valid sockets
        if (validSockets.size === 0) {
          // No valid sockets, remove user from tracking
          connectedUserSockets.delete(userId);
          // Mark user as offline in database
          await markUserOffline(userId);

          // Clear any heartbeat intervals
          if (userHeartbeatIntervals.has(userId)) {
            clearInterval(userHeartbeatIntervals.get(userId));
            userHeartbeatIntervals.delete(userId);
          }
        } else if (validSockets.size !== socketSet.size) {
          // Some sockets were invalid, update the set
          connectedUserSockets.set(userId, validSockets);
          console.log(
            `[socketService] Cleaned up stale sockets for user ${userId}, now has ${validSockets.size} active connections`
          );
        }
      }

      // 2. Check the legacy activeSockets map for stale entries
      for (const [userId, socketId] of activeSockets.entries()) {
        const socket = io?.sockets?.sockets?.get(socketId);
        if (!socket || !socket.connected) {
          console.log(
            `[socketService] Found stale socket in activeSockets for user ${userId}`
          );

          // Check if user has other valid sockets
          if (
            connectedUserSockets.has(userId) &&
            connectedUserSockets.get(userId).size > 0
          ) {
            // Update activeSockets with another valid socket
            const anotherSocketId = Array.from(
              connectedUserSockets.get(userId)
            )[0];
            activeSockets.set(userId, anotherSocketId);
          } else {
            // No valid sockets, remove from tracking
            activeSockets.delete(userId);
            await markUserOffline(userId);
          }
        }
      }

      // 3. Check database for users marked online but with no active socket
      const User = require("../models/User");
      const onlineUsers = await User.find({ isOnline: true });

      let updatedAnyUser = false;
      for (const user of onlineUsers) {
        const userId = user._id.toString();
        const lastActiveTime = user.lastActive
          ? new Date(user.lastActive).getTime()
          : 0;
        const inactiveTime = Date.now() - lastActiveTime;

        // If user has been inactive for too long, mark them offline
        if (inactiveTime > FORCE_OFFLINE_AFTER) {
          console.log(
            `[socketService] User ${userId} inactive for ${Math.round(
              inactiveTime / 60000
            )} minutes, marking offline`
          );
          await markUserOffline(userId);
          updatedAnyUser = true;
          continue;
        }

        // Check if user actually has valid sockets
        const hasConnections =
          connectedUserSockets.has(userId) &&
          connectedUserSockets.get(userId).size > 0;

        if (!hasConnections) {
          // Double-check if user has ANY socket connections by checking all sockets
          const hasAnySocket = Array.from(io.sockets.sockets.values()).some(
            (s) => s.userId === userId
          );

          if (!hasAnySocket) {
            console.log(
              `[socketService] User ${userId} marked online in DB but has no socket connections, fixing...`
            );
            await markUserOffline(userId);
            updatedAnyUser = true;
          }
        }
      }

      // If we updated any user's status, broadcast fresh stats to everyone
      if (updatedAnyUser) {
        await broadcastStats();
      }

      console.log(`[socketService] Connection cleanup complete`);
    } catch (error) {
      console.error(`[socketService] Error in connection cleanup:`, error);
    }
  }, CLEANUP_INTERVAL);
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
  formatLastSeen,
  isUserConnected,
  setupPresenceApi,
  getUniqueUserCounts,
};
