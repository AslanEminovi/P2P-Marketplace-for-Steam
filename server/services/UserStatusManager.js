/**
 * UserStatusManager - Single source of truth for user online status
 * This replaces the previous approach with a more reliable tracking system
 */
const User = require("../models/User");

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

    // Constants
    this.CLEANUP_INTERVAL_MS = 15000; // 15 seconds
    this.DB_SYNC_INTERVAL_MS = 30000; // 30 seconds
    this.INACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
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

    this.isInitialized = true;
  }

  /**
   * Handle a new socket connection
   * @param {Object} socket - The socket.io socket
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const isAuthenticated = socket.isAuthenticated === true;

    console.log(
      `[UserStatusManager] New connection: Socket ${socket.id}, UserId: ${
        userId || "anonymous"
      }, Auth: ${isAuthenticated}`
    );

    if (!userId || !isAuthenticated) {
      // Anonymous user
      this.anonymousSockets.add(socket.id);

      // Handle disconnect
      socket.on("disconnect", () => {
        this.anonymousSockets.delete(socket.id);
        console.log(
          `[UserStatusManager] Anonymous socket disconnected: ${socket.id}`
        );
      });

      return;
    }

    // Authenticated user
    if (!this.onlineUsers.has(userId)) {
      // First socket for this user
      this.onlineUsers.set(userId, {
        socketIds: new Set([socket.id]),
        lastActive: this.validateDate(new Date()),
      });

      // Update database immediately
      this.updateUserStatus(userId, true).catch((err) => {
        console.error(
          `[UserStatusManager] Error updating database for user ${userId}:`,
          err
        );
      });
    } else {
      // Add to existing user's socket set
      const userInfo = this.onlineUsers.get(userId);
      userInfo.socketIds.add(socket.id);
      userInfo.lastActive = this.validateDate(new Date());
      this.onlineUsers.set(userId, userInfo);
    }

    // Log the connection
    console.log(
      `[UserStatusManager] User ${userId} connected with socket ${
        socket.id
      }, total connections: ${this.onlineUsers.get(userId).socketIds.size}`
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(userId, socket.id);
    });

    // Handle heartbeat to update last active time
    socket.on("heartbeat", () => {
      this.updateLastActive(userId);
    });

    // Handle user activity
    socket.on("user_active", () => {
      this.updateLastActive(userId);
    });
  }

  /**
   * Handle socket disconnect
   * @param {string} userId - The user ID
   * @param {string} socketId - The socket ID
   */
  handleDisconnect(userId, socketId) {
    if (!this.onlineUsers.has(userId)) {
      console.log(
        `[UserStatusManager] User ${userId} not found during disconnect`
      );
      return;
    }

    const userInfo = this.onlineUsers.get(userId);

    // Remove this socket
    userInfo.socketIds.delete(socketId);
    console.log(
      `[UserStatusManager] Socket ${socketId} disconnected from user ${userId}, remaining connections: ${userInfo.socketIds.size}`
    );

    if (userInfo.socketIds.size === 0) {
      // User has no more active connections
      console.log(
        `[UserStatusManager] User ${userId} has no more connections, marking as offline`
      );
      this.onlineUsers.delete(userId);

      // Update database
      this.updateUserStatus(userId, false).catch((err) => {
        console.error(
          `[UserStatusManager] Error updating database for user ${userId}:`,
          err
        );
      });
    } else {
      // Update the user info
      this.onlineUsers.set(userId, userInfo);
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
    const now = new Date();
    const usersToRemove = [];

    // Check each user
    for (const [userId, userInfo] of this.onlineUsers.entries()) {
      const inactiveTime = now - userInfo.lastActive;

      // If inactive for too long, mark for removal
      if (inactiveTime > this.INACTIVE_TIMEOUT_MS) {
        console.log(
          `[UserStatusManager] User ${userId} inactive for ${Math.round(
            inactiveTime / 60000
          )} minutes, marking offline`
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
    }
  }

  /**
   * Synchronize with database
   */
  async syncWithDatabase() {
    try {
      console.log("[UserStatusManager] Starting database synchronization");

      // 1. Get all users marked as online in the database
      const onlineUsersInDB = await User.find({ isOnline: true })
        .select("_id lastActive")
        .lean();

      console.log(
        `[UserStatusManager] Found ${onlineUsersInDB.length} users marked online in database`
      );

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
      source: "memory",
    };

    // Check if user is in our tracking
    if (this.onlineUsers.has(userId)) {
      const userInfo = this.onlineUsers.get(userId);
      status.isOnline = true;
      status.lastSeen = userInfo.lastActive;
      status.lastSeenFormatted = this.formatLastSeen(userInfo.lastActive);
      return status;
    }

    // Check database as fallback
    try {
      const user = await User.findById(userId)
        .select("isOnline lastActive")
        .lean();

      if (user) {
        // Use 10-minute rule - if user was active in the last 10 minutes, consider them online
        const lastActive = user.lastActive ? new Date(user.lastActive) : now;
        const tenMinutesAgo = new Date(now - 10 * 60 * 1000);
        const isOnline = user.isOnline === true || lastActive > tenMinutesAgo;

        status.isOnline = isOnline;
        status.lastSeen = lastActive;
        status.lastSeenFormatted = this.formatLastSeen(lastActive);
        status.source = "database";
      }
    } catch (error) {
      console.error(
        `[UserStatusManager] Error getting user ${userId} status from database:`,
        error
      );
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
        return {
          authenticated: 0,
          anonymous: 0,
          total: 0,
          error: "Maps not initialized",
        };
      }

      // Count unique authenticated users
      const authenticatedCount = this.onlineUsers.size;

      // Count anonymous users
      const anonymousCount = this.anonymousSockets.size;

      // Log counts for debugging
      console.log("[UserStatusManager] Current user counts:", {
        authenticated: authenticatedCount,
        anonymous: anonymousCount,
        total: authenticatedCount + anonymousCount,
      });

      // Return counts
      return {
        authenticated: authenticatedCount,
        anonymous: anonymousCount,
        total: authenticatedCount + anonymousCount,
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
}

// Create singleton instance
const instance = new UserStatusManager();

module.exports = instance;
