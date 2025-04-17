/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redisModule = require("../config/redis");
const User = require("../models/User");

// Initialize Redis clients - Set these as global variables
let pubClient = null;
let subClient = null;

// Initialize Socket.io instance
let io = null;

// User tracking maps and sets
let activeSockets = new Map(); // Map of userId -> socket.id
let anonymousSockets = new Set(); // Set to track anonymous connections
let connectedUsers = new Map(); // Map of userId -> { lastSeen: Date }
let connectedUserSockets = new Map(); // Map of userId -> Set of socket.ids
let userHeartbeatIntervals = new Map(); // Map of userId -> interval ID
let lastStatsUpdate = null;
let activeUsers = new Map(); // Map to track user activity timestamps (legacy)

// Constants
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds
const USER_ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const OFFLINE_GRACE_PERIOD_MS = 10000; // 10 seconds grace period before marking a user offline

// Set of users viewing the marketplace page
const usersOnMarketplace = new Set();

// Redis channels
const REDIS_CHANNEL_NOTIFICATIONS = "notifications";
const REDIS_CHANNEL_USER_STATUS = "user_status";
const REDIS_CHANNEL_MARKET_UPDATE = "market_update";
const REDIS_CHANNEL_TRADE_UPDATE = "trade_update";

// Check if Redis is enabled
let isRedisEnabled =
  !!process.env.REDIS_URL && process.env.USE_REDIS !== "false";

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
  try {
    io = ioInstance;

    if (!io) {
      console.error(
        "[socketService] Failed to initialize: io instance is null"
      );
      return;
    }

    console.log("[socketService] Initializing socket service with Socket.io");

    // Initialize our UserStatusManager
    const userStatusManager = require("./UserStatusManager");
    userStatusManager.init();

    // Set up socket connection handler
    io.on("connection", (socket) => {
      console.log(`[socketService] New socket connection: ${socket.id}`);

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
    });

    // Start periodic stats broadcasting
    startPeriodicStatsBroadcast();

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
  try {
    // Authenticated users: count unique userIds from connectedUserSockets
    // This is more accurate than using activeSockets since it tracks multiple connections per user
    const authenticatedCount = connectedUserSockets
      ? connectedUserSockets.size
      : 0;

    // Anonymous users: count unique socket IDs in the anonymousSockets set
    const anonymousCount = anonymousSockets ? anonymousSockets.size : 0;

    // Validate the count numbers
    const validatedAuthCount = Number.isInteger(authenticatedCount)
      ? authenticatedCount
      : 0;
    const validatedAnonCount = Number.isInteger(anonymousCount)
      ? anonymousCount
      : 0;
    const totalCount = validatedAuthCount + validatedAnonCount;

    console.log("[socketService] Current user counts:", {
      authenticated: validatedAuthCount,
      anonymous: validatedAnonCount,
      total: totalCount,
    });

    // Return the count object
    return {
      authenticated: validatedAuthCount,
      anonymous: validatedAnonCount,
      total: totalCount,
    };
  } catch (error) {
    // If there's any error in counting, return safe defaults
    console.error("[socketService] Error counting users:", error);
    return {
      authenticated: 0,
      anonymous: 0,
      total: 0,
    };
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
    const userStatusManager = require("./UserStatusManager");
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
    const userStatusManager = require("./UserStatusManager");
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

  const userStatusManager = require("./UserStatusManager");
  return await userStatusManager.getUserStatus(userId);
};

/**
 * Check if user is connected
 * @param {string} userId - The user ID
 * @returns {boolean} Whether the user is connected
 */
const isUserConnected = (userId) => {
  if (!userId) return false;

  const userStatusManager = require("./UserStatusManager");
  return userStatusManager.isUserOnline(userId);
};

/**
 * Mark a user as online in Redis, database, and local tracking
 * @param {string} userId - The user ID to mark online
 */
async function markUserOnline(userId) {
  if (!userId) {
    console.log("[socketService] Can't mark null userId as online");
    return;
  }

  console.log(`[socketService] Marking user ${userId} as online`);

  try {
    // Update the database first (most important)
    try {
      const User = require("../models/User");
      const updateResult = await User.findByIdAndUpdate(
        userId,
        {
          isOnline: true,
          lastActive: new Date(),
        },
        { new: true } // Return the updated document
      );

      if (updateResult) {
        console.log(`[socketService] User ${userId} marked online in database`);
      } else {
        console.warn(
          `[socketService] User ${userId} not found in database when marking online`
        );
      }
    } catch (dbError) {
      console.error(
        `[socketService] Error updating user online status in database:`,
        dbError
      );
    }

    // Update Redis if available
    if (isRedisEnabled && pubClient && pubClient.status === "ready") {
      try {
        const pipeline = pubClient.pipeline();
        // Set user as online with 120-second TTL (increased from 70s)
        pipeline.set(`user:${userId}:status`, "online", "EX", 120);
        pipeline.set(`user:${userId}:lastActive`, Date.now(), "EX", 120);
        await pipeline.exec();
        console.log(
          `[socketService] User ${userId} marked online in Redis with 120s TTL`
        );
      } catch (redisError) {
        console.error(
          `[socketService] Redis error marking user ${userId} online:`,
          redisError
        );
      }
    } else {
      console.log(
        `[socketService] Redis not available, skipping online status update in Redis`
      );
    }

    // Update local tracking regardless
    // Local tracking is our source of truth when Redis fails
    connectedUsers.set(userId, { lastSeen: new Date() });
    activeUsers.set(userId, { lastSeen: new Date() }); // Legacy support

    // Broadcast the status update to all clients
    if (io) {
      io.emit("userStatusUpdate", {
        userId,
        isOnline: true,
        lastSeen: new Date(),
      });
    }
  } catch (error) {
    console.error(
      `[socketService] Error marking user ${userId} online:`,
      error
    );
  }
}

/**
 * Mark a user as offline in Redis, database, and local tracking
 * @param {string} userId - The user ID to mark offline
 */
async function markUserOffline(userId) {
  if (!userId) {
    console.log("[socketService] Can't mark null userId as offline");
    return;
  }

  console.log(`[socketService] Marking user ${userId} as offline`);

  try {
    // Update database first (most important)
    try {
      const User = require("../models/User");
      const updateResult = await User.findByIdAndUpdate(
        userId,
        {
          isOnline: false,
          lastActive: new Date(),
        },
        { new: true } // Return the updated document
      );

      if (updateResult) {
        console.log(
          `[socketService] User ${userId} marked offline in database`
        );
      } else {
        console.warn(
          `[socketService] User ${userId} not found in database when marking offline`
        );
      }
    } catch (dbError) {
      console.error(
        `[socketService] Error updating user offline status in database:`,
        dbError
      );
    }

    // Update Redis if available
    if (isRedisEnabled && pubClient && pubClient.status === "ready") {
      try {
        const pipeline = pubClient.pipeline();
        // Set user as offline with 1-hour TTL for last seen info preservation
        pipeline.set(`user:${userId}:status`, "offline", "EX", 3600);
        pipeline.set(`user:${userId}:lastActive`, Date.now(), "EX", 3600);
        await pipeline.exec();
        console.log(
          `[socketService] User ${userId} marked offline in Redis with 1h history`
        );
      } catch (redisError) {
        console.error(
          `[socketService] Redis error marking user ${userId} offline:`,
          redisError
        );
      }
    } else {
      console.log(
        `[socketService] Redis not available, skipping offline status update in Redis`
      );
    }

    // Update local tracking
    connectedUsers.delete(userId);
    activeUsers.delete(userId);

    // Clean up any remaining socket connections for this user
    if (connectedUserSockets.has(userId)) {
      connectedUserSockets.delete(userId);
    }

    // Clean up any heartbeat intervals
    if (userHeartbeatIntervals.has(userId)) {
      clearInterval(userHeartbeatIntervals.get(userId));
      userHeartbeatIntervals.delete(userId);
    }

    // Broadcast the status update to all clients
    if (io) {
      io.emit("userStatusUpdate", {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    }
  } catch (error) {
    console.error(
      `[socketService] Error marking user ${userId} offline:`,
      error
    );
  }
}

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
  }, 10000); // Every 10 seconds
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

      // Get user status
      const status = await getUserStatus(id);

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

module.exports = {
  init,
  broadcastStats,
  getUserStatus,
  isUserConnected,
  setupPresenceApi,
  getLatestStats,
};
