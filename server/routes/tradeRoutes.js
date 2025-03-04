const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const requireAuth = require("../middleware/requireAuth");

// All trade routes require authentication
router.use(requireAuth);

// Get user's trade history
router.get("/history", tradeController.getTradeHistory);

// Get specific trade details
router.get("/:tradeId", tradeController.getTradeDetails);

// Seller approves the trade
router.put("/:tradeId/seller-approve", tradeController.sellerApproveTrade);

// Seller sent item via Steam trade
router.put("/:tradeId/seller-sent", tradeController.sellerSentItem);

// Buyer confirms receipt of item
router.put("/:tradeId/buyer-confirm", tradeController.buyerConfirmReceipt);

// Cancel a trade (can be done by buyer or seller)
router.put("/:tradeId/cancel", tradeController.cancelTrade);

// Check Steam trade status
router.get("/:tradeId/check-steam-status", tradeController.checkSteamTradeStatus);

module.exports = router;