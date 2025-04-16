const User = require("../models/User");

// GET /user/profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with full profile data
    const user = await User.findById(userId).select("-steamLoginSecure");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return sanitized user data
    return res.json({
      id: user._id,
      steamId: user.steamId,
      displayName: user.displayName,
      avatar: user.avatar,
      avatarMedium: user.avatarMedium,
      avatarFull: user.avatarFull,
      email: user.email,
      phone: user.phone,
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
    const userId = req.user._id;
    const {
      displayName,
      email,
      phone,
      firstName,
      lastName,
      country,
      city,
      tradeUrl,
      settings,
    } = req.body;

    console.log(
      `Updating settings for user ${userId}:`,
      JSON.stringify(
        {
          displayName,
          email,
          phone,
          firstName,
          lastName,
          country,
          city,
          tradeUrl,
          settings,
        },
        null,
        2
      )
    );

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Keep track of which fields were updated
    const updatedFields = [];

    // Update fields if provided
    if (displayName !== undefined) {
      user.displayName = displayName;
      updatedFields.push("displayName");
    }
    if (email !== undefined) {
      user.email = email;
      updatedFields.push("email");
    }
    if (phone !== undefined) {
      user.phone = phone;
      updatedFields.push("phone");
    }
    if (firstName !== undefined) {
      user.firstName = firstName;
      updatedFields.push("firstName");
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
      updatedFields.push("lastName");
    }
    if (country !== undefined) {
      user.country = country;
      updatedFields.push("country");
    }
    if (city !== undefined) {
      user.city = city;
      updatedFields.push("city");
    }
    if (tradeUrl !== undefined) {
      user.tradeUrl = tradeUrl;
      updatedFields.push("tradeUrl");
      // Set trade URL expiry to 30 days from now
      user.tradeUrlExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Mark profile as complete if basic information is provided
    if ((firstName || lastName) && email) {
      user.profileComplete = true;
      updatedFields.push("profileComplete");
    }

    // Update settings if provided
    if (settings) {
      // Create settings object if it doesn't exist
      if (!user.settings) user.settings = {};

      // Update currency preference
      if (settings.currency) {
        if (!["USD", "GEL"].includes(settings.currency)) {
          return res.status(400).json({ error: "Invalid currency setting" });
        }
        user.settings.currency = settings.currency;
        updatedFields.push("settings.currency");
      }

      // Update theme preference
      if (settings.theme) {
        if (!["light", "dark"].includes(settings.theme)) {
          return res.status(400).json({ error: "Invalid theme setting" });
        }
        user.settings.theme = settings.theme;
        updatedFields.push("settings.theme");
      }

      // Update privacy settings
      if (settings.privacy) {
        // Create privacy object if it doesn't exist
        if (!user.settings.privacy) user.settings.privacy = {};

        if (settings.privacy.showOnlineStatus !== undefined) {
          user.settings.privacy.showOnlineStatus =
            !!settings.privacy.showOnlineStatus;
          updatedFields.push("settings.privacy.showOnlineStatus");
        }

        if (settings.privacy.showInventoryValue !== undefined) {
          user.settings.privacy.showInventoryValue =
            !!settings.privacy.showInventoryValue;
          updatedFields.push("settings.privacy.showInventoryValue");
        }
      }

      // Update notification settings
      if (settings.notifications) {
        // Create notifications object if it doesn't exist
        if (!user.settings.notifications) user.settings.notifications = {};

        if (settings.notifications.email !== undefined) {
          user.settings.notifications.email = !!settings.notifications.email;
          updatedFields.push("settings.notifications.email");
        }

        if (settings.notifications.push !== undefined) {
          user.settings.notifications.push = !!settings.notifications.push;
          updatedFields.push("settings.notifications.push");
        }

        if (settings.notifications.offers !== undefined) {
          user.settings.notifications.offers = !!settings.notifications.offers;
          updatedFields.push("settings.notifications.offers");
        }

        if (settings.notifications.trades !== undefined) {
          user.settings.notifications.trades = !!settings.notifications.trades;
          updatedFields.push("settings.notifications.trades");
        }

        if (settings.notifications.market !== undefined) {
          user.settings.notifications.market = !!settings.notifications.market;
          updatedFields.push("settings.notifications.market");
        }

        if (settings.notifications.pricing !== undefined) {
          user.settings.notifications.pricing =
            !!settings.notifications.pricing;
          updatedFields.push("settings.notifications.pricing");
        }
      }

      // Update security settings
      if (settings.security) {
        // Create security object if it doesn't exist
        if (!user.settings.security) user.settings.security = {};

        if (settings.security.twoFactorAuth !== undefined) {
          user.settings.security.twoFactorAuth =
            !!settings.security.twoFactorAuth;
          updatedFields.push("settings.security.twoFactorAuth");
        }

        if (settings.security.loginNotifications !== undefined) {
          user.settings.security.loginNotifications =
            !!settings.security.loginNotifications;
          updatedFields.push("settings.security.loginNotifications");
        }
      }
    }

    // Save the updated user
    const savedUser = await user.save();
    console.log(
      `User ${userId} settings updated successfully. Updated fields: ${updatedFields.join(
        ", "
      )}`
    );

    // Return complete updated user data
    return res.json({
      success: true,
      message: "User settings updated successfully",
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
        tradeUrl: savedUser.tradeUrl,
        tradeUrlExpiry: savedUser.tradeUrlExpiry,
        profileComplete: savedUser.profileComplete,
        verificationLevel: savedUser.verificationLevel,
        avatar: savedUser.avatar,
        avatarMedium: savedUser.avatarMedium,
        avatarFull: savedUser.avatarFull,
        walletBalance: savedUser.walletBalance,
        walletBalanceGEL: savedUser.walletBalanceGEL,
        settings: savedUser.settings,
      },
      updatedFields,
    });
  } catch (err) {
    console.error("Update user settings error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update user settings", details: err.message });
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
