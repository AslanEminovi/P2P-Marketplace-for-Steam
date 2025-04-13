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
    const users = await User.aggregate([
      {
        $lookup: {
          from: "items",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$owner", "$$userId"] },
              },
            },
            { $count: "count" },
          ],
          as: "itemsCount",
        },
      },
      {
        $lookup: {
          from: "trades",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$buyer", "$$userId"] },
                    { $eq: ["$seller", "$$userId"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "tradesCount",
        },
      },
      {
        $lookup: {
          from: "trades",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$buyer", "$$userId"] },
                        { $eq: ["$seller", "$$userId"] },
                      ],
                    },
                    { $eq: ["$status", "completed"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "completedTradesCount",
        },
      },
      {
        $addFields: {
          itemCount: {
            $ifNull: [{ $arrayElemAt: ["$itemsCount.count", 0] }, 0],
          },
          tradeCount: {
            $ifNull: [{ $arrayElemAt: ["$tradesCount.count", 0] }, 0],
          },
          completedTradeCount: {
            $ifNull: [{ $arrayElemAt: ["$completedTradesCount.count", 0] }, 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          steamid: 1,
          avatarUrl: 1,
          banned: 1,
          isAdmin: 1,
          createdAt: 1,
          lastLogin: 1,
          lastActive: 1,
          itemCount: 1,
          tradeCount: 1,
          completedTradeCount: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
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

    user.banned = true;
    await user.save();

    // Log activity
    console.log(
      `Admin ${req.user.username} (${req.user._id}) banned user ${user.username} (${user._id})`
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

    user.banned = false;
    await user.save();

    // Log activity
    console.log(
      `Admin ${req.user.username} (${req.user._id}) unbanned user ${user.username} (${user._id})`
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
    // Get total users count
    const usersCount = await User.countDocuments();

    // Get users who logged in within the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersCount = await User.countDocuments({
      lastActive: { $gte: last24Hours },
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
  getUsers,
  banUser,
  unbanUser,
  getStatistics,
};
