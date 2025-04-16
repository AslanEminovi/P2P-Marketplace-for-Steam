const User = require("../models/User");

// GET /user/profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Getting profile for user:", userId);

    // Always get fresh data from database with no caching
    const user = await User.findById(userId)
      .select("-steamLoginSecure -refreshToken -passwordHash")
      .lean(); // Use lean() for better performance

    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Retrieved user profile successfully");

    // Return sanitized user data
    return res.json({
      id: user._id,
      steamId: user.steamId,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      avatarMedium: user.avatarMedium,
      avatarFull: user.avatarFull,
      email: user.email,
      phone: user.phone,
      country: user.country,
      city: user.city,
      tradeUrl: user.tradeUrl,
      tradeUrlExpiry: user.tradeUrlExpiry,
      walletBalance: user.walletBalance,
      walletBalanceGEL: user.walletBalanceGEL,
      isVerified: user.isVerified,
      verificationLevel: user.verificationLevel,
      settings: user.settings,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (err) {
    console.error("Get user profile error:", err);
    return res.status(500).json({ error: "Failed to retrieve user profile" });
  }
};

// PUT /user/settings
exports.updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Updating settings for user:", userId);
    console.log("User object from request:", req.user);

    // Get user data from request
    const {
      firstName,
      lastName,
      email,
      phone,
      country,
      city,
      avatarUrl,
      settings,
    } = req.body;

    console.log("Received user data:", req.body);

    // Find the user with fresh data from database, not cached version
    const user = await User.findById(userId).select("-refreshToken").lean();

    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    // Create update object with only the fields that were provided
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // Update settings if provided
    if (settings) {
      // Initialize settings object if it doesn't exist
      updateData.settings = user.settings || {};

      // Update currency preference
      if (settings.currency) {
        updateData.settings.currency = settings.currency;
      }

      // Update theme preference
      if (settings.theme) {
        updateData.settings.theme = settings.theme;
      }

      // Update privacy settings
      if (settings.privacy) {
        if (!updateData.settings.privacy) {
          updateData.settings.privacy = {};
        }

        // Only update fields that were provided
        if (settings.privacy.showOnlineStatus !== undefined) {
          updateData.settings.privacy.showOnlineStatus =
            settings.privacy.showOnlineStatus;
        }

        if (settings.privacy.showInventoryValue !== undefined) {
          updateData.settings.privacy.showInventoryValue =
            settings.privacy.showInventoryValue;
        }
      }

      // Update notification settings
      if (settings.notifications) {
        if (!updateData.settings.notifications) {
          updateData.settings.notifications = {};
        }

        // Only update fields that were provided
        if (settings.notifications.email !== undefined) {
          updateData.settings.notifications.email =
            settings.notifications.email;
        }

        if (settings.notifications.push !== undefined) {
          updateData.settings.notifications.push = settings.notifications.push;
        }

        if (settings.notifications.offers !== undefined) {
          updateData.settings.notifications.offers =
            settings.notifications.offers;
        }

        if (settings.notifications.trades !== undefined) {
          updateData.settings.notifications.trades =
            settings.notifications.trades;
        }
      }
    }

    console.log("Updating user with data:", updateData);

    // Update user with findOneAndUpdate to get the updated document back
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators on update
      }
    ).select("-refreshToken -passwordHash");

    if (!updatedUser) {
      console.error("Failed to update user:", userId);
      return res.status(500).json({ error: "Failed to update user" });
    }

    console.log("User settings updated successfully");

    // Force cache invalidation if using a token cache
    if (global.tokenCache) {
      console.log("Invalidating token cache for user:", userId);
      // Iterate through all tokens in the cache and remove any associated with this user
      for (const [token, cachedUser] of global.tokenCache.entries()) {
        if (cachedUser._id.toString() === userId.toString()) {
          global.tokenCache.delete(token);
          console.log("Invalidated cached token for user:", userId);
        }
      }
    }

    // Return success response with updated user
    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({
      error: "Failed to update settings",
      details: error.message,
    });
  }
};

// PUT /user/notifications
exports.updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { settings } = req.body;

    if (!settings) {
      return res
        .status(400)
        .json({ error: "Notification settings are required" });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create settings.notifications object if it doesn't exist
    if (!user.settings) user.settings = {};
    if (!user.settings.notifications) user.settings.notifications = {};

    // Update notification settings
    if (settings.email !== undefined) {
      user.settings.notifications.email = !!settings.email;
    }

    if (settings.push !== undefined) {
      user.settings.notifications.push = !!settings.push;
    }

    if (settings.offers !== undefined) {
      user.settings.notifications.offers = !!settings.offers;
    }

    if (settings.trades !== undefined) {
      user.settings.notifications.trades = !!settings.trades;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Notification settings updated successfully",
      settings: user.settings.notifications,
    });
  } catch (err) {
    console.error("Update notification settings error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update notification settings" });
  }
};

// PUT /user/notifications/read
exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationIds, markAll } = req.body;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Mark specific notifications as read
    if (notificationIds && Array.isArray(notificationIds)) {
      for (const notifId of notificationIds) {
        const notification = user.notifications.id(notifId);
        if (notification) {
          notification.read = true;
        }
      }
    }

    // Mark all notifications as read
    if (markAll) {
      user.notifications.forEach((notification) => {
        notification.read = true;
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return res
      .status(500)
      .json({ error: "Failed to mark notifications as read" });
  }
};

// GET /user/notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { unreadOnly = false, limit = 20, offset = 0 } = req.query;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Filter notifications
    let notifications = [...user.notifications];

    // Filter by read status if requested
    if (unreadOnly === "true") {
      notifications = notifications.filter((n) => !n.read);
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Count unread notifications
    const unreadCount = user.notifications.filter((n) => !n.read).length;

    // Apply pagination
    const paginatedNotifications = notifications.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    return res.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      unreadCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("Get user notifications error:", err);
    return res.status(500).json({ error: "Failed to retrieve notifications" });
  }
};

// POST /user/complete-profile
exports.completeUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, email, phone, country, city } = req.body;

    console.log(`Completing profile for user ${userId} with data:`, req.body);

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (country) user.country = country;
    if (city) user.city = city;

    // Mark profile as complete
    user.profileComplete = true;

    // Set verification level to 1 (email verification) if email is provided
    if (email && user.verificationLevel === 0) {
      user.verificationLevel = 1;
    }

    // Save the user to database
    const savedUser = await user.save();
    console.log(
      `Profile completed for user ${userId}, profile complete status: ${savedUser.profileComplete}`
    );

    return res.json({
      success: true,
      message: "User profile completed successfully",
      user: {
        id: savedUser._id,
        steamId: savedUser.steamId,
        displayName: savedUser.displayName,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        phone: savedUser.phone,
        country: savedUser.country,
        city: savedUser.city,
        profileComplete: savedUser.profileComplete,
        verificationLevel: savedUser.verificationLevel,
        avatar: savedUser.avatar,
        avatarMedium: savedUser.avatarMedium,
        avatarFull: savedUser.avatarFull,
        walletBalance: savedUser.walletBalance,
        walletBalanceGEL: savedUser.walletBalanceGEL,
        isAdmin: savedUser.isAdmin,
        settings: savedUser.settings,
      },
    });
  } catch (err) {
    console.error("Complete user profile error:", err);
    return res
      .status(500)
      .json({ error: "Failed to complete user profile", details: err.message });
  }
};
