const express = require("express");
const router = express.Router();
const marketplaceController = require("../controllers/marketplaceController");
const requireAuth = require("../middleware/requireAuth");

// Public routes (don't require auth)
router.get("/", marketplaceController.getAllItems);
router.get("/featured", marketplaceController.getFeaturedItems);
router.get("/item/:itemId", marketplaceController.getItemDetails);

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
