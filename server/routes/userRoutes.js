const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const requireAuth = require("../middleware/requireAuth");
const User = require("../models/user");
const Notification = require("../models/notification");

// All user routes require authentication
router.use(requireAuth);

// Get current user profile
router.get("/profile", userController.getUserProfile);

// Update user settings
router.put("/settings", userController.updateUserSettings);

// Update user notification preferences
router.put("/notifications", userController.updateNotificationSettings);

// Mark notifications as read
router.put("/notifications/read", requireAuth, async (req, res) => {
  try {
    const { notificationIds, markAll } = req.body;

    if (markAll) {
      // Mark all of the user's notifications as read
      await Notification.updateMany(
        { user: req.user.id, read: false },
        { $set: { read: true } }
      );

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          user: req.user.id,
        },
        { $set: { read: true } }
      );

      return res.status(200).json({
        success: true,
        message: "Notifications marked as read",
      });
    } else {
      return res.status(400).json({
        error: "Either notificationIds array or markAll must be provided",
      });
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return res
      .status(500)
      .json({ error: "Failed to mark notifications as read" });
  }
});

// Get user notifications
router.get("/notifications", userController.getUserNotifications);

// Add a route to handle trade URL updates
router.post("/settings/trade-url", requireAuth, async (req, res) => {
  try {
    const { tradeUrl } = req.body;

    // Basic validation for trade URL format
    if (!tradeUrl || !tradeUrl.includes("steamcommunity.com/tradeoffer/new/")) {
      return res.status(400).json({ error: "Invalid trade URL format" });
    }

    // Update the user's trade URL in the database
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Initialize settings object if it doesn't exist
    if (!user.settings) {
      user.settings = {};
    }

    user.settings.tradeUrl = tradeUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Trade URL saved successfully",
    });
  } catch (error) {
    console.error("Error saving trade URL:", error);
    return res.status(500).json({ error: "Failed to save trade URL" });
  }
});

module.exports = router;
