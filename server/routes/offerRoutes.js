const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const requireAuth = require("../middleware/requireAuth");
const Offer = require("../models/offer");
const Item = require("../models/item");
const Notification = require("../models/notification");
const Trade = require("../models/trade");

// All routes require authentication
router.use(requireAuth);

// Create a new offer for an item
router.post("/:itemId", offerController.createOffer);

// Get all received offers
router.get("/received", offerController.getReceivedOffers);

// Get all sent offers
router.get("/sent", offerController.getSentOffers);

// Accept an offer
router.post("/accept", requireAuth, async (req, res) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: "Offer ID is required" });
    }

    const offer = await Offer.findById(offerId)
      .populate("item")
      .populate("buyer");

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Check if the user is the seller
    if (offer.item.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to accept this offer" });
    }

    // Check if the offer is still pending
    if (offer.status !== "pending") {
      return res
        .status(400)
        .json({ error: `This offer has already been ${offer.status}` });
    }

    // Create a trade record
    const trade = new Trade({
      seller: req.user.id,
      buyer: offer.buyer._id,
      item: offer.item._id,
      offer: offer._id,
      amount: offer.amount,
      currency: offer.currency,
      status: "pending",
    });

    await trade.save();

    // Update the offer status
    offer.status = "accepted";
    offer.updatedAt = Date.now();
    await offer.save();

    // Update the item status
    const item = await Item.findById(offer.item._id);
    item.status = "pending_trade";
    await item.save();

    // Create notifications for both users
    const sellerNotification = new Notification({
      user: req.user.id,
      title: "Offer Accepted",
      message: `You accepted an offer for ${offer.item.name} from ${offer.buyer.displayName}`,
      type: "offer",
      read: false,
      link: `/trades/${trade._id}`,
      relatedItemId: offer.item._id,
      offerId: offer._id,
    });

    const buyerNotification = new Notification({
      user: offer.buyer._id,
      title: "Offer Accepted",
      message: `Your offer for ${offer.item.name} has been accepted`,
      type: "offer",
      read: false,
      link: `/trades/${trade._id}`,
      relatedItemId: offer.item._id,
      offerId: offer._id,
    });

    await sellerNotification.save();
    await buyerNotification.save();

    // Emit notifications via socket
    if (req.io) {
      req.io.to(req.user.id).emit("notification", {
        title: "Offer Accepted",
        message: `You accepted an offer for ${offer.item.name}`,
        type: "SUCCESS",
      });

      req.io.to(offer.buyer._id.toString()).emit("notification", {
        title: "Offer Accepted",
        message: `Your offer for ${offer.item.name} has been accepted`,
        type: "SUCCESS",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer accepted successfully",
      tradeId: trade._id,
    });
  } catch (error) {
    console.error("Error accepting offer:", error);
    return res.status(500).json({ error: "Failed to accept offer" });
  }
});

// Decline an offer
router.post("/decline", requireAuth, async (req, res) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: "Offer ID is required" });
    }

    const offer = await Offer.findById(offerId)
      .populate("item")
      .populate("buyer");

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Check if the user is the seller
    if (offer.item.owner.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to decline this offer" });
    }

    // Check if the offer is still pending
    if (offer.status !== "pending") {
      return res
        .status(400)
        .json({ error: `This offer has already been ${offer.status}` });
    }

    // Update the offer status
    offer.status = "declined";
    offer.updatedAt = Date.now();
    await offer.save();

    // Create notifications for both users
    const sellerNotification = new Notification({
      user: req.user.id,
      title: "Offer Declined",
      message: `You declined an offer for ${offer.item.name} from ${offer.buyer.displayName}`,
      type: "offer",
      read: false,
      link: `/marketplace/item/${offer.item._id}`,
      relatedItemId: offer.item._id,
      offerId: offer._id,
    });

    const buyerNotification = new Notification({
      user: offer.buyer._id,
      title: "Offer Declined",
      message: `Your offer for ${offer.item.name} has been declined`,
      type: "offer",
      read: false,
      link: `/marketplace/item/${offer.item._id}`,
      relatedItemId: offer.item._id,
      offerId: offer._id,
    });

    await sellerNotification.save();
    await buyerNotification.save();

    // Emit notifications via socket
    if (req.io) {
      req.io.to(req.user.id).emit("notification", {
        title: "Offer Declined",
        message: `You declined an offer for ${offer.item.name}`,
        type: "INFO",
      });

      req.io.to(offer.buyer._id.toString()).emit("notification", {
        title: "Offer Declined",
        message: `Your offer for ${offer.item.name} has been declined`,
        type: "ERROR",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer declined successfully",
    });
  } catch (error) {
    console.error("Error declining offer:", error);
    return res.status(500).json({ error: "Failed to decline offer" });
  }
});

// Create a counter offer
router.post("/:itemId/:offerId/counter", offerController.createCounterOffer);

// Steam integration routes
router.post("/steam/login-secure", offerController.updateSteamLoginSecure);
router.post("/steam/trade-url", offerController.updateTradeUrl);
router.get("/steam/trade-offers", offerController.checkTradeOffers);

module.exports = router;
