const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const requireAuth = require("../middleware/requireAuth");

// All user routes require authentication
router.use(requireAuth);

// Get current user profile
router.get("/profile", userController.getUserProfile);

// Update user settings
router.put("/settings", userController.updateUserSettings);

// Update user notification preferences
router.put("/notifications", userController.updateNotificationSettings);

// Mark notifications as read
router.put("/notifications/read", userController.markNotificationsRead);

// Get user notifications
router.get("/notifications", userController.getUserNotifications);

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

    // Format last seen time
    let lastSeenFormatted = null;
    if (status.lastSeen) {
      const now = new Date();
      const lastSeen = new Date(status.lastSeen);
      const diffMs = now - lastSeen;

      // If less than a day, show hours/minutes
      if (diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
          lastSeenFormatted = `${hours}h ago`;
        } else if (minutes > 0) {
          lastSeenFormatted = `${minutes}m ago`;
        } else {
          lastSeenFormatted = "Just now";
        }
      } else {
        // Simple date format for older times
        lastSeenFormatted = lastSeen.toLocaleDateString();
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
