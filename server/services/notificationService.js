/**
 * Notification Service for sending and managing user notifications
 * This service provides methods to create and manage notifications for users
 */

const User = require("../models/User");
const socketService = require("./socketService");

const notificationService = {
  /**
   * Create a notification for a user and store it in the database
   * @param {string|Object} userId - The user ID to send notification to, or notification object
   * @param {string} senderId - The user ID who triggered the notification (optional)
   * @param {Object} data - The notification data
   * @returns {Promise<Object>} The created notification
   */
  createNotification: async (userId, senderId, data) => {
    try {
      // Handle new signature where first param is the notification object
      let notificationData = data;
      let targetUserId = userId;

      if (typeof userId === "object" && userId !== null) {
        notificationData = userId;
        targetUserId = notificationData.user;

        // Don't proceed if no user ID is provided
        if (!targetUserId) {
          console.error("User ID is required for notification");
          return null;
        }
      }

      if (!targetUserId) {
        console.error("User ID is required for notification");
        return null;
      }

      // Create notification object
      const notification = {
        type: notificationData.type || "trade",
        title:
          notificationData.title ||
          (notificationData.status
            ? `Trade Status: ${notificationData.status.replace(/_/g, " ")}`
            : "Trade Update"),
        message:
          notificationData.message ||
          (notificationData.status
            ? `Your trade status has been updated to ${notificationData.status}`
            : "Trade update received"),
        link: notificationData.link || `/trades`,
        relatedItemId:
          notificationData.relatedItemId || notificationData.item?._id || null,
        read: false,
        createdAt: new Date(),
      };

      // Check for duplicate notifications within the last 5 seconds
      // This prevents multiple notifications for the same event (like trade cancellation)
      const user = await User.findById(targetUserId);
      if (!user) {
        console.error(
          `Could not find user with ID ${targetUserId} to add notification`
        );
        return null;
      }

      // Check for recent duplicates
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentNotifications = user.notifications || [];
      const hasDuplicate = recentNotifications.some(
        (existingNotification) =>
          existingNotification.type === notification.type &&
          existingNotification.title === notification.title &&
          existingNotification.message === notification.message &&
          existingNotification.relatedItemId?.toString() ===
            notification.relatedItemId?.toString() &&
          new Date(existingNotification.createdAt) > fiveSecondsAgo
      );

      if (hasDuplicate) {
        console.log(
          `Skipping duplicate notification for user ${targetUserId}: ${notification.title}`
        );
        return null;
      }

      // Add notification to user's notifications array
      const updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        {
          $push: {
            notifications: notification,
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        console.error(
          `Could not find user with ID ${targetUserId} to add notification`
        );
        return null;
      }

      // Send real-time notification via WebSocket if available
      try {
        socketService.sendNotification(targetUserId, notification);
      } catch (socketError) {
        console.error("Failed to send socket notification:", socketError);
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  },

  /**
   * Mark a notification as read
   * @param {string} userId - The user ID
   * @param {string} notificationId - The notification ID
   * @returns {Promise<boolean>} Success status
   */
  markAsRead: async (userId, notificationId) => {
    try {
      await User.updateOne(
        { _id: userId, "notifications._id": notificationId },
        { $set: { "notifications.$.read": true } }
      );
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  },

  /**
   * Get all notifications for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of notifications
   */
  getNotifications: async (userId) => {
    try {
      const user = await User.findById(userId);
      return user?.notifications || [];
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  },
};

module.exports = notificationService;
