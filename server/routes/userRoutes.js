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
    console.log(`[userRoutes] GET /status/${userId} request received`);

    // Get user status from socketService
    const status = await socketService.getUserStatus(userId);
    console.log(`[userRoutes] Retrieved status for user ${userId}:`, status);

    // Double-check active connections
    const isSocketConnected = socketService.isUserConnected(userId);
    console.log(
      `[userRoutes] Socket connection check for ${userId}: ${
        isSocketConnected ? "CONNECTED" : "NOT CONNECTED"
      }`
    );

    // If the status says offline but we detect an active socket, override
    if (!status.isOnline && isSocketConnected) {
      console.log(
        `[userRoutes] Overriding status for ${userId} to ONLINE based on active socket`
      );
      status.isOnline = true;
      status.lastSeen = new Date();
    }

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

    // Send the response with cache control headers
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    const responseData = {
      userId,
      isOnline: status.isOnline,
      lastSeen: status.lastSeen,
      lastSeenFormatted,
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

    // Get user data directly from the database
    const User = require("../models/User");
    const user = await User.findById(userId)
      .select("lastActive isOnline")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`[userRoutes] Database status for ${userId}:`, {
      lastActive: user.lastActive,
      isOnline: user.isOnline,
    });

    // Calculate online status based on last active time (consider online if active in last 10 minutes)
    const now = new Date();
    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // User is online if database says they're online OR they were active in the last 10 minutes
    const isOnline =
      user.isOnline || (lastActive && lastActive > tenMinutesAgo);

    // Format last seen time
    let lastSeenFormatted = null;
    if (lastActive) {
      const diffMs = now - lastActive;

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
        lastSeenFormatted = lastActive.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    // Set cache-control headers (but don't use Expires header)
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    });

    const responseData = {
      userId,
      isOnline,
      lastSeen: lastActive,
      lastSeenFormatted,
      timestamp: now,
      source: "database",
    };

    console.log(
      `[userRoutes] Sending direct-status response for ${userId}:`,
      responseData
    );
    res.json(responseData);
  } catch (err) {
    console.error(
      `[userRoutes] Error getting direct status for ${userId}:`,
      err
    );
    res.status(500).json({ error: "Error retrieving user status" });
  }
});

module.exports = router;
