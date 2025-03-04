const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const requireAuth = require("../middleware/requireAuth");

// All routes require authentication
router.use(requireAuth);

// Create a new offer for an item
router.post("/:itemId", offerController.createOffer);

// Get all received offers
router.get("/received", offerController.getReceivedOffers);

// Get all sent offers
router.get("/sent", offerController.getSentOffers);

// Accept an offer
router.put("/:itemId/:offerId/accept", offerController.acceptOffer);

// Decline/withdraw an offer
router.put("/:itemId/:offerId/decline", offerController.declineOffer);

// Create a counter offer
router.post("/:itemId/:offerId/counter", offerController.createCounterOffer);

// Steam integration routes
router.post("/steam/login-secure", offerController.updateSteamLoginSecure);
router.post("/steam/trade-url", offerController.updateTradeUrl);
router.get("/steam/trade-offers", offerController.checkTradeOffers);

module.exports = router;