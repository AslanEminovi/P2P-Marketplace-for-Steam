/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redis = require("../config/redis");
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

// Track connected users
const connectedUsers = new Map();

// Track which users are on the marketplace page
const usersOnMarketplace = new Set();

// Redis channels
const REDIS_CHANNEL_NOTIFICATIONS = "notifications";
const REDIS_CHANNEL_USER_STATUS = "user_status";
const REDIS_CHANNEL_MARKET_UPDATE = "market_update";
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";

// Check if Redis is enabled - always use if REDIS_URL is available
let isRedisEnabled = !!process.env.REDIS_URL;

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
const init = (ioInstance) => {
  io = ioInstance;

  if (!io) {
    console.error("Failed to initialize socket service: io instance is null");
    return;
  }
  console.log("Initializing socket service with Socket.io");

  // Initialize Redis if URL is available (direct check)
  isRedisEnabled = !!process.env.REDIS_URL;

  if (isRedisEnabled) {
    try {
      console.log(
        `[socketService] Redis URL detected (${
          process.env.REDIS_URL.includes("@")
            ? "..." + process.env.REDIS_URL.split("@").pop()
            : "masked"
        }), initializing Redis`
      );

      const redisModule = require("../config/redis");
      const redisClients = redisModule.initRedis();

      // Verify clients are created
      if (!redisClients.pubClient || !redisClients.subClient) {
        throw new Error("Redis clients not properly initialized");
      }

      // Assign to our module-level variables
      pubClient = redisClients.pubClient;
      subClient = redisClients.subClient;

      // Publish test message to verify Redis is working
      pubClient
        .set("socket:test", "Connection test at " + new Date().toISOString())
        .then(() => console.log("[socketService] Redis test write successful"))
        .catch((err) =>
          console.error("[socketService] Redis test write failed:", err)
        );

      // Subscribe to Redis channels
      initRedisSubscriptions();
      console.log(
        "[socketService] Redis subscriptions initialized successfully"
      );
    } catch (error) {
      console.error(
        "[socketService] Failed to initialize Redis for socket service:",
        error
      );
      isRedisEnabled = false;
      pubClient = null;
      subClient = null;
      console.warn(
        "[socketService] Falling back to local socket tracking only"
      );
    }
  } else {
    console.log(
      "[socketService] No REDIS_URL detected, using local tracking only"
    );
  }

  // Set up socket connection handler
  io.on("connection", (socket) => {
    // Use our enhanced socket connection handler
    handleSocketConnection(socket);
  });

  console.log("Socket service initialized successfully");
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

        const cachedStats = await redis.getCache("site:stats");

        // If stats are recent (< 60 seconds old), use them
        if (
          cachedStats &&
          cachedStats.timestamp &&
          Date.now() - new Date(cachedStats.timestamp).getTime() < 60000
        ) {
          console.log("[socketService] Using cached stats from Redis:", {
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

    // Get connected users from Redis if enabled
    let totalActiveUsers = 0;
    let authenticatedActiveUsers = 0;
    let anonymousActiveUsers = 0;

    if (isRedisEnabled && pubClient) {
      try {
        console.log("[socketService] Getting online users from Redis");
        // Get the count of online users from Redis
        const keys = await pubClient.keys("cs2market:user:*:status");
        console.log(
          `[socketService] Found ${keys.length} user status keys in Redis`
        );

        // Filter keys to only include those with isOnline: true
        authenticatedActiveUsers = 0;
        for (const key of keys) {
          try {
            const userStatus = await redis.getHashCache(
              key.replace("cs2market:", "")
            );
            if (userStatus && userStatus.isOnline === true) {
              authenticatedActiveUsers++;
            }
          } catch (keyError) {
            console.error(
              `[socketService] Error checking status for key ${key}:`,
              keyError.message
            );
          }
        }

        // For anonymous users, we'll keep track locally
        anonymousActiveUsers = anonymousSockets.size;
        totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
        console.log("[socketService] User counts from Redis:", {
          authenticated: authenticatedActiveUsers,
          anonymous: anonymousActiveUsers,
          total: totalActiveUsers,
        });
      } catch (error) {
        console.error(
          "[socketService] Error getting user stats from Redis:",
          error.message
        );
        // Fall back to local tracking
        authenticatedActiveUsers = activeUsers.size;
        anonymousActiveUsers = anonymousSockets.size;
        totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
        console.log("[socketService] Falling back to local user counts:", {
          authenticated: authenticatedActiveUsers,
          anonymous: anonymousActiveUsers,
          total: totalActiveUsers,
        });
      }
    } else {
      // Use local tracking if Redis is not enabled
      authenticatedActiveUsers = activeUsers.size;
      anonymousActiveUsers = anonymousSockets.size;
      totalActiveUsers = authenticatedActiveUsers + anonymousActiveUsers;
      console.log("[socketService] Using local user counts (Redis disabled):", {
        authenticated: authenticatedActiveUsers,
        anonymous: anonymousActiveUsers,
        total: totalActiveUsers,
      });
    }

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
      try {
        console.log("[socketService] Caching stats in Redis");
        await redis.setCache("site:stats", stats, 30); // 30 seconds expiry
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
        const userStatus = await redis.getHashCache(
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
  if (!userId)
    return {
      isOnline: false,
      lastSeen: new Date(),
      lastSeenFormatted: "Unknown",
    };

  // First check local tracking for performance
  if (activeUsers.has(userId)) {
    const lastSeen = activeUsers.get(userId).lastSeen || new Date();
    return {
      isOnline: true,
      lastSeen: lastSeen,
      lastSeenFormatted: formatLastSeen(lastSeen),
    };
  }

  // Then check Redis if enabled
  if (isRedisEnabled && pubClient) {
    try {
      const [status, lastActive] = await pubClient.mget(
        `user:${userId}:status`,
        `user:${userId}:lastActive`
      );

      if (status) {
        const lastSeen = lastActive
          ? new Date(parseInt(lastActive))
          : new Date();
        return {
          isOnline: status === "online",
          lastSeen: lastSeen,
          lastSeenFormatted: formatLastSeen(lastSeen),
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
    if (user && user.lastActive) {
      const lastSeen = new Date(user.lastActive);
      return {
        isOnline: false,
        lastSeen: lastSeen,
        lastSeenFormatted: formatLastSeen(lastSeen),
      };
    }
  } catch (error) {
    console.error(
      `[socketService] Error getting user status from database:`,
      error
    );
  }

  // Default to offline with a timestamp rather than null
  return {
    isOnline: false,
    lastSeen: new Date(),
    lastSeenFormatted: "Recently",
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
  if (isRedisEnabled && redis && redis.getHashCache) {
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
      // Set user as online with 70-second TTL
      pipeline.set(`user:${userId}:status`, "online", "EX", 70);
      pipeline.set(`user:${userId}:lastActive`, Date.now(), "EX", 70);
      await pipeline.exec();
      console.log(
        `[socketService] User ${userId} marked online in Redis with 70s TTL`
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

    return;
  }

  // For authenticated users
  console.log(
    `[socketService] New socket connection: ${socket.id} for user: ${userId}`
  );

  // Track user's socket
  activeSockets.set(userId, socket.id);
  activeUsers.set(userId, { lastSeen: new Date() });

  // Mark user as online in Redis
  markUserOnline(userId);

  // Set up a periodic ping to refresh online status
  const pingInterval = setInterval(() => markUserOnline(userId), 30000);

  // Set up event listeners for this socket
  socket.on("disconnect", async () => {
    clearInterval(pingInterval);

    // Only mark as offline if this was their last socket
    let hasOtherSockets = false;
    for (const [id, socketId] of activeSockets.entries()) {
      if (
        id === userId &&
        socketId !== socket.id &&
        io.sockets.sockets.has(socketId)
      ) {
        hasOtherSockets = true;
        break;
      }
    }

    if (!hasOtherSockets) {
      // Check if there's a grace period configuration for brief disconnects
      if (OFFLINE_GRACE_PERIOD_MS > 0) {
        console.log(
          `[socketService] Starting offline grace period for user ${userId}`
        );

        // Wait for grace period before marking offline
        setTimeout(async () => {
          // Check if user reconnected during grace period
          if (!activeSockets.has(userId)) {
            await markUserOffline(userId);
          }
        }, OFFLINE_GRACE_PERIOD_MS);
      } else {
        // No grace period, mark offline immediately
        await markUserOffline(userId);
      }
    }

    // Remove this specific socket from tracking
    if (activeSockets.get(userId) === socket.id) {
      activeSockets.delete(userId);
    }

    console.log(`[socketService] User ${userId} socket disconnected`);
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
  setupPresenceApi, // Export the new API setup function
};
