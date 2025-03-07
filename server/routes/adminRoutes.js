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
    console.log("Admin route: Starting cleanup for all listings");
    const results = await cleanupStuckListings();
    console.log("Cleanup results:", results);
    res.json(results);
  } catch (error) {
    console.error("Error in cleanup-listings route:", error);

    // Check for duplicate key error
    if (error.message && error.message.includes("E11000 duplicate key error")) {
      console.log(
        "Duplicate key error detected, will provide specific guidance"
      );
      return res.status(500).json({
        error: "Duplicate item detected in database",
        details:
          "There is a duplicate item in your database. The script has been updated to handle this. Please try again.",
        errorCode: "E11000",
      });
    }

    // Send more detailed error information
    res.status(500).json({
      error: "Failed to cleanup listings",
      details: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
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
    console.log(`Admin route: Starting cleanup for user ID: ${userId}`);
    const results = await cleanupStuckListings(userId);
    console.log("User cleanup results:", results);
    res.json(results);
  } catch (error) {
    console.error("Error in cleanup-listings/:userId route:", error);

    // Check for duplicate key error
    if (error.message && error.message.includes("E11000 duplicate key error")) {
      console.log(
        "Duplicate key error detected, will provide specific guidance"
      );
      return res.status(500).json({
        error: "Duplicate item detected in database",
        details:
          "There is a duplicate item in your database. The script has been updated to handle this. Please try again.",
        errorCode: "E11000",
      });
    }

    // Send more detailed error information
    res.status(500).json({
      error: "Failed to cleanup user listings",
      details: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
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
 * @route   POST /admin/items/:itemId/remove-listing
 * @desc    Remove a specific item listing
 * @access  Admin
 */
router.post("/items/:itemId/remove-listing", async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log(`Admin route: Removing listing for item ID: ${itemId}`);

    const Item = mongoose.model("Item");

    // Validate the item ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.error(`Invalid item ID format: ${itemId}`);
      return res.status(400).json({ error: "Invalid item ID format" });
    }

    const item = await Item.findById(itemId);

    if (!item) {
      console.error(`Item not found with ID: ${itemId}`);
      return res.status(404).json({ error: "Item not found" });
    }

    console.log(
      `Found item: ${item.marketHashName || "Unknown"}, Listed: ${
        item.isListed
      }`
    );

    // Update the item to not listed
    item.isListed = false;
    await item.save();
    console.log(`Successfully removed listing for item: ${item._id}`);

    res.json({
      success: true,
      message: "Item listing removed successfully",
      item,
    });
  } catch (error) {
    console.error("Error removing item listing:", error);
    // Send more detailed error information
    res.status(500).json({
      error: "Failed to remove item listing",
      details: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});

/**
 * @route   POST /admin/fix-glitched-item
 * @desc    Fix a specific glitched item by assetId
 * @access  Admin
 */
router.post("/fix-glitched-item", async (req, res) => {
  try {
    const { assetId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    console.log(`Admin route: Fixing glitched item with assetId: ${assetId}`);

    const Item = mongoose.model("Item");

    // Find all items with this assetId
    const items = await Item.find({ assetId });

    console.log(`Found ${items.length} items with assetId ${assetId}`);

    if (items.length === 0) {
      return res
        .status(404)
        .json({ error: "No items found with that Asset ID" });
    }

    // If there are multiple items with the same assetId, keep only one (the unlisted one)
    if (items.length > 1) {
      console.log(
        `Found ${items.length} duplicate items with assetId ${assetId}`
      );

      // First, ensure all are unlisted
      for (const item of items) {
        item.isListed = false;
        await item.save();
      }

      // Then delete all but one
      const keepItem = items[0];
      for (let i = 1; i < items.length; i++) {
        console.log(`Deleting duplicate item ${items[i]._id}`);
        await Item.deleteOne({ _id: items[i]._id });
      }

      return res.json({
        success: true,
        message: `Fixed glitched item. Kept item ${keepItem._id} and deleted ${
          items.length - 1
        } duplicates`,
        keptItem: keepItem,
      });
    }

    // If there's only one item, make sure it's not listed
    const item = items[0];
    if (item.isListed) {
      item.isListed = false;
      await item.save();
      return res.json({
        success: true,
        message: "Item was listed and has been set to unlisted",
        item,
      });
    }

    return res.json({
      success: true,
      message: "Item was already properly unlisted",
      item,
    });
  } catch (error) {
    console.error("Error fixing glitched item:", error);
    res.status(500).json({
      error: "Failed to fix glitched item",
      details: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});

module.exports = router;
