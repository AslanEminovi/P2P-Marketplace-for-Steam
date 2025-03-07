const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middlewares/authMiddleware");
const { cleanupStuckListings } = require("../cleanup_listings");
const mongoose = require("mongoose");

// Middleware to ensure the user is authenticated and has admin privileges
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   POST /admin/cleanup-listings
 * @desc    Clean up all stuck listings
 * @access  Admin
 */
router.post("/cleanup-listings", async (req, res) => {
  try {
    const results = await cleanupStuckListings();
    res.json(results);
  } catch (error) {
    console.error("Error in cleanup-listings route:", error);
    res.status(500).json({ error: "Failed to cleanup listings" });
  }
});

/**
 * @route   POST /admin/cleanup-listings/:userId
 * @desc    Clean up stuck listings for a specific user
 * @access  Admin
 */
router.post("/cleanup-listings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await cleanupStuckListings(userId);
    res.json(results);
  } catch (error) {
    console.error("Error in cleanup-listings/:userId route:", error);
    res.status(500).json({ error: "Failed to cleanup user listings" });
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

module.exports = router;
