const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const requireAuth = require("../middleware/requireAuth");

// All routes require authentication
router.use(requireAuth);

// Create a new offer for an item
router.post("/:itemId", offerController.createOffer);

// Get received offers
router.get("/received", offerController.getReceivedOffers);

// Get sent offers
router.get("/sent", offerController.getSentOffers);

// Accept an offer
router.put("/:itemId/:offerId/accept", offerController.acceptOffer);

// Decline/withdraw an offer
router.put("/:itemId/:offerId/decline", offerController.declineOffer);

// Submit a counter offer
router.put(
  "/:itemId/:offerId/counterOffer",
  offerController.submitCounterOffer
);

// Cancel a pending offer
router.put("/:offerId/cancel", offerController.cancelOffer);

// Get all offers for the current user
router.get("/user", offerController.getUserOffers);

// Steam integration routes
router.post("/steam/login-secure", offerController.updateSteamLoginSecure);
router.post("/steam/trade-url", offerController.updateTradeUrl);
router.get("/steam/trade-offers", offerController.checkTradeOffers);

module.exports = router;
