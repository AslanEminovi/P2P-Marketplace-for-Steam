/**
 * Notification Service for sending and managing user notifications
 * This service provides methods to create and manage notifications for users
 */

const User = require("../models/User");
const socketService = require("./socketService");

const notificationService = {
  /**
   * Create a notification for a user and store it in the database
   * @param {string} userId - The user ID to send notification to
   * @param {string} senderId - The user ID who triggered the notification (optional)
   * @param {Object} data - The notification data
   * @returns {Promise<Object>} The created notification
   */
  createNotification: async (userId, senderId, data) => {
    try {
      if (!userId) {
        console.error("User ID is required for notification");
        return null;
      }

      // Create notification object
      const notification = {
        type: "trade",
        title: data.status
          ? `Trade Status: ${data.status.replace(/_/g, " ")}`
          : "Trade Update",
        message:
          data.message ||
          `Your trade status has been updated to ${data.status}`,
        link: data.link || `/trades`,
        relatedItemId: data.item?._id || null,
        read: false,
        createdAt: new Date(),
      };

      // Add notification to user's notifications array
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            notifications: notification,
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        console.error(
          `Could not find user with ID ${userId} to add notification`
        );
        return null;
      }

      // Send real-time notification via WebSocket if available
      try {
        socketService.sendNotification(userId, notification);
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
