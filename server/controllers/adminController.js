const axios = require("axios");
const User = require("../models/User");
const Item = require("../models/Item");
const Trade = require("../models/Trade");
const mongoose = require("mongoose");

/**
 * Check if the Steam Web API key is valid
 * @route GET /admin/check-api-keys
 * @access Admin
 */
exports.checkApiKeys = async (req, res) => {
  try {
    const results = {
      steamWebApi: { valid: false, message: "" },
      steamApi: { valid: false, message: "" },
    };

    // Check Steam Web API key
    const steamWebApiKey = process.env.STEAMWEBAPI_KEY;
    if (!steamWebApiKey) {
      results.steamWebApi.message =
        "STEAMWEBAPI_KEY is not set in environment variables";
    } else {
      try {
        // Try to make a test request to check if the key is valid
        const testUrl = `https://www.steamwebapi.com/steam/api/info`;
        const response = await axios.get(testUrl, {
          params: { key: steamWebApiKey },
          timeout: 5000,
        });

        if (response.data && !response.data.error) {
          results.steamWebApi.valid = true;
          results.steamWebApi.message = "API key is valid";
        } else {
          results.steamWebApi.message =
            response.data?.error || "Unknown API error";
        }
      } catch (err) {
        results.steamWebApi.message = err.response?.data?.error || err.message;
      }
    }

    // Check Steam API key
    const steamApiKey = process.env.STEAM_API_KEY;
    if (!steamApiKey) {
      results.steamApi.message =
        "STEAM_API_KEY is not set in environment variables";
    } else {
      try {
        // Try to make a test request to check if the key is valid
        const testUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`;
        const response = await axios.get(testUrl, {
          params: {
            key: steamApiKey,
            steamids: "76561198106757508", // Example Steam ID
          },
          timeout: 5000,
        });

        if (response.data && response.data.response) {
          results.steamApi.valid = true;
          results.steamApi.message = "API key is valid";
        } else {
          results.steamApi.message = "Invalid response format from Steam API";
        }
      } catch (err) {
        results.steamApi.message = err.response?.data?.error || err.message;
      }
    }

    // Return the results
    res.json({
      success: true,
      results,
      keySummary: {
        steamWebApiKeySet: !!steamWebApiKey,
        steamWebApiKeyValid: results.steamWebApi.valid,
        steamApiKeySet: !!steamApiKey,
        steamApiKeyValid: results.steamApi.valid,
      },
    });
  } catch (error) {
    console.error("Error checking API keys:", error);
    res.status(500).json({ error: "Failed to check API keys" });
  }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - Not logged in" });
    }

    // Check if user has admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Forbidden - Not an admin" });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ error: "Server error during admin authentication" });
  }
};

// Check if current user is admin
const checkAdminStatus = async (req, res) => {
  try {
    // User is already verified by isAdmin middleware
    return res.status(200).json({ isAdmin: true });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    console.log("⭐ Admin dashboard: getUsers called");

    // First try a simple query to make sure we can retrieve users
    const userCount = await User.countDocuments();
    console.log(`📊 Total user count from simple query: ${userCount}`);

    // Get all users with a simpler query first
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        "steamId displayName avatar avatarMedium avatarFull createdAt lastLogin lastLoginAt isAdmin isBanned balance email tradeUrl"
      );

    console.log(`✅ Found ${users.length} users with direct query`);

    if (users.length > 0) {
      console.log("First user from direct query:", {
        id: users[0]._id,
        displayName: users[0].displayName,
        steamId: users[0].steamId,
        avatar: users[0].avatar ? "exists" : "missing",
        avatarMedium: users[0].avatarMedium ? "exists" : "missing",
        avatarFull: users[0].avatarFull ? "exists" : "missing",
      });
    } else {
      console.log("❌ No users found with direct query");
    }

    // Add additional data for each user
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        // Convert Mongoose document to plain object
        const userObj = user.toObject();

        // Get item count for this user
        const itemCount = await Item.countDocuments({ owner: user._id });

        // Get trade counts
        const tradeCount = await Trade.countDocuments({
          $or: [{ buyer: user._id }, { seller: user._id }],
        });

        const completedTradeCount = await Trade.countDocuments({
          $or: [{ buyer: user._id }, { seller: user._id }],
          status: "completed",
        });

        // Make sure lastActive is set to something
        const lastActive = user.lastLoginAt || user.lastLogin || user.createdAt;

        // Return enhanced user object
        return {
          ...userObj,
          itemCount,
          tradeCount,
          completedTradeCount,
          lastActive,
        };
      })
    );

    console.log(`✅ Enhanced ${enhancedUsers.length} users with counts`);

    res.status(200).json(enhancedUsers);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
};

// Ban a user
const banUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot ban an admin user" });
    }

    user.isBanned = true;
    user.banReason = "Admin action"; // Optional reason
    await user.save();

    // Log activity
    console.log(
      `Admin ${req.user.displayName || req.user._id} banned user ${
        user.displayName || user._id
      }`
    );

    res.status(200).json({ message: "User banned successfully", userId });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Unban a user
const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isBanned = false;
    user.banReason = "";
    await user.save();

    // Log activity
    console.log(
      `Admin ${req.user.displayName || req.user._id} unbanned user ${
        user.displayName || user._id
      }`
    );

    res.status(200).json({ message: "User unbanned successfully", userId });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get basic system statistics
 * @route GET /admin/statistics
 * @access Admin
 */
exports.getStatistics = async (req, res) => {
  try {
    // Get counts of users, items, trades
    const usersCount = await User.countDocuments();
    const itemsCount = await Item.countDocuments({ isListed: true });
    const tradesCount = await Trade.countDocuments();
    const completedTradesCount = await Trade.countDocuments({
      status: "completed",
    });

    // Get counts of active users (logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsersCount = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo },
    });

    // Get counts of new users and items in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const newUsers24h = await User.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
    });

    const newItems24h = await Item.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
      isListed: true,
    });

    // Calculate total value of all listed items
    const totalValuePipeline = await Item.aggregate([
      { $match: { isListed: true } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const totalValue =
      totalValuePipeline.length > 0 ? totalValuePipeline[0].total : 0;

    return res.json({
      usersCount,
      activeUsersCount,
      itemsCount,
      tradesCount,
      completedTradesCount,
      totalValue,
      newUsers24h,
      newItems24h,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting admin statistics:", error);
    return res.status(500).json({ error: "Failed to get statistics" });
  }
};

/**
 * Check if the current user is an admin
 * @route GET /admin/check
 * @access Public
 */
exports.checkAdmin = async (req, res) => {
  try {
    // If no user is logged in
    if (!req.user) {
      console.log("No user found in request, not an admin");
      return res.json({ isAdmin: false });
    }

    console.log(
      `Checking admin status for user: ${req.user._id} (${req.user.displayName})`
    );

    // For security, recheck from the database
    const user = await User.findById(req.user._id);

    if (!user) {
      console.log("User not found in database");
      return res.json({ isAdmin: false });
    }

    // If user exists but isAdmin is not explicitly true, return false
    if (!user.isAdmin) {
      console.log(`User ${user._id} (${user.displayName}) is not an admin`);
      return res.json({ isAdmin: false });
    }

    console.log(`User ${user._id} (${user.displayName}) is confirmed as admin`);
    return res.json({ isAdmin: true });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ error: "Server error", isAdmin: false });
  }
};

module.exports = {
  isAdmin,
  checkAdminStatus,
  getUsers,
  banUser,
  unbanUser,
  getStatistics,
  checkAdmin,
};
