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
const getUsers = async (req, res) => {
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

// Get platform statistics
const getStatistics = async (req, res) => {
  try {
    console.log("Fetching statistics for admin dashboard");

    // Get total users count
    const usersCount = await User.countDocuments();

    // Get users who logged in within the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersCount = await User.countDocuments({
      lastLoginAt: { $gte: last24Hours },
    });

    // Get new users in the last 24 hours
    const newUsers24h = await User.countDocuments({
      createdAt: { $gte: last24Hours },
    });

    // Get total items count
    const itemsCount = await Item.countDocuments();

    // Get new items in the last 24 hours
    const newItems24h = await Item.countDocuments({
      createdAt: { $gte: last24Hours },
    });

    // Get trades count
    const tradesCount = await Trade.countDocuments();

    // Get completed trades count
    const completedTradesCount = await Trade.countDocuments({
      status: "completed",
    });

    // Calculate total value of all completed trades
    const completedTrades = await Trade.find({ status: "completed" });
    const totalValue = completedTrades.reduce(
      (sum, trade) => sum + (trade.price || 0),
      0
    );

    console.log("Statistics fetched successfully");

    res.status(200).json({
      usersCount,
      activeUsersCount,
      newUsers24h,
      itemsCount,
      newItems24h,
      tradesCount,
      completedTradesCount,
      totalValue,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  isAdmin,
  checkAdminStatus,
  banUser,
  unbanUser,
  getStatistics,
  // getUsers is exported directly via exports.getUsers
};
