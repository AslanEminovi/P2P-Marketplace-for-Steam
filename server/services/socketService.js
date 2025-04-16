/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

const jwt = require("jsonwebtoken");
const redis = require("../config/redis");
const User = require("../models/User");
const { pubClient } = redis;

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

// Check if Redis is enabled
const isRedisEnabled = process.env.USE_REDIS === "true";

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
 * Initialize the socket service with the io instance
 * @param {Object} ioInstance - The Socket.io instance
 */
const init = (ioInstance) => {
  io = ioInstance;

  // Setup Redis subscriptions if Redis is enabled
  if (isRedisEnabled && redis.subClient) {
    setupRedisSubscriptions();
  }

  // Setup socket middleware for authentication - BEFORE the connection event
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1] ||
        socket.handshake.query?.auth_token ||
        socket.handshake.cookies?.auth_token;

      if (!token) {
        // Allow anonymous connections but mark them as such
        socket.userId = null;
        socket.username = null;
        socket.isAuthenticated = false;
        console.log("Anonymous socket connection accepted");
        return next();
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        console.error(
          "User not found for token:",
          token.substring(0, 10) + "..."
        );
        return next(new Error("User not found"));
      }

      // Attach user data to socket
      socket.userId = user._id.toString();
      socket.username =
        user.username || user.displayName || user.steamName || "User";
      socket.steamId = user.steamId; // Add Steam ID to socket for Steam-authenticated users
      socket.isAuthenticated = true;

      console.log(
        `User ${socket.userId} (${socket.username}) authenticated with socket ${
          socket.id
        }${user.steamId ? " via Steam" : ""}`
      );
      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      // If token verification fails, allow as anonymous
      socket.userId = null;
      socket.username = null;
      socket.isAuthenticated = false;
      next();
    }
  });

  // Setup global connection events
  io.on("connection", async (socket) => {
    console.log(
      "New socket connection:",
      socket.id,
      socket.isAuthenticated
        ? socket.steamId
          ? "Steam-authenticated"
          : "authenticated"
        : "anonymous"
    );

    // We'll get the userId from the socket middleware
    const userId = socket.userId;

    if (userId) {
      // Check if user already has an active socket
      const existingSocketId = activeSockets.get(userId);
      if (existingSocketId) {
        // If user has an existing socket, disconnect it first
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          console.log(
            `Disconnecting existing socket ${existingSocketId} for user ${userId}`
          );
          existingSocket.disconnect(true);
        }
      }

      // Store socket association for authenticated users
      activeSockets.set(userId, socket.id);
      socket.join(`user:${userId}`); // Join user-specific room

      // Update user activity timestamp
      activeUsers.set(userId, Date.now());

      // Update user status
      connectedUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
        isOnline: true,
        steamId: socket.steamId, // Track if this is a Steam user
      });

      // Broadcast user status update
      io.emit("userStatusUpdate", {
        userId,
        isOnline: true,
        lastSeen: new Date(),
      });

      // Store user status in Redis if enabled
      if (isRedisEnabled && pubClient) {
        try {
          // Store user status with 6-minute expiry (slightly longer than activity timeout)
          await redis.setHashCache(
            `user:${userId}:status`,
            {
              socketId: socket.id,
              isOnline: true,
              lastSeen: new Date().toISOString(),
              serverId: process.env.SERVER_ID || "unknown",
              steamId: socket.steamId || null, // Include Steam ID in Redis cache
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
              steamId: socket.steamId || null, // Include Steam ID in published message
            })
          );
        } catch (error) {
          console.error("Redis error storing user status:", error);
        }
      }

      // Update user's last active status in the database
      try {
        await User.findByIdAndUpdate(userId, {
          lastActive: new Date(),
          isOnline: true,
        });
        console.log(`Updated user ${userId} status in database to online`);
      } catch (dbErr) {
        console.error(
          `Failed to update user status in database:`,
          dbErr.message
        );
      }

      // Emit user activity
      emitUserActivity({
        action: "join",
        user: socket.username || "A user",
        steamAuth: !!socket.steamId,
      });

      // Log connection
      console.log(
        `User ${userId} connected${
          socket.steamId ? " via Steam" : ""
        }. Total connected users: ${connectedUsers.size}`
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

    // Handle user activity for heartbeat
    socket.on("user_active", () => {
      if (userId) {
        // Update user activity timestamp
        activeUsers.set(userId, Date.now());
      }
    });

    // Handle user status subscription requests
    socket.on("subscribeToUserStatus", async (data) => {
      try {
        if (!data || !data.userId) {
          console.log("Invalid subscribeToUserStatus data", data);
          return;
        }

        console.log(
          `User ${
            userId || "anonymous"
          } subscribed to status updates for user ${data.userId}`
        );

        // Get current status for the requested user
        const status = await getUserStatus(data.userId);
        console.log(`Status data for ${data.userId}:`, status);

        // Check active socket connection directly
        const isSocketActive = isUserConnected(data.userId);
        console.log(
          `Socket connection for ${data.userId}: ${
            isSocketActive ? "ACTIVE" : "INACTIVE"
          }`
        );

        // If socket is active but status is offline, override
        if (isSocketActive && !status.isOnline) {
          console.log(
            `User ${data.userId} has active socket but status is offline - overriding`
          );
          status.isOnline = true;
          status.lastSeen = new Date();
        }

        // Also check database for recent activity as another fallback
        try {
          const User = require("../models/User");
          const user = await User.findById(data.userId);

          if (user && user.lastActive) {
            const lastActiveTime = new Date(user.lastActive).getTime();
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000;

            console.log(
              `User ${data.userId} last active time:`,
              user.lastActive
            );
            console.log(
              `Is within last 5 minutes: ${lastActiveTime > fiveMinutesAgo}`
            );

            // If user was active in the last 5 minutes but status shows offline, override
            if (lastActiveTime > fiveMinutesAgo && !status.isOnline) {
              console.log(
                `User ${data.userId} was active in last 5 minutes but status is offline - overriding`
              );
              status.isOnline = true;
              status.lastSeen = user.lastActive;
            }
          }
        } catch (dbErr) {
          console.error(
            `Error checking database for user ${data.userId}:`,
            dbErr
          );
        }

        // Format last seen string
        const lastSeenFormatted = formatLastSeen(status.lastSeen);
        console.log(
          `Formatted last seen for ${data.userId}:`,
          lastSeenFormatted
        );

        // Immediately send current status to the requester
        socket.emit("userStatusUpdate", {
          userId: data.userId,
          isOnline: status.isOnline,
          lastSeen: status.lastSeen,
          lastSeenFormatted,
        });

        // Also broadcast to all clients to ensure consistency
        io.emit("userStatusUpdate", {
          userId: data.userId,
          isOnline: status.isOnline,
          lastSeen: status.lastSeen,
          lastSeenFormatted,
        });

        console.log(`Status update for ${data.userId} sent to client`);
      } catch (err) {
        console.error("Error handling subscribeToUserStatus:", err);
      }
    });

    // Handle page view tracking
    socket.on("page_view", (data) => {
      if (userId) {
        if (data.page === "marketplace") {
          console.log(`User ${userId} entered marketplace page`);
          usersOnMarketplace.add(userId);
        } else {
          console.log(`User ${userId} left marketplace page`);
          usersOnMarketplace.delete(userId);
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (userId) {
        // Remove from marketplace tracking
        usersOnMarketplace.delete(userId);

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
                  await redis.setHashCache(
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
  if (!redis.subClient) {
    console.error("Redis subscriber client not available for subscriptions");
    return;
  }

  const subClient = redis.subClient;

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

    // Try to get cached stats from Redis
    if (isRedisEnabled && pubClient) {
      try {
        console.log("[socketService] Attempting to get stats from Redis cache");
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
        "[socketService] Redis not enabled or client not available, fetching from database"
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
  if (!userId) return { isOnline: false, lastSeen: null };

  // Check local memory first for performance
  const userData = connectedUsers.get(userId);
  if (userData) {
    return {
      isOnline: true,
      lastSeen: userData.lastSeen || new Date(),
    };
  }

  // Check if user has any active sockets
  if (activeSockets.has(userId)) {
    return {
      isOnline: true,
      lastSeen: new Date(),
    };
  }

  // If Redis is enabled, check there
  if (isRedisEnabled && pubClient) {
    try {
      const userStatus = await redis.getHashCache(`user:${userId}:status`);

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
    }
  }

  // If we get here, user is not online
  return {
    isOnline: false,
    lastSeen: null,
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
};
