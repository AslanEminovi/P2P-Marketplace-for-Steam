const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const requireAuth = require("../middleware/requireAuth");

// All user routes require authentication
router.use(requireAuth);

// Get user profile (direct endpoint for fresh data)
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Direct profile request for user:", userId);

    // Always get fresh data from database
    const User = require("../models/User");
    const user = await User.findById(userId)
      .select("-passwordHash -refreshToken -steamLoginSecure")
      .lean();

    if (!user) {
      console.error("User not found in direct profile endpoint:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Returning fresh user data from direct endpoint");
    return res.json(user);
  } catch (err) {
    console.error("Direct profile endpoint error:", err);
    return res.status(500).json({ error: "Failed to retrieve profile data" });
  }
});

// Update user settings
router.put("/settings", userController.updateUserSettings);

// Update user notification preferences
router.put("/notifications", userController.updateNotificationSettings);

// Mark notifications as read
router.put("/notifications/read", userController.markNotificationsRead);

// Get user notifications
router.get("/notifications", userController.getUserNotifications);

// Complete user profile after initial steam login
router.post("/complete-profile", userController.completeUserProfile);

// Redis test endpoint (temporary, can be removed after testing)
router.get("/redis-status", async (req, res) => {
  const redisConfig = require("../config/redis");
  const isRedisEnabled = process.env.USE_REDIS === "true";

  if (!isRedisEnabled) {
    return res.json({
      status: "disabled",
      message: "Redis is not enabled in this environment",
    });
  }

  try {
    // Check if Redis is initialized and connected
    const isConnected = redisConfig.isConnected();

    if (!isConnected) {
      // Try to initialize Redis if not already connected
      redisConfig.initRedis();

      // Wait a moment for connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Test Redis operations
    const testKey = `redis-test:${Date.now()}`;
    const testValue = {
      timestamp: new Date().toISOString(),
      server: process.env.SERVER_ID || "unknown",
      test: "Redis connection test",
    };

    // Try to store a value
    const setResult = await redisConfig.setCache(testKey, testValue, 60);

    // Try to retrieve the value
    const getValue = await redisConfig.getCache(testKey);

    // Clean up
    await redisConfig.deleteCache(testKey);

    return res.json({
      status: "connected",
      isRedisEnabled,
      operations: {
        set: setResult ? "success" : "failed",
        get: getValue ? "success" : "failed",
        value: getValue,
      },
      message: "Redis is properly configured and operational",
    });
  } catch (error) {
    console.error("Redis test error:", error);
    return res.status(500).json({
      status: "error",
      isRedisEnabled,
      error: error.message,
      message: "Failed to test Redis connection",
    });
  }
});

// Get user online status
router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;
  const userStatusManager = require("../services/UserStatusManager");

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    console.log(`[userRoutes] GET /status/${userId} request received`);

    // Get user status directly from UserStatusManager
    const status = await userStatusManager.getUserStatus(userId);
    console.log(`[userRoutes] Retrieved status for user ${userId}:`, status);

    // No need to double-check active connections since UserStatusManager is the single source of truth

    // Set no-cache headers
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    const responseData = {
      userId,
      isOnline: status.isOnline,
      lastSeen: status.lastSeen,
      lastSeenFormatted: status.lastSeenFormatted,
      timestamp: new Date(),
    };

    console.log(
      `[userRoutes] Sending status response for ${userId}:`,
      responseData
    );
    res.json(responseData);
  } catch (err) {
    console.error(`[userRoutes] Error getting user status for ${userId}:`, err);
    res.status(500).json({ error: "Error retrieving user status" });
  }
});

// Get user online status (direct from database, more reliable)
router.get("/direct-status/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    console.log(`[userRoutes] GET /direct-status/${userId} request received`);

    // Add no-cache headers
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    });

    // Check if the user is authenticated (only for logged-in users trying to check themselves)
    const isAuthenticated = req.isAuthenticated() && req.user;
    const isSelf = isAuthenticated && req.user._id.toString() === userId;

    // Use our new UserStatusManager
    const userStatusManager = require("../services/UserStatusManager");
    const status = await userStatusManager.getUserStatus(userId);

    // Create response
    const responseData = {
      userId,
      isOnline: status.isOnline,
      lastSeen: status.lastSeen,
      lastSeenFormatted: status.lastSeenFormatted,
      timestamp: new Date(),
    };

    console.log(
      `[userRoutes] Sending direct-status response for ${userId}:`,
      responseData
    );
    return res.json(responseData);
  } catch (err) {
    console.error(
      `[userRoutes] Error getting direct status for ${userId}:`,
      err
    );
    // Send a default response even on error
    return res.json({
      userId,
      isOnline: false,
      lastSeen: new Date(),
      lastSeenFormatted: "Recently",
      timestamp: new Date(),
    });
  }
});

// Debug endpoint for user status - admin only
router.get("/debug-status", async (req, res) => {
  try {
    // Only allow for authenticated admin users or in dev environment
    const isAdmin = req.user && req.user.isAdmin === true;
    const isDev = process.env.NODE_ENV !== "production";

    if (!isAdmin && !isDev) {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log("[userRoutes] DEBUG endpoint called");

    // Get UserStatusManager
    const userStatusManager = require("../services/UserStatusManager");

    // Force connection log
    userStatusManager.logConnections();

    // Get basic stats
    const User = require("../models/User");
    const totalUsers = await User.countDocuments();
    const onlineInDB = await User.countDocuments({ isOnline: true });

    // Get tracked users from UserStatusManager
    const trackedUsers = [...userStatusManager.onlineUsers.keys()].map(
      (userId) => {
        const info = userStatusManager.onlineUsers.get(userId);
        return {
          userId,
          socketCount: info.socketIds.size,
          lastActive: info.lastActive,
        };
      }
    );

    // Get current time on server
    const serverTime = new Date();

    // Response data
    const debugData = {
      serverTime,
      memory: {
        trackedUsers: trackedUsers.length,
        anonymousSockets: userStatusManager.anonymousSockets.size,
        userDetails: trackedUsers,
      },
      database: {
        totalUsers,
        onlineUsers: onlineInDB,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverTimeISOString: serverTime.toISOString(),
      },
    };

    res.json(debugData);
  } catch (error) {
    console.error("[userRoutes] Error in debug-status endpoint:", error);
    res.status(500).json({
      error: "Server error",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
});

module.exports = router;
