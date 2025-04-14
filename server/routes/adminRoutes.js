const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authMiddleware");
const { cleanupStuckListings } = require("../cleanup_listings");
const mongoose = require("mongoose");
const axios = require("axios");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");

// Define a route handler for admin check
// This should be before any auth middleware
router.get("/check", async (req, res) => {
  try {
    // If no user is logged in
    if (!req.user) {
      console.log("No user found in request, not an admin");
      return res.json({ isAdmin: false });
    }

    console.log(`Checking admin status for user: ${req.user._id}`);

    // For security, recheck from the database
    const User = mongoose.model("User");
    const user = await User.findById(req.user._id);

    if (!user) {
      console.log("User not found in database");
      return res.json({ isAdmin: false });
    }

    // If user exists but isAdmin is not explicitly true, return false
    if (!user.isAdmin) {
      console.log(`User ${user._id} is not an admin`);
      return res.json({ isAdmin: false });
    }

    console.log(`User ${user._id} is confirmed as admin`);
    return res.json({ isAdmin: true });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ error: "Server error", isAdmin: false });
  }
});

// Now apply authentication middlewares to all subsequent routes
router.use(auth.isAuthenticated);

// Only apply the admin check after the /check route
router.use((req, res, next) => {
  console.log("Checking admin status for protected route");
  if (!req.user || !req.user.isAdmin) {
    console.log("Access denied to admin route:", req.path);
    return res.status(403).json({ error: "Admin access required" });
  }
  console.log("Admin access granted for route:", req.path);
  next();
});

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
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const User = mongoose.model("User");

    // Build search filter
    const searchFilter = search
      ? {
          $or: [
            { displayName: { $regex: search, $options: "i" } },
            { steamId: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Get paginated users
    const users = await User.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("steamId displayName avatar createdAt lastLogin isAdmin balance");

    // Get total count
    const total = await User.countDocuments(searchFilter);

    res.json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

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
router.get("/stats", async (req, res) => {
  try {
    const User = mongoose.model("User");
    const Item = mongoose.model("Item");
    const Trade = mongoose.model("Trade");

    // Get counts
    const userCount = await User.countDocuments();
    const itemCount = await Item.countDocuments();
    const listedItemCount = await Item.countDocuments({ isListed: true });
    const completedTradeCount = await Trade.countDocuments({
      status: "completed",
    });
    const pendingTradeCount = await Trade.countDocuments({ status: "pending" });

    // Get recent user registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUserCount = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get trade volume (last 7 days)
    const recentTrades = await Trade.find({
      createdAt: { $gte: sevenDaysAgo },
      status: "completed",
    });

    const tradeVolume = recentTrades.reduce(
      (sum, trade) => sum + (trade.price || 0),
      0
    );

    res.json({
      users: {
        total: userCount,
        newLast7Days: newUserCount,
      },
      items: {
        total: itemCount,
        listed: listedItemCount,
      },
      trades: {
        completed: completedTradeCount,
        pending: pendingTradeCount,
        volumeLast7Days: tradeVolume,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting system stats:", error);
    res.status(500).json({ error: "Failed to get system statistics" });
  }
});

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

// Statistics route
router.get("/statistics", async (req, res) => {
  try {
    // Get counts of users, items, trades
    const User = mongoose.model("User");
    const Item = mongoose.model("Item");
    const Trade = mongoose.model("Trade");

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
});

// Users route
router.get("/users", async (req, res) => {
  try {
    console.log("⭐ Admin dashboard: getUsers called");

    const User = mongoose.model("User");
    const Item = mongoose.model("Item");
    const Trade = mongoose.model("Trade");

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
});

module.exports = router;
