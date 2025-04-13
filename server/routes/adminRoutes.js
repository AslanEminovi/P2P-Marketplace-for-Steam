const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const { cleanupStuckListings } = require("../cleanup_listings");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");

// Apply authentication middleware to all admin routes
router.use(auth.isAuthenticated);

/**
 * @route   GET /admin/status
 * @desc    Get service status
 * @access  Admin
 */
router.get("/status", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    adminUser: req.user.displayName,
  });
});

/**
 * @route   POST /admin/cleanup-marketplace
 * @desc    Clean up all marketplace listings and trades
 * @access  Admin
 */
router.post("/cleanup-marketplace", async (req, res) => {
  try {
    console.log(
      `Admin ${req.user._id} (${req.user.displayName}) initiated marketplace cleanup`
    );

    // Run the cleanup function
    const result = await cleanupStuckListings();

    console.log("Cleanup completed successfully:", result);

    return res.json({
      success: true,
      message: "Marketplace cleanup completed successfully",
      itemsUpdated: result.itemsUpdated,
      tradesUpdated: result.tradesUpdated,
    });
  } catch (error) {
    console.error("Error during admin cleanup:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete marketplace cleanup",
      error: error.message,
    });
  }
});

/**
 * @route   POST /admin/cleanup-user/:userId
 * @desc    Clean up listings and trades for a specific user
 * @access  Admin
 */
