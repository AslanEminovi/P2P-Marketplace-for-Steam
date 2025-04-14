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

// Define a route handler for admin check
router.get("/check", auth.isAuthenticated, async (req, res) => {
  try {
    console.log(`Checking admin status for user: ${req.user?._id}`);

    // If no user is logged in
    if (!req.user) {
      console.log("No user found in request, not an admin");
      return res.json({ isAdmin: false });
    }

    // For security, recheck from the database
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
          ],
        }
      : {};

    // Get total count
    const total = await User.countDocuments(searchFilter);

    // Get paginated users
    const users = await User.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

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

    // Validate the userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.log(`Admin is fetching details for user: ${userId}`);

    // Get models directly to avoid any possible circular dependency issues
    const User = mongoose.model("User");
    const Item = mongoose.model("Item");
    const Trade = mongoose.model("Trade");

    // Get basic user info first - make this query fast
    const user = await User.findById(userId).select("-refreshToken").lean();

    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`Found user ${user.displayName || "Unknown"}`);

    // Run these queries in parallel to speed things up
    const [items, trades] = await Promise.all([
      // Get user's items (limited to 5 for performance)
      Item.find({ ownerId: userId, owner: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Get user's trades (limited to 5 for performance)
      Trade.find({
        $or: [
          { sellerId: userId, seller: userId },
          { buyerId: userId, buyer: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    console.log(
      `Found ${items.length} items and ${trades.length} trades for user ${userId}`
    );

    // Return the data
    res.json({
      user,
      items,
      trades,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting user details:", error);
    res.status(500).json({
      error: "Failed to get user details",
      message: error.message,
    });
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

/**
 * @route   GET /admin/user-inventory/:steamId
 * @desc    Get Steam inventory for a user by Steam ID with improved error handling
 * @access  Admin
 */
router.get("/user-inventory/:steamId", async (req, res) => {
  try {
    const { steamId } = req.params;

    if (!steamId) {
      return res.status(400).json({ error: "Steam ID is required" });
    }

    // Get Steam API key from environment variables
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!steamApiKey) {
      return res.status(500).json({ error: "Steam API key not configured" });
    }

    console.log(`Fetching Steam inventory for SteamID: ${steamId}`);

    // Try to check if we have a cached version first
    const User = mongoose.model("User");
    const user = await User.findOne({ steamId }).lean();

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found with that Steam ID" });
    }

    // First, check if the user has any items in our system
    const Item = mongoose.model("Item");
    const userItems = await Item.find({
      ownerId: user._id,
      owner: user._id,
    }).lean();

    // Call the Steam API to get the user's inventory
    // The URL format follows Steam Web API specifications
    const steamInventoryUrl = `https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1/?key=${steamApiKey}&steamid=${steamId}&appid=730&contextid=2&get_descriptions=true`;

    const response = await axios.get(steamInventoryUrl, {
      timeout: 10000, // 10 second timeout
    });

    if (
      !response.data ||
      !response.data.result ||
      !response.data.result.items
    ) {
      // If Steam API fails but we have local items, return those instead
      if (userItems && userItems.length > 0) {
        console.log(
          `Steam API returned no data, but found ${userItems.length} items in our system for user ${steamId}`
        );
        return res.json(
          userItems.map((item) => ({
            assetid: item.assetId,
            name: item.marketHashName,
            marketname: item.marketHashName,
            icon_url: item.imageUrl,
            wear: item.wear,
            rarity: item.rarity,
            tradable: true,
            price: item.price,
          }))
        );
      }
      return res.status(404).json({
        error: "No inventory data found or private inventory",
        message:
          "The user's Steam inventory is private or they don't have any CS2 items.",
      });
    }

    // Process the inventory items to make them easier to work with
    const items = response.data.result.items;
    const descriptions = response.data.result.descriptions;

    // Map the descriptions to the items
    const processedItems = items.map((item) => {
      const description = descriptions.find(
        (desc) =>
          desc.classid === item.classid && desc.instanceid === item.instanceid
      );

      if (!description) {
        return {
          ...item,
          name: "Unknown Item",
          icon_url: "",
        };
      }

      // Extract wear value from market_hash_name if it exists
      let wear = "";
      const wearMatch =
        description.market_hash_name &&
        description.market_hash_name.match(
          /(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)$/
        );
      if (wearMatch) {
        wear = wearMatch[1];
      }

      // Extract rarity from tags
      let rarity = "";
      if (description.tags) {
        const rarityTag = description.tags.find(
          (tag) => tag.category === "Rarity"
        );
        if (rarityTag) {
          rarity = rarityTag.name;
        }
      }

      // Try to match with our database items to get prices
      const matchingItem = userItems.find(
        (dbItem) =>
          dbItem.marketHashName === description.market_hash_name ||
          dbItem.assetId === item.assetid
      );

      return {
        ...item,
        assetid: item.assetid || item.id,
        name: description.name || description.market_hash_name,
        marketname: description.market_hash_name,
        icon_url: description.icon_url
          ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`
          : "",
        wear,
        rarity,
        tradable: description.tradable === 1,
        price: matchingItem?.price || null,
      };
    });

    console.log(
      `Found ${processedItems.length} inventory items for SteamID: ${steamId}`
    );

    res.json(processedItems);
  } catch (error) {
    console.error("Error fetching user inventory:", error);

    // Provide more specific error messages based on the error
    if (error.response) {
      if (error.response.status === 403) {
        return res
          .status(403)
          .json({ error: "Inventory is private or inaccessible" });
      }
      return res.status(error.response.status).json({
        error: `Steam API error: ${
          error.response.data?.error || error.message
        }`,
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Steam API request timed out" });
    }

    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

/**
 * @route   GET /admin/user-trades/:userId
 * @desc    Get detailed trade history for a specific user with populated user and item data
 * @access  Admin
 */
router.get("/user-trades/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get models directly to avoid any possible circular dependency issues
    const Trade = mongoose.model("Trade");
    const User = mongoose.model("User");
    const Item = mongoose.model("Item");

    // Query the database for trades involving this user
    // The user could be either a buyer or a seller
    const trades = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .sort({ createdAt: -1 }) // Sort by most recent first
      .populate("item", "marketHashName imageUrl price wear")
      .populate("buyer", "displayName avatar steamId")
      .populate("seller", "displayName avatar steamId")
      .limit(100) // Limit to 100 most recent trades
      .lean();

    console.log(`Found ${trades.length} trades for user ${userId}`);

    // Process the trades to make them easier to work with in the frontend
    const processedTrades = trades.map((trade) => {
      // Add flags to indicate if the user is the buyer or seller
      const isUserBuyer = trade.buyer?._id.toString() === userId.toString();
      const isUserSeller = trade.seller?._id.toString() === userId.toString();

      // Handle missing item case
      if (!trade.item || Object.keys(trade.item).length === 0) {
        trade.item = {
          marketHashName: trade.itemName || "Unknown Item",
          imageUrl:
            trade.itemImage ||
            "https://community.cloudflare.steamstatic.com/economy/image/placeholder/360fx360f",
          wear: trade.itemWear || "Unknown",
          price: trade.price || 0,
        };
      }

      return {
        ...trade,
        isUserBuyer,
        isUserSeller,
        itemName: trade.item?.marketHashName || trade.itemName,
        itemImage: trade.item?.imageUrl || trade.itemImage,
        // Convert prices to numbers if they are strings
        price:
          typeof trade.price === "string"
            ? parseFloat(trade.price)
            : trade.price,
      };
    });

    res.json(processedTrades);
  } catch (error) {
    console.error("Error fetching user trades:", error);
    res.status(500).json({ error: "Failed to fetch trade history" });
  }
});

/**
 * @route   POST /admin/users/:userId/ban
 * @desc    Ban a user
 * @access  Admin
 */
router.post("/users/:userId/ban", async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate the userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Make sure admin isn't trying to ban themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot ban yourself" });
    }

    // Get the User model
    const User = mongoose.model("User");

    // Update the user's ban status
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: true,
        banReason: reason || "Banned by administrator",
        bannedAt: new Date(),
        bannedBy: req.user._id,
      },
      { new: true }
    ).select("-refreshToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `Admin ${req.user.displayName} (${req.user._id}) banned user ${user.displayName} (${user._id})`
    );

    // Also invalidate their sessions for security
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 0] }, 1] },
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        displayName: user.displayName,
        isBanned: user.isBanned,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
      },
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

/**
 * @route   POST /admin/users/:userId/unban
 * @desc    Unban a user
 * @access  Admin
 */
router.post("/users/:userId/unban", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate the userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Invalid user ID format: ${userId}`);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Get the User model
    const User = mongoose.model("User");

    // Update the user's ban status
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $unset: { banReason: "", bannedAt: "", bannedBy: "" },
        isBanned: false,
        unbannedAt: new Date(),
        unbannedBy: req.user._id,
      },
      { new: true }
    ).select("-refreshToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `Admin ${req.user.displayName} (${req.user._id}) unbanned user ${user.displayName} (${user._id})`
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        displayName: user.displayName,
        isBanned: user.isBanned,
        unbannedAt: user.unbannedAt,
      },
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

module.exports = router;
