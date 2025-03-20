const jwt = require("jsonwebtoken");
const User = require("../models/User");
const socketService = require("../services/socketService");

exports.login = async (req, res) => {
  try {
    // ... existing login code ...

    // After successful login
    user.lastLogin = new Date();
    await user.save();

    // Emit user activity event
    socketService.emitUserActivity({
      action: "join",
      user: user.username || user.steamName || user._id.toString(),
      timestamp: new Date().toISOString(),
    });

    // ... existing response code ...
  } catch (error) {
    // ... existing error handling ...
  }
};

exports.logout = async (req, res) => {
  try {
    // Get user before logout
    const user = req.user;

    // ... existing logout code ...

    // Emit user activity event if we have user info
    if (user) {
      socketService.emitUserActivity({
        action: "logout",
        user: user.username || user.steamName || user._id.toString(),
        timestamp: new Date().toISOString(),
      });
    }

    // ... existing response code ...
  } catch (error) {
    // ... existing error handling ...
  }
};