router.post("/cleanup-user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Admin ${req.user._id} initiated cleanup for user ${userId}`);

    // Run the cleanup function for specific user
    const result = await cleanupStuckListings(userId);

    return res.json({
      success: true,
      message: `Cleanup for user ${userId} completed successfully`,
      itemsUpdated: result.itemsUpdated,
      tradesUpdated: result.tradesUpdated,
    });
  } catch (error) {
    console.error(
      `Error during admin cleanup for user ${req.params.userId}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to complete user cleanup",
      error: error.message,
    });
  }
});

/**
 * @route   GET /admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin
 */
// REMOVING THIS DUPLICATE ROUTE - Using the controller version below
// router.get("/users", async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const search = req.query.search || "";

//     const User = mongoose.model("User");

//     // Build search filter
//     const searchFilter = search
//       ? {
//           $or: [
//             { displayName: { $regex: search, $options: "i" } },
//             { steamId: { $regex: search, $options: "i" } },
//             { email: { $regex: search, $options: "i" } },
//           ],
//         }
//       : {};

//     // Get paginated users
//     const users = await User.find(searchFilter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select("steamId displayName avatar createdAt lastLogin isAdmin balance");

//     // Get total count
//     const total = await User.countDocuments(searchFilter);

//     res.json({
//       users,
//       pagination: {
//         total,
//         page,
//         pages: Math.ceil(total / limit),
//         limit,
//       },
//     });
//   } catch (error) {
//     console.error("Error getting users:", error);
//     res.status(500).json({ error: "Failed to get users" });
//   }
// });

/**
 * @route   GET /admin/users/:userId
 * @desc    Get a single user by ID with their listings and trades
 * @access  Admin
 */
router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const User = mongoose.model("User");
    const Item = mongoose.model("Item");
    const Trade = mongoose.model("Trade");

    // Get user
    const user = await User.findById(userId).select("-refreshToken");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's items
    const items = await Item.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's trades
    const trades = await Trade.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      user,
      items,
      trades,
    });
  } catch (error) {
    console.error("Error getting user details:", error);
    res.status(500).json({ error: "Failed to get user details" });
  }
});

/**
 * @route   PUT /admin/users/:userId
 * @desc    Update a user (admin, ban status, etc)
 * @access  Admin
 */
router.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin, isBanned, banReason } = req.body;

    const User = mongoose.model("User");

    // Prevent self-demotion for safety
    if (userId === req.user.id && isAdmin === false) {
      return res
        .status(400)
        .json({ error: "You cannot remove your own admin privileges" });
    }

    const updateData = {};
    if (typeof isAdmin === "boolean") updateData.isAdmin = isAdmin;
    if (typeof isBanned === "boolean") updateData.isBanned = isBanned;
    if (isBanned && banReason) updateData.banReason = banReason;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-refreshToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * @route   GET /admin/stats
 * @desc    Get system statistics
 * @access  Admin
 */
// REMOVING THIS DUPLICATE ROUTE - Using the controller's statistics route below
// router.get("/stats", async (req, res) => {
//   try {
//     const User = mongoose.model("User");
//     const Item = mongoose.model("Item");
//     const Trade = mongoose.model("Trade");

//     // Get counts
//     const userCount = await User.countDocuments();
//     const itemCount = await Item.countDocuments();
//     const listedItemCount = await Item.countDocuments({ isListed: true });
//     const completedTradeCount = await Trade.countDocuments({
//       status: "completed",
//     });
//     const pendingTradeCount = await Trade.countDocuments({ status: "pending" });

//     // Get recent user registrations (last 7 days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const newUserCount = await User.countDocuments({
//       createdAt: { $gte: sevenDaysAgo },
//     });

//     // Get trade volume (last 7 days)
//     const recentTrades = await Trade.find({
//       createdAt: { $gte: sevenDaysAgo },
//       status: "completed",
//     });

//     const tradeVolume = recentTrades.reduce(
//       (sum, trade) => sum + (trade.price || 0),
//       0
//     );

//     res.json({
//       users: {
//         total: userCount,
//         newLast7Days: newUserCount,
//       },
//       items: {
//         total: itemCount,
//         listed: listedItemCount,
//       },
//       trades: {
//         completed: completedTradeCount,
//         pending: pendingTradeCount,
//         volumeLast7Days: tradeVolume,
//       },
//       timestamp: new Date(),
//     });
//   } catch (error) {
//     console.error("Error getting system stats:", error);
//     res.status(500).json({ error: "Failed to get system statistics" });
//   }
// });

/**
 * @route   GET /admin/items
 * @desc    Get all items with pagination and filtering
 * @access  Admin
 */
router.get("/items", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const isListed = req.query.isListed === "true";

    const Item = mongoose.model("Item");

    // Build filter
    const filter = {};
    if (search) {
      filter.marketHashName = { $regex: search, $options: "i" };
    }
    if (req.query.isListed !== undefined) {
      filter.isListed = isListed;
    }

    // Get paginated items
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "displayName steamId");

    // Get total count
    const total = await Item.countDocuments(filter);

    res.json({
      items,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error getting items:", error);
    res.status(500).json({ error: "Failed to get items" });
  }
});

/**
 * @route   POST /admin/clear-sessions
 * @desc    Clear all user sessions which might be caching trade data
 * @access  Admin
 */
router.post("/clear-sessions", async (req, res) => {
  try {
    // Get the User model
    const User = mongoose.model("User");

    // Update all users to invalidate their sessions
    const result = await User.updateMany(
      {},
      {
        $set: {
          refreshToken: null,
          sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 0] }, 1] },
        },
      }
    );

    // Clear any session data in the trade system
    const clearCacheResponse = await axios
      .post(`${process.env.CLIENT_URL}/api/clear-cache`, {
        secret: process.env.ADMIN_API_SECRET,
      })
      .catch((err) => {
        console.log("Cache clearing API not available or error:", err.message);
        return { status: "api-error", message: err.message };
      });

    res.json({
      success: true,
      message: `Sessions cleared for ${result.modifiedCount} users.`,
      cacheCleared: clearCacheResponse?.status === "success",
      details: result,
    });
  } catch (error) {
    console.error("Error clearing sessions:", error);
    res.status(500).json({ error: "Failed to clear user sessions" });
  }
});

/**
 * @route   GET /admin/check-api-keys
 * @desc    Check if Steam API keys are valid
 * @access  Admin
 */
router.get("/check-api-keys", async (req, res) => {
  try {
    await adminController.checkApiKeys(req, res);
  } catch (error) {
    console.error("Error checking API keys:", error);
    res.status(500).json({ error: "Failed to check API keys" });
  }
});

// Admin status check
router.get("/check", async (req, res) => {
  try {
    const isAdmin = req.user && req.user.isAdmin === true;
    return res.status(200).json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// User management routes
router.get("/users", auth.isAdmin, adminController.getUsers);
router.post("/users/:userId/ban", auth.isAdmin, adminController.banUser);
router.post("/users/:userId/unban", auth.isAdmin, adminController.unbanUser);

// Statistics route
router.get("/statistics", auth.isAdmin, adminController.getStatistics);

module.exports = router;
