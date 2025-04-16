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
  const socketService = require("../services/socketService");

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Get user status from socketService
    const status = await socketService.getUserStatus(userId);
    console.log(`[userRoutes] Retrieved status for user ${userId}:`, status);

    // Format last seen time with more detail
    let lastSeenFormatted = null;
    if (status.lastSeen) {
      const now = new Date();
      const lastSeen = new Date(status.lastSeen);
      const diffMs = now - lastSeen;

      // If less than a minute
      if (diffMs < 60 * 1000) {
        lastSeenFormatted = "just now";
      }
      // If less than an hour
      else if (diffMs < 60 * 60 * 1000) {
        const minutes = Math.floor(diffMs / (60 * 1000));
        lastSeenFormatted = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      // If less than a day
      else if (diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (60 * 60 * 1000));
        const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        if (minutes > 0) {
          lastSeenFormatted = `${hours}h ${minutes}m ago`;
        } else {
          lastSeenFormatted = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        }
      }
      // If less than a week
      else if (diffMs < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        lastSeenFormatted = `${days} day${days !== 1 ? "s" : ""} ago`;
      }
      // More than a week - show date and time
      else {
        lastSeenFormatted = lastSeen.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    return res.json({
      isOnline: status.isOnline,
      lastSeen: status.lastSeen,
      lastSeenFormatted,
    });
  } catch (error) {
    console.error("Error getting user status:", error);
    return res.status(500).json({ error: "Failed to get user status" });
  }
});

module.exports = router;
