/**
 * UserStatusManager - Single source of truth for user online status
 * This replaces the previous approach with a more reliable tracking system
 */
const User = require("../models/User");

// Global io instance
io = null;

class UserStatusManager {
  constructor() {
    // Maps to track user status
    this.onlineUsers = new Map(); // userId -> { socketIds: Set, lastActive: Date }
    this.anonymousSockets = new Set(); // Set of socket IDs

    // Intervals
    this.cleanupInterval = null;
    this.dbSyncInterval = null;

    // Debug info
    this.isInitialized = false;
    this.debugMode = process.env.NODE_ENV !== "production";

    // Constants - UPDATED for more forgiving timeouts
    this.CLEANUP_INTERVAL_MS = 20000; // 20 seconds (was 30 seconds)
    this.DB_SYNC_INTERVAL_MS = 60000; // 60 seconds (unchanged)
    this.INACTIVE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (was 15 minutes)
    this.SOCKET_DISCONNECT_GRACE_PERIOD = 8 * 60 * 1000; // 8 minute grace period (was 5 minutes)
    this.HEARTBEAT_TIMEOUT = 60 * 1000; // Consider heartbeat missing after 1 minute
  }

  /**
   * Set the Socket.io instance
   * @param {SocketIO.Server} ioInstance - The Socket.io instance
   */
  setIoInstance(ioInstance) {
    this.io = ioInstance;
    console.log("[UserStatusManager] Socket.io instance set");
  }

  /**
   * Initialize the manager
   */
  init() {
    if (this.isInitialized) {
      console.log("[UserStatusManager] Already initialized");
      return;
    }

    console.log("[UserStatusManager] Initializing");

    // Initialize maps if they don't exist
    if (!this.onlineUsers) {
      console.log("[UserStatusManager] Creating onlineUsers map");
      this.onlineUsers = new Map();
    }

    if (!this.anonymousSockets) {
      console.log("[UserStatusManager] Creating anonymousSockets set");
      this.anonymousSockets = new Set();
    }

    // Immediately log connections on startup for debugging
    this.logConnections();

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL_MS);

    // Start database synchronization interval
    this.dbSyncInterval = setInterval(() => {
      this.syncWithDatabase();
    }, this.DB_SYNC_INTERVAL_MS);

    // In debug mode, log connections every minute
    if (this.debugMode) {
      setInterval(() => {
        this.logConnections();
        this.checkUserDuplicates();
      }, 60000); // Every minute
    }

    // Perform an initial database synchronization
    setTimeout(() => {
      this.syncWithDatabase();
    }, 5000); // Wait 5 seconds to allow initial connections

    this.isInitialized = true;

