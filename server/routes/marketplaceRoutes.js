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

    // Use the same function that the socket service uses to ensure consistency
    const socketService = require("../services/socketService");
    const stats = await socketService.getLatestStats();

    // Format for the HTTP response
    const formattedStats = {
      activeListings: stats.activeListings,
      activeUsers: stats.activeUsers || stats.onlineUsers?.total || 0,
      registeredUsers: stats.registeredUsers,
      completedTrades: stats.completedTrades,
      timestamp: stats.timestamp || new Date(),
    };

    // Update cache
    statsCache.data = formattedStats;
    statsCache.timestamp = now;

    res.json(formattedStats);
  } catch (error) {
    console.error("Error getting marketplace stats:", error);

    // Return cached data if available, even if it's old
    if (statsCache.data) {
      console.log("Returning stale cached stats due to error");
      return res.json(statsCache.data);
    }

    // If no cache available, return error
    res.status(500).json({ error: "Failed to get statistics" });
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
