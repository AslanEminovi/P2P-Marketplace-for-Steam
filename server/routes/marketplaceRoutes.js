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
router.get("/stats", async (req, res) => {
  try {
    const Item = mongoose.model("Item");
    const User = mongoose.model("User");
    const Trade = mongoose.model("Trade");

    // Get counts of active listings, users, and completed trades
    const activeListings = await Item.countDocuments({ isListed: true });
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const completedTrades = await Trade.countDocuments({ status: "completed" });

    res.json({
      activeListings,
      activeUsers,
      completedTrades,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting marketplace stats:", error);
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

module.exports = router;