    console.log("[UserStatusManager] Initialization complete");
  }

  /**
   * Handle a new socket connection
   * @param {Object} socket - The socket.io socket
   */
  handleConnection(socket) {
    try {
      if (!socket) {
        console.error(
          "[UserStatusManager] Cannot handle null/undefined socket"
        );
        return;
      }

      // Make sure our tracking structures exist
      if (!this.onlineUsers) {
        console.warn(
          "[UserStatusManager] onlineUsers map was null, recreating"
        );
        this.onlineUsers = new Map();
      }

      if (!this.anonymousSockets) {
        console.warn(
          "[UserStatusManager] anonymousSockets set was null, recreating"
        );
        this.anonymousSockets = new Set();
      }

      const userId = socket.userId;
      const isAuthenticated = socket.isAuthenticated === true;

      // Log detailed connection information
      console.log(
        `[UserStatusManager] New connection: Socket ${socket.id}, UserId: ${
          userId || "anonymous"
        }, Auth: ${isAuthenticated}`
      );

      // Check if token exists in socket.handshake
      const tokenExists = !!(
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.authorization ||
        socket.handshake?.query?.token
      );

      if (!tokenExists) {
        console.log(
          `[UserStatusManager] No token in socket handshake for socket ${socket.id}`
        );
      }

      if (!userId || !isAuthenticated) {
        // Anonymous user - log reason
        if (!userId && !isAuthenticated) {
          console.log(
            `[UserStatusManager] Socket ${socket.id} is anonymous: No userId and not authenticated`
          );
        } else if (!userId) {
          console.log(
            `[UserStatusManager] Socket ${socket.id} is anonymous: No userId even though authenticated=${isAuthenticated}`
          );
        } else {
          console.log(
            `[UserStatusManager] Socket ${socket.id} is anonymous: Has userId=${userId} but not authenticated`
          );
        }

        this.anonymousSockets.add(socket.id);
        console.log(
          `[UserStatusManager] Added socket ${socket.id} to anonymous sockets, total count: ${this.anonymousSockets.size}`
        );

        // Handle disconnect
        socket.on("disconnect", (reason) => {
          this.anonymousSockets.delete(socket.id);
          console.log(
            `[UserStatusManager] Anonymous socket disconnected: ${socket.id}, reason: ${reason}, remaining: ${this.anonymousSockets.size}`
          );
        });

        return;
      }

      // Check if this is the first connection for this user
      const wasOffline = !this.onlineUsers.has(userId);

      // Authenticated user
      if (wasOffline) {
        // First socket for this user
        console.log(`[UserStatusManager] First connection for user ${userId}`);
        this.onlineUsers.set(userId, {
          socketIds: new Set([socket.id]),
          lastActive: this.validateDate(new Date()),
          lastHeartbeat: this.validateDate(new Date()),
          connectedSince: this.validateDate(new Date()),
          disconnections: [],
          closedSockets: new Set(),
        });
        console.log(
          `[UserStatusManager] Added user ${userId} to onlineUsers map, total count: ${this.onlineUsers.size}`
        );

        // Update database immediately
        this.updateUserStatus(userId, true).catch((err) => {
          console.error(
            `[UserStatusManager] Error updating database for user ${userId}:`,
            err
          );
        });

        // Notify about status change - user is now online
        this.notifyStatusChange(userId, true);
      } else {
        // Add to existing user's socket set
        const userInfo = this.onlineUsers.get(userId);
        console.log(
          `[UserStatusManager] Additional connection for user ${userId}, existing connections: ${userInfo.socketIds.size}`
        );
        userInfo.socketIds.add(socket.id);
        userInfo.lastActive = this.validateDate(new Date());
        userInfo.lastHeartbeat = this.validateDate(new Date());

        // If socket was previously closed but reconnected, remove from closedSockets
        if (userInfo.closedSockets && userInfo.closedSockets.has(socket.id)) {
          userInfo.closedSockets.delete(socket.id);
          console.log(
            `[UserStatusManager] Reconnected previously closed socket ${socket.id} for user ${userId}`
          );
        }

        this.onlineUsers.set(userId, userInfo);
      }

      // Log the connection
      console.log(
        `[UserStatusManager] User ${userId} connected with socket ${
          socket.id
        }, total connections: ${this.onlineUsers.get(userId).socketIds.size}`
      );

      // Enhanced disconnect handler with reason
      socket.on("disconnect", (reason) => {
        console.log(
          `[UserStatusManager] Socket ${socket.id} disconnected for user ${userId}, reason: ${reason}`
        );
        this.handleDisconnect(userId, socket.id, reason);
      });

      // Handle explicit browser closing event
      socket.on("browser_closing", (data) => {
        console.log(
          `[UserStatusManager] Browser closing event received for user ${userId}, socket ${socket.id}`
        );
        // Track this socket as explicitly closed
        const userInfo = this.onlineUsers.get(userId);
        if (userInfo) {
          if (!userInfo.closedSockets) userInfo.closedSockets = new Set();
          userInfo.closedSockets.add(socket.id);

          // Add closure info to disconnections array
          if (!userInfo.disconnections) userInfo.disconnections = [];
          userInfo.disconnections.push({
            time: new Date(),
            reason: "browser_closing",
            socketId: socket.id,
          });

          this.onlineUsers.set(userId, userInfo);
        }
      });

      // Handle explicit tab hidden notification
      socket.on("tab_hidden", () => {
        console.log(
          `[UserStatusManager] Tab hidden event received for user ${userId}, socket ${socket.id}`
        );
        this.updateLastActive(userId);
      });

      // Handle heartbeat to update last active time
      socket.on("heartbeat", (data) => {
        const userInfo = this.onlineUsers.get(userId);
        if (userInfo) {
          userInfo.lastHeartbeat = this.validateDate(new Date());
          this.onlineUsers.set(userId, userInfo);
        }
        this.updateLastActive(userId);
      });

      // Handle user activity
      socket.on("user_active", (data) => {
        const userInfo = this.onlineUsers.get(userId);
        if (userInfo) {
          // Record page info if provided
          if (data && data.page) {
            userInfo.currentPage = data.page;
          }

          // Record tab status if provided
          if (data && data.tabActive !== undefined) {
            userInfo.tabActive = data.tabActive;
          }

          this.onlineUsers.set(userId, userInfo);
        }
        this.updateLastActive(userId);
      });

      // Handle pings to verify connection
      socket.on("ping", (data, callback) => {
        // If callback exists, it's a latency test - call it to measure round trip time
        if (typeof callback === "function") {
          try {
            callback();
          } catch (err) {
            console.error(
              `[UserStatusManager] Error calling ping callback for user ${userId}:`,
              err
            );
          }
        }

        // Always update last active time
        this.updateLastActive(userId);

        // Send a pong response
        try {
          socket.emit("pong", { timestamp: Date.now() });
        } catch (err) {
          console.error(
            `[UserStatusManager] Error sending pong to user ${userId}:`,
            err
          );
        }
      });

      // Register event handlers for tab visibility and browser closing events
      socket.on("tab_visible", (data) =>
        this.handleVisibilityChange(socket, data, "tab_visible")
      );
      socket.on("tab_hidden", (data) =>
        this.handleVisibilityChange(socket, data, "tab_hidden")
      );
      socket.on("browser_closing", (data) =>
        this.handleBrowserClosing(socket, data)
      );
      socket.on("page_changed", (data) => {
        if (socket.metadata) {
          socket.metadata.currentPage = data.page;
          socket.metadata.lastActive = Date.now();
        }

        // If the user is authenticated, update their page in the onlineUsers map
        if (socket.userId) {
          const userInfo = this.onlineUsers.get(socket.userId);
          if (userInfo) {
            userInfo.currentPage = data.page;
            userInfo.lastActive = Date.now();
            this.onlineUsers.set(socket.userId, userInfo);
          }
        }
      });

      // After successful connection, log current stats
      setTimeout(() => {
        this.logConnections();
      }, 1000);
    } catch (error) {
      console.error(`[UserStatusManager] Error in handleConnection:`, error);
      // Handle the socket safely even if the main flow errors out
      if (socket && socket.id) {
        this.anonymousSockets.add(socket.id);
        socket.on("disconnect", () => {
          this.anonymousSockets.delete(socket.id);
        });
      }
    }
  }

  /**
   * Handle socket disconnect
   * @param {string} userId - The user ID
   * @param {string} socketId - The socket ID
   * @param {string} reason - Disconnect reason
   */
  handleDisconnect(userId, socketId, reason = "unknown") {
    if (!this.onlineUsers.has(userId)) {
      console.log(
        `[UserStatusManager] User ${userId} not found during disconnect`
      );
      return;
    }

    const userInfo = this.onlineUsers.get(userId);

    // Track this disconnection
    if (!userInfo.disconnections) userInfo.disconnections = [];
    userInfo.disconnections.push({
      time: new Date(),
      reason,
      socketId,
    });

    // Track as closed socket
    if (!userInfo.closedSockets) userInfo.closedSockets = new Set();
    userInfo.closedSockets.add(socketId);

    // Remove this socket from active sockets
    userInfo.socketIds.delete(socketId);
    console.log(
      `[UserStatusManager] Socket ${socketId} disconnected from user ${userId}, reason: ${reason}, remaining connections: ${userInfo.socketIds.size}`
    );

    if (userInfo.socketIds.size === 0) {
      // User has no more active connections, but DON'T mark as offline immediately
      // Just update the lastActive time and let the cleanup process handle it
      console.log(
        `[UserStatusManager] User ${userId} has no more connections, but keeping online during grace period`
      );
      userInfo.lastActive = this.validateDate(new Date());

      // If this was a transport error or ping timeout, it might be a network hiccup
      if (reason === "transport error" || reason === "ping timeout") {
        userInfo.lastDisconnectReason = reason;
        console.log(
          `[UserStatusManager] Disconnect appears to be due to network issues: ${reason}`
        );
      }
      // If this was a client disconnect, or transport close, might be intentional
      else if (
        reason === "client namespace disconnect" ||
        reason === "transport close"
      ) {
        userInfo.lastDisconnectReason = reason;
        console.log(
          `[UserStatusManager] Disconnect appears to be intentional: ${reason}`
        );
      }

      this.onlineUsers.set(userId, userInfo);

      // We don't update the database or notify about status change immediately
      // This gives the user time to reconnect without showing as offline
    } else {
      // Update the user info
      this.onlineUsers.set(userId, userInfo);
    }
  }

  /**
   * Notify about user status change
   * @param {string} userId - The user ID
   * @param {boolean} isOnline - Whether the user is online
   */
  notifyStatusChange(userId, isOnline) {
    try {
      // Get formatted last seen time
      const lastSeen = isOnline
        ? new Date()
        : this.onlineUsers.get(userId)?.lastActive || new Date();

      const lastSeenFormatted = this.formatLastSeen(lastSeen);

      // If we have a socket.io instance, broadcast directly
      if (this.io) {
        const socketService = require("./socketService");
        if (typeof socketService.broadcastUserStatusChange === "function") {
          socketService.broadcastUserStatusChange(
            userId,
            isOnline,
            lastSeenFormatted
          );
        }
      }
    } catch (error) {
      console.error(
        `[UserStatusManager] Error notifying status change for ${userId}:`,
        error
      );
    }
  }

  /**
   * Update a user's last active time
   * @param {string} userId - The user ID
   */
  updateLastActive(userId) {
    if (!this.onlineUsers.has(userId)) {
      return;
    }

    // Update last active time
    const userInfo = this.onlineUsers.get(userId);
    userInfo.lastActive = this.validateDate(new Date());
    this.onlineUsers.set(userId, userInfo);

    // No need to update database here - it will be updated during the next sync
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions() {
    try {
      const now = new Date();
      const usersToRemove = [];

      // Check each user
      for (const [userId, userInfo] of this.onlineUsers.entries()) {
        // Special handling for recovered users with no active sockets
        if (userInfo.isRecovered && userInfo.socketIds.size === 0) {
          // Check if they've reconnected within the recovery window (5 minutes - increased from 2 minutes)
          const recoveryWindow = 5 * 60 * 1000; // 5 minutes
          const inactiveTime = now - userInfo.lastActive;

          if (inactiveTime > recoveryWindow) {
            console.log(
              `[UserStatusManager] Recovered user ${userId} did not reconnect within recovery window, removing`
            );
            usersToRemove.push(userId);
          }
          // Otherwise give them more time to reconnect
          continue;
        }

        // For normal users, check if they have any active sockets
        if (userInfo.socketIds.size === 0) {
          // Instead of immediately marking offline, check if they were active recently
          const disconnectTime = now - userInfo.lastActive;

          // Look at disconnection history - if we have explicit browser closing events
          // we can be more aggressive about marking them offline
          let hasExplicitClose = false;
          if (userInfo.disconnections && userInfo.disconnections.length > 0) {
            // Check last 5 disconnections
            const recentDisconnections = userInfo.disconnections.slice(-5);
            for (const disconnection of recentDisconnections) {
              if (
                disconnection.reason === "browser_closing" ||
                disconnection.reason === "client namespace disconnect"
              ) {
                hasExplicitClose = true;
                break;
              }
            }
          }

          if (hasExplicitClose) {
            // User explicitly closed the browser - we can mark offline sooner
            console.log(
              `[UserStatusManager] User ${userId} has explicit close events, marking offline`
            );
            usersToRemove.push(userId);
          } else if (disconnectTime > this.SOCKET_DISCONNECT_GRACE_PERIOD) {
            console.log(
              `[UserStatusManager] User ${userId} has no active sockets for ${Math.round(
                disconnectTime / 60000
              )} minutes, marking offline`
            );
            usersToRemove.push(userId);
          } else {
            console.log(
              `[UserStatusManager] User ${userId} has no active sockets but was active ${Math.round(
                disconnectTime / 60000
              )} minutes ago, keeping online during grace period`
            );
          }
          continue;
        }

        // Check inactivity time - use a longer window (increased to 20 minutes)
        const inactiveTime = now - userInfo.lastActive;
        const heartbeatTime =
          now - (userInfo.lastHeartbeat || userInfo.lastActive);

        // If we haven't received a heartbeat in a while, the connection might be dead
        if (heartbeatTime > this.HEARTBEAT_TIMEOUT) {
          console.log(
            `[UserStatusManager] User ${userId} hasn't sent a heartbeat in ${Math.round(
              heartbeatTime / 60000
            )} minutes`
          );

          // Only do socket checking if heartbeats are missing
          let allSocketsDisconnected = true;

          // Check each socket associated with this user
          for (const socketId of userInfo.socketIds) {
            // If we can't get the socket object or it's disconnected, consider it dead
            const socket = this.io?.sockets?.sockets?.get(socketId);
            if (socket && socket.connected) {
              allSocketsDisconnected = false;

              // If we find even one active socket, ping it to verify it's still alive
              try {
                socket.emit("ping", { timestamp: Date.now() });
              } catch (socketError) {
                console.warn(
                  `[UserStatusManager] Error pinging socket ${socketId}:`,
                  socketError
                );
              }
              break; // One active socket is enough to keep the user online
            }
          }

          // If all sockets are disconnected but still in our tracking, clean them up
          if (allSocketsDisconnected) {
            console.log(
              `[UserStatusManager] All sockets for user ${userId} appear disconnected, cleaning up`
            );
            userInfo.socketIds.clear(); // Clear socket IDs that are no longer connected
            userInfo.lastActive = this.validateDate(new Date()); // Update last active time for grace period
            this.onlineUsers.set(userId, userInfo);
          }
        }

        // If user is inactive for too long (even if sockets appear connected), mark as offline
        if (inactiveTime > this.INACTIVE_TIMEOUT_MS) {
          console.log(
            `[UserStatusManager] User ${userId} inactive for ${Math.round(
              inactiveTime / 60000
            )} minutes, marking offline despite connected sockets`
          );
          usersToRemove.push(userId);
        }
      }

      // Remove inactive users
      for (const userId of usersToRemove) {
        this.onlineUsers.delete(userId);

        // Update database
        this.updateUserStatus(userId, false).catch((err) => {
          console.error(
            `[UserStatusManager] Error updating database for user ${userId}:`,
            err
          );
        });

        // Notify about status change
        this.notifyStatusChange(userId, false);
      }
    } catch (error) {
      console.error(
        "[UserStatusManager] Error in cleanupInactiveSessions:",
        error
      );
    }
  }

  /**
   * Synchronize with database
   */
  async syncWithDatabase() {
    try {
      console.log("[UserStatusManager] Starting database synchronization");

      // Make sure our tracking maps exist
      if (!this.onlineUsers) {
        console.warn(
          "[UserStatusManager] onlineUsers map was null during sync, recreating"
        );
        this.onlineUsers = new Map();
      }

      if (!this.anonymousSockets) {
        console.warn(
          "[UserStatusManager] anonymousSockets set was null during sync, recreating"
        );
        this.anonymousSockets = new Set();
      }

      // 1. Get all users marked as online in the database
      const onlineUsersInDB = await User.find({ isOnline: true })
        .select("_id lastActive")
        .lean();

      console.log(
        `[UserStatusManager] Found ${onlineUsersInDB.length} users marked online in database`
      );

      // Special handling for recovery: if our memory tracking is empty but DB has online users
      // this could be a server restart or a failed initialization
      if (this.onlineUsers.size === 0 && onlineUsersInDB.length > 0) {
        console.log(
          "[UserStatusManager] RECOVERY: Memory tracking is empty but DB has online users"
        );

        // For users that were active very recently (last 2 minutes),
        // we'll assume they're still online but we lost track during a restart
        const twoMinutesAgo = new Date(new Date().getTime() - 2 * 60 * 1000);
        let recoveredUsers = 0;

        for (const userDoc of onlineUsersInDB) {
          const userId = userDoc._id.toString();
          const lastActive = userDoc.lastActive
            ? new Date(userDoc.lastActive)
            : null;

          // Only recover very recent users to avoid false positives
          if (lastActive && lastActive > twoMinutesAgo) {
            console.log(
              `[UserStatusManager] RECOVERY: Reinstating user ${userId} who was active at ${lastActive}`
            );

            // Create a placeholder entry - this user will be marked offline at next cleanup
            // if they don't reconnect, but this helps avoid flickering
            this.onlineUsers.set(userId, {
              socketIds: new Set(), // Empty set - no active sockets yet
              lastActive: lastActive,
              isRecovered: true, // Flag to indicate this is a recovered user
            });

            recoveredUsers++;
          }
        }

        if (recoveredUsers > 0) {
          console.log(
            `[UserStatusManager] RECOVERY: Reinstated ${recoveredUsers} recently active users`
          );
        }
      }

      // 2. Check if they're actually online according to our tracking
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      let correctedUsers = 0;

      for (const userDoc of onlineUsersInDB) {
        const userId = userDoc._id.toString();

        // If user isn't in our map or has a very old lastActive time, mark them offline
        if (
          !this.onlineUsers.has(userId) ||
          (userDoc.lastActive && new Date(userDoc.lastActive) < twoHoursAgo)
        ) {
          console.log(
            `[UserStatusManager] User ${userId} marked online in DB but not active in memory, fixing`
          );

          // Update database to mark user offline
          await this.updateUserStatus(userId, false);
          correctedUsers++;
        }
      }

      if (correctedUsers > 0) {
        console.log(
          `[UserStatusManager] Corrected ${correctedUsers} stale online users in database`
        );
      }

      // 3. Ensure all users we're tracking as online are marked correctly in the DB
      let updatedUsers = 0;
      for (const userId of this.onlineUsers.keys()) {
        try {
          const user = await User.findById(userId)
            .select("isOnline lastActive")
            .lean();

          if (user) {
            // If lastActive is missing or older than our in-memory value, or isOnline != true
            const memoryLastActive = this.onlineUsers.get(userId).lastActive;
            const dbLastActive = user.lastActive
              ? new Date(user.lastActive)
              : new Date(0);

            if (!user.isOnline || memoryLastActive > dbLastActive) {
              // Update database with our more recent data
              console.log(
                `[UserStatusManager] User ${userId} status needs update in DB, fixing (isOnline=${user.isOnline})`
              );

              // Update database
              await this.updateUserStatus(userId, true);
              updatedUsers++;
            }
          } else {
            console.warn(
              `[UserStatusManager] User ${userId} in memory but not found in database`
            );
            // Remove from our tracking since user no longer exists
            this.onlineUsers.delete(userId);
          }
        } catch (userErr) {
          console.error(
            `[UserStatusManager] Error processing user ${userId}:`,
            userErr
          );
        }
      }

      if (updatedUsers > 0) {
        console.log(
          `[UserStatusManager] Updated ${updatedUsers} users' online status in database`
        );
      }

      console.log("[UserStatusManager] Database synchronization completed");
    } catch (error) {
      console.error("[UserStatusManager] Error during database sync:", error);
    }
  }

  /**
   * Update user status in database
   * @param {string} userId - The user ID
   * @param {boolean} isOnline - Whether the user is online
   */
  async updateUserStatus(userId, isOnline) {
    try {
      // Add a log message about the user's transition
      if (isOnline) {
        console.log(
          `[UserStatusManager] Marking user ${userId} as ONLINE in database`
        );
      } else {
        console.log(
          `[UserStatusManager] Marking user ${userId} as OFFLINE in database`
        );
      }

      // Update database
      await User.findByIdAndUpdate(userId, {
        isOnline: isOnline,
        lastActive: this.validateDate(new Date()),
      });

      console.log(
        `[UserStatusManager] Updated database: User ${userId} is now ${
          isOnline ? "online" : "offline"
        }`
      );
    } catch (error) {
      console.error(
        `[UserStatusManager] Error updating user ${userId} status in database:`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate a date to ensure it's not in the future
   * @param {Date} date - The date to validate
   * @returns {Date} - A valid date (current time if the input was in the future)
   */
  validateDate(date) {
    // Check if date exists
    if (!date) {
      console.warn(
        "[UserStatusManager] Null date provided, using current time"
      );
      return new Date();
    }

    // Ensure it's a Date object
    const dateObj = new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(
        "[UserStatusManager] Invalid date provided, using current time"
      );
      return new Date();
    }

    // Get current time
    const now = new Date();

    // Check if date is in the future
    if (dateObj > now) {
      console.warn(
        `[UserStatusManager] Future date detected (${dateObj.toISOString()}), using current time instead`
      );
      return now;
    }

    return dateObj;
  }

  /**
   * Check if a user is online
   * @param {string} userId - The user ID
   * @returns {boolean} Whether the user is online
   */
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  /**
   * Get user status
   * @param {string} userId - The user ID
   * @returns {Object} The user status
   */
  async getUserStatus(userId) {
    // Default status
    const now = new Date();
    let status = {
      isOnline: false,
      lastSeen: now,
      lastSeenFormatted: "Recently",
      source: "default",
    };

    // First check if user is in our memory tracking (most reliable source)
    if (this.onlineUsers.has(userId)) {
      const userInfo = this.onlineUsers.get(userId);
      status.isOnline = true;
      status.lastSeen = userInfo.lastActive;
      status.lastSeenFormatted = this.formatLastSeen(userInfo.lastActive);
      status.source = "memory";
      return status;
    }

    // User not in memory tracking, so they're definitely offline
    // Check database as fallback for last seen time
    try {
      const user = await User.findById(userId)
        .select("isOnline lastActive")
        .lean();

      if (user) {
        // The user is not in our memory tracking, so they're definitely offline
        // regardless of database isOnline flag (which might be stale)
        status.isOnline = false;

        // But we can use the lastActive time from database
        const lastActive = user.lastActive ? new Date(user.lastActive) : null;
        if (lastActive) {
          status.lastSeen = lastActive;
          status.lastSeenFormatted = this.formatLastSeen(lastActive);
        }

        status.source = "database";

        // If user is marked online in DB but not in our memory tracking, they're actually offline
        // So fix the database record if needed
        if (user.isOnline === true) {
          console.log(
            `[UserStatusManager] User ${userId} incorrectly marked online in DB, fixing`
          );
          this.updateUserStatus(userId, false).catch((err) => {
            console.error(
              `[UserStatusManager] Error updating incorrect status for ${userId}:`,
              err
            );
          });
        }
      }
    } catch (error) {
      console.error(
        `[UserStatusManager] Error getting user ${userId} status from database:`,
        error
      );
      status.source = "error";
    }

    return status;
  }

  /**
   * Format last seen time
   * @param {Date} lastSeen - The last seen time
   * @returns {string} Formatted last seen time
   */
  formatLastSeen(lastSeen) {
    if (!lastSeen) return "Recently";

    const now = new Date();
    const diffMs = now - new Date(lastSeen);

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
    return new Date(lastSeen).toLocaleDateString();
  }

  /**
   * Get user counts
   * @returns {Object} User counts
   */
  getUserCounts() {
    try {
      // Check if maps are initialized
      if (!this.onlineUsers || !this.anonymousSockets) {
        console.error("[UserStatusManager] Maps not initialized properly");
        if (!this.isInitialized) {
          console.log("[UserStatusManager] Re-initializing manager");
          this.init();
        }
        return {
          authenticated: 0,
          anonymous: 0,
          total: 0,
          error: "Maps not initialized",
        };
      }

      // Count unique authenticated users
      const authenticatedCount = this.onlineUsers ? this.onlineUsers.size : 0;

      // Count anonymous users
      const anonymousCount = this.anonymousSockets
        ? this.anonymousSockets.size
        : 0;

      // Calculate total - ONLY counting authenticated users for accuracy
      // We exclude anonymous users because they could be duplicate tabs
      // and there's no reliable way to deduplicate them without cookies
      const totalCount = authenticatedCount;

      // If everything is zero, log more detailed debug info
      if (authenticatedCount === 0 && anonymousCount === 0) {
        console.warn(
          "[UserStatusManager] All user counts are zero! Dumping debug info:"
        );
        console.warn(`  - isInitialized: ${this.isInitialized}`);
        console.warn(
          `  - onlineUsers set: ${this.onlineUsers ? "exists" : "null"}`
        );
        console.warn(
          `  - anonymousSockets set: ${
            this.anonymousSockets ? "exists" : "null"
          }`
        );

        if (this.onlineUsers) {
          console.warn(
            `  - onlineUsers keys: ${Array.from(this.onlineUsers.keys()).join(
              ", "
            )}`
          );
        }

        // Force a sync with database to recover any missing users
        this.syncWithDatabase().catch((err) => {
          console.error(
            "[UserStatusManager] Error syncing with database during recovery:",
            err
          );
        });
      }

      // Log counts for debugging
      console.log("[UserStatusManager] Current user counts:", {
        authenticated: authenticatedCount,
        anonymous: anonymousCount,
        total: totalCount,
        note: "Total only includes authenticated users",
      });

      // Return counts
      return {
        authenticated: authenticatedCount,
        anonymous: anonymousCount,
        total: totalCount,
      };
    } catch (error) {
      console.error("[UserStatusManager] Error getting user counts:", error);
      return {
        authenticated: 0,
        anonymous: 0,
        total: 0,
        error: error.message,
      };
    }
  }

  /**
   * Shutdown and clean up
   */
  shutdown() {
    console.log("[UserStatusManager] Shutting down");

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.dbSyncInterval) {
      clearInterval(this.dbSyncInterval);
      this.dbSyncInterval = null;
    }

    // Mark all users as offline
    for (const userId of this.onlineUsers.keys()) {
      this.updateUserStatus(userId, false).catch((err) => {
        console.error(
          `[UserStatusManager] Error updating database for user ${userId}:`,
          err
        );
      });
    }

    // Clear maps
    this.onlineUsers.clear();
    this.anonymousSockets.clear();

    this.isInitialized = false;
  }

  /**
   * Log all current connections for debugging
   */
  logConnections() {
    // Log authenticated users
    console.log(`[UserStatusManager] ==== CONNECTION DEBUG INFO ====`);
    console.log(
      `[UserStatusManager] Authenticated users: ${this.onlineUsers.size}`
    );

    // Log each user's connections
    let socketCount = 0;
    for (const [userId, userInfo] of this.onlineUsers.entries()) {
      console.log(
        `[UserStatusManager] - User ${userId}: ${
          userInfo.socketIds.size
        } sockets, Last active: ${userInfo.lastActive.toISOString()}`
      );
      socketCount += userInfo.socketIds.size;
    }

    // Log anonymous sockets
    console.log(
      `[UserStatusManager] Anonymous sockets: ${this.anonymousSockets.size}`
    );

    // Log total count
    console.log(
      `[UserStatusManager] Total authenticated sockets: ${socketCount}`
    );
    console.log(
      `[UserStatusManager] Total connections: ${
        socketCount + this.anonymousSockets.size
      }`
    );
    console.log(`[UserStatusManager] ==== END DEBUG INFO ====`);
  }

  /**
   * Check if any users are being tracked multiple times
   * This would indicate a bug in the tracking logic
   */
  checkUserDuplicates() {
    // For this check we need to compare Object IDs and their string representations
    // Since MongoDB ObjectIDs can sometimes be compared as strings and sometimes as objects
    const userIds = new Set();
    const duplicates = [];

    for (const userId of this.onlineUsers.keys()) {
      const normalizedId = userId.toString();

      if (userIds.has(normalizedId)) {
        duplicates.push(normalizedId);
      } else {
        userIds.add(normalizedId);
      }
    }

    if (duplicates.length > 0) {
      console.error(
        `[UserStatusManager] CRITICAL: Found ${duplicates.length} duplicate user entries!`
      );
      console.error(
        `[UserStatusManager] Duplicate user IDs: ${duplicates.join(", ")}`
      );
      console.error(
        `[UserStatusManager] This indicates a bug in the tracking system that needs to be fixed.`
      );
    }
  }

  /**
   * Handle page visibility changes (tab hidden/visible)
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Event data containing timestamp and page info
   * @param {String} eventType - Either 'tab_hidden' or 'tab_visible'
   */
  handleVisibilityChange(socket, data, eventType) {
    try {
      const userId = socket.userId;
      const timestamp = data.timestamp || Date.now();
      const page = data.page || "unknown";
      const connectionId = data.connectionId;
      const isVisible = eventType === "tab_visible";

      console.log(
        `[UserStatusManager] User ${userId || "anonymous"} tab ${
          isVisible ? "visible" : "hidden"
        } on page ${page}`
      );

      // Update socket metadata
      socket.metadata = {
        ...socket.metadata,
        lastActive: timestamp,
        currentPage: page,
        tabVisible: isVisible,
        connectionId,
      };

      if (userId) {
        const userInfo = this.onlineUsers.get(userId);
        if (userInfo) {
          // Update visibility status in the user info
          userInfo.tabVisible = isVisible;
          userInfo.lastActive = timestamp;
          userInfo.currentPage = page;

          // If tab becomes visible and user was marked as away, mark them as active again
          if (isVisible && userInfo.status === "away") {
            userInfo.status = "active";

            // Notify other clients about the status change
            this.notifyUserStatusChange(userId, {
              isOnline: true,
              status: "active",
              lastSeen: timestamp,
            });
          }

          this.onlineUsers.set(userId, userInfo);
        }
      }
    } catch (error) {
      console.error(
        "[UserStatusManager] Error handling visibility change:",
        error
      );
    }
  }

  /**
   * Handle browser closing event
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Event data containing timestamp and page info
   */
  handleBrowserClosing(socket, data) {
    try {
      const userId = socket.userId;
      const timestamp = data.timestamp || Date.now();

      console.log(
        `[UserStatusManager] Browser closing event from user ${
          userId || "anonymous"
        }`
      );

      // Mark this socket as closing
      socket.metadata = {
        ...socket.metadata,
        closing: true,
        lastActive: timestamp,
      };

      // We'll let the disconnect handler take care of the rest
      // No need to remove the socket yet as it will disconnect shortly
    } catch (error) {
      console.error(
        "[UserStatusManager] Error handling browser closing:",
        error
      );
    }
  }
}

// Create singleton instance
const instance = new UserStatusManager();

module.exports = instance;
