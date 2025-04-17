const express = require("express");
const router = express.Router();
const marketplaceController = require("../controllers/marketplaceController");
const { requireAuth } = require("../middlewares/authMiddleware");
const mongoose = require("mongoose");

// Public routes (don't require auth)
router.get("/", marketplaceController.getAllItems);
router.get("/featured", marketplaceController.getFeaturedItems);
router.get("/item/:itemId", marketplaceController.getItemDetails);

// Public statistics endpoint for homepage
const statsCache = {
  data: null,
  timestamp: null,
};

router.get("/stats", async (req, res) => {
  try {
    // Check if we have cached stats less than 5 minutes old
    const now = Date.now();
    if (
      statsCache.data &&
      statsCache.timestamp &&
      now - statsCache.timestamp < 5 * 60 * 1000
    ) {
      // Return cached data if it's recent
      console.log("Returning cached marketplace stats");
      return res.json(statsCache.data);
    }

    console.log("Fetching fresh marketplace stats");

    // Use UserStatusManager directly for user counts
    const userStatusManager = require("../services/UserStatusManager");
    const userCounts = userStatusManager.getUserCounts();

    console.log("User counts from UserStatusManager:", userCounts);

    // Force stats refresh with detailed logging if user count is zero
    if (userCounts.total === 0) {
      console.log(
        "WARNING: User count is zero, this might indicate a tracking issue"
      );

      // Trigger a connection log for debugging
      userStatusManager.logConnections();

      // You might want to check database for a fallback count
      const User = require("../models/User");
      const onlineUsersCountFromDB = await User.countDocuments({
        isOnline: true,
      });
      console.log(`Online users in database: ${onlineUsersCountFromDB}`);

      // If DB has users but memory doesn't, there might be an initialization issue
      if (onlineUsersCountFromDB > 0 && userCounts.total === 0) {
        console.log(
          "Mismatch between database and memory user counts, triggering sync"
        );
        // This will update the database based on memory, not what we want right now
        // Instead just log the discrepancy
      }
    }

    // Fetch stats from database
    const Item = require("../models/Item");
    const User = require("../models/User");
    const Trade = require("../models/Trade");

    const [activeListings, registeredUsers, completedTrades] =
      await Promise.all([
        Item.countDocuments({ isListed: true }),
        User.countDocuments({
          lastActive: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        }),
        Trade.countDocuments({ status: "completed" }),
      ]);

    // Format for the HTTP response
    const formattedStats = {
      activeListings,
      activeUsers: userCounts.total,
      registeredUsers,
      completedTrades,
      timestamp: new Date(),
      _debug: {
        authenticatedUsers: userCounts.authenticated,
        anonymousUsers: userCounts.anonymous,
        source: "fresh",
      },
    };

    console.log("Generated marketplace stats:", formattedStats);

    // Update cache
    statsCache.data = formattedStats;
    statsCache.timestamp = now;

    res.json(formattedStats);
  } catch (error) {
    console.error("Error getting marketplace stats:", error);

    // Return cached data if available, even if it's old
    if (statsCache.data) {
      console.log("Returning stale cached stats due to error");
      return res.json({
        ...statsCache.data,
        _stale: true,
        error: "Using cached data due to error",
      });
    }

    // If no cache available, return error with zeros
    res.status(500).json({
      error: "Failed to get statistics",
      activeListings: 0,
      activeUsers: 0,
      registeredUsers: 0,
      completedTrades: 0,
    });
  }
});

// Protected routes (require auth)
router.post("/list", requireAuth, marketplaceController.listItem);
router.post("/buy/:itemId", requireAuth, marketplaceController.buyItem);
router.get("/my-listings", requireAuth, marketplaceController.getMyListings);
router.put("/cancel/:itemId", requireAuth, marketplaceController.cancelListing);
router.put(
  "/update-price/:itemId",
  requireAuth,
  marketplaceController.updatePrice
);

// Export router and statsCache for use in other files
module.exports = router;
// Export statsCache for use in server.js to update in real-time
module.exports.statsCache = statsCache;
