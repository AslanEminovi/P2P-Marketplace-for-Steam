const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { isAuthenticated } = require("../middleware/auth");
const mongoose = require("mongoose");

// Apply auth middleware to all trade routes
router.use(isAuthenticated);

// Get user trades with Redis caching
router.get("/history", tradeController.getUserTrades);

// Get trade details with Redis caching
router.get("/:tradeId", tradeController.getTradeById);

// Get trade stats with Redis caching
router.get("/stats", tradeController.getTradeStats);

// Standard trade operations
router.post("/create", tradeController.createTrade);
router.put("/:tradeId/update-status", tradeController.updateTradeStatus);
router.get("/:tradeId/verify-inventory", tradeController.verifyInventory);
router.put("/:tradeId/seller-initiate", tradeController.sellerInitiate);
router.put("/:tradeId/buyer-confirm", tradeController.buyerConfirmReceipt);
router.put("/:tradeId/cancel", tradeController.cancelTrade);

// Seller approves the trade
router.put("/:tradeId/seller-approve", tradeController.sellerApproveTrade);

// Seller sent item via Steam trade
router.put("/:tradeId/seller-sent", tradeController.sellerSentItem);

// Alternative simplified route for seller initiation
router.put(
  "/:tradeId/seller-initiate-simple",
  tradeController.sellerInitiateSimple
);

// Seller manually confirms they've sent the trade offer
router.put("/:tradeId/seller-sent-manual", tradeController.sellerSentManual);

// Check Steam trade status
router.get(
  "/:tradeId/check-steam-status",
  tradeController.checkSteamTradeStatus
);

// Test route for diagnostics - REMOVE IN PRODUCTION
router.get("/test-trade-system", async (req, res) => {
  try {
    console.log("[TRADE TEST] Testing trade system");

    // Load the models
    const Trade = require("../models/Trade");
    const User = require("../models/User");
    const Item = require("../models/Item");

    // 1. Test database connection
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }[dbStatus];

    console.log(
      `[TRADE TEST] MongoDB connection status: ${dbStatusText} (${dbStatus})`
    );

    // 2. Test basic Trade operations if connected
    if (dbStatus === 1) {
      // Count trades
      const tradeCount = await Trade.countDocuments();
      console.log(`[TRADE TEST] Total trades in database: ${tradeCount}`);

      // Get a sample trade
      const sampleTrade = await Trade.findOne()
        .populate("item")
        .populate("buyer")
        .populate("seller");
      console.log(
        `[TRADE TEST] Sample trade found: ${sampleTrade ? "Yes" : "No"}`
      );

      // Test findByIdAndUpdate with a dummy update that won't affect the system
      if (sampleTrade) {
        const testUpdate = await Trade.findByIdAndUpdate(
          sampleTrade._id,
          { $set: { updatedByTest: new Date() } },
          { new: true }
        );
        console.log(
          `[TRADE TEST] Test update successful: ${testUpdate ? "Yes" : "No"}`
        );
      }
    }

    return res.json({
      success: true,
      dbStatus: dbStatusText,
      message:
        "Trade system diagnostic completed. Check server logs for details.",
    });
  } catch (error) {
    console.error("[TRADE TEST] Error testing trade system:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

module.exports = router;
