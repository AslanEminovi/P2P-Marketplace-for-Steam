const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authMiddleware");
const { cleanupStuckListings } = require("../cleanup_listings");
const mongoose = require("mongoose");
const axios = require("axios");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const User = require("../models/User");
const { getUserStatus } = require("../services/socketService");
const UserStatusManager = require("../services/UserStatusManager");

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
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build search filter
    const searchFilter = search
      ? {
          $or: [
            { displayName: { $regex: search, $options: "i" } },
            { steamId: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Get total count
    const total = await User.countDocuments(searchFilter);

    // Get paginated users with all profile fields
    const users = await User.find(searchFilter)
      .select(
        "_id steamId displayName avatar firstName lastName email phone country city profileComplete isAdmin isBanned createdAt lastLogin"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${users.length} users matching search "${search}"`);

    // Log the first user's profile info for debugging
    if (users.length > 0) {
      console.log("Sample user profile data:", {
        id: users[0]._id,
        name: users[0].displayName,
        profileComplete: users[0].profileComplete,
        hasName: !!(users[0].firstName || users[0].lastName),
        hasEmail: !!users[0].email,
        hasPhone: !!users[0].phone,
      });
    }

    // Add real-time status to each user
    const usersWithStatus = users.map((user) => ({
      ...user,
      status: getUserStatus(user._id.toString()),
    }));

    res.json({
      users: usersWithStatus,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
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
    const userStatusManager = require("../services/UserStatusManager");

    const usersCount = await User.countDocuments();
    const itemsCount = await Item.countDocuments({ isListed: true });
    const tradesCount = await Trade.countDocuments();
    const completedTradesCount = await Trade.countDocuments({
      status: "completed",
    });

    // Get online user counts directly from UserStatusManager
    const userCounts = userStatusManager.getUserCounts();
    const activeUsersCount = userCounts.authenticated;

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

/**
 * @route   GET /admin/user-inventory-value/:steamId
 * @desc    Get just the total value of a user's inventory (lightweight)
 * @access  Admin
 */
router.get("/user-inventory-value/:steamId", async (req, res) => {
  try {
    const { steamId } = req.params;

    if (!steamId) {
      return res.status(400).json({ error: "Steam ID is required" });
    }

    // Find the user by steamId first
    const User = mongoose.model("User");
    const user = await User.findOne({ steamId }).lean();

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found with that Steam ID", totalValue: 0 });
    }

    // Find the user's items in our system
    const Item = mongoose.model("Item");
    const userItems = await Item.find({
      ownerId: user._id,
      owner: user._id,
    }).lean();

    // Calculate total value
    const totalValue = userItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0);
    }, 0);

    console.log(
      `Total inventory value for user ${steamId}: $${totalValue.toFixed(2)}`
    );

    res.json({
      totalValue,
      itemCount: userItems.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error calculating inventory value:", error);
    res
      .status(500)
      .json({ error: "Failed to calculate inventory value", totalValue: 0 });
  }
});

/**
 * @route   POST /admin/users/:userId/role
 * @desc    Add or remove user role (admin/moderator)
 * @access  Admin
 */
router.post("/users/:userId/role", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, action } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!role || !["admin", "moderator"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Valid role (admin/moderator) is required" });
    }

    if (!action || !["add", "remove"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Valid action (add/remove) is required" });
    }

    // Validate the userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Make sure admin isn't removing their own admin role
    if (
      userId === req.user._id.toString() &&
      role === "admin" &&
      action === "remove"
    ) {
      return res
        .status(400)
        .json({ error: "You cannot remove your own admin role" });
    }

    // Get the User model
    const User = mongoose.model("User");

    // Update field depends on the role
    const updateField = role === "admin" ? "isAdmin" : "isModerator";
    const updateValue = action === "add";

    // Update the user's role
    const updateData = {};
    updateData[updateField] = updateValue;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-refreshToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `Admin ${req.user.displayName} (${req.user._id}) ${action}ed ${role} role for user ${user.displayName} (${user._id})`
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
      },
    });
  } catch (error) {
    console.error("Error changing user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Add the Redis-to-DB sync route
router.post("/sync-trades", requireAdmin, async (req, res) => {
  try {
    // Import the trade service
    const tradeService = require("../services/tradeService");

    // Call the sync function
    await tradeService.syncTradeStatsWithDB();

    res.json({
      success: true,
      message: "Trade statistics synchronized with database",
    });
  } catch (error) {
    console.error("Error in /admin/sync-trades:", error);
    res.status(500).json({ error: "Failed to synchronize trade statistics" });
  }
});

module.exports = router;
