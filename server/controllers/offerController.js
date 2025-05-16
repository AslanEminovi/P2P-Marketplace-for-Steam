const Item = require("../models/Item");
const User = require("../models/User");
const mongoose = require("mongoose");
const socketService = require("../services/socketService");
const notificationService = require("../services/notificationService");

// POST /offers/:itemId
exports.createOffer = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { offerAmount, offerCurrency, offerRate, message } = req.body;
    const buyerId = req.user._id;

    // Validate item exists and is listed
    const item = await Item.findById(itemId).populate("owner");
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    if (!item.isListed) {
      return res
        .status(400)
        .json({ error: "Item is not currently listed for sale." });
    }

    if (!item.allowOffers) {
      return res
        .status(400)
        .json({ error: "This item does not accept offers." });
    }

    // Prevent offering on your own items
    if (item.owner._id.toString() === buyerId.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot make an offer on your own item." });
    }

    // Check if user already has a pending offer for this item
    const existingOffer = item.offers.find(
      (offer) =>
        offer.offeredBy.toString() === buyerId.toString() &&
        offer.status === "pending"
    );

    if (existingOffer) {
      return res.status(400).json({
        error:
          "You already have a pending offer for this item. Cancel it before making a new offer.",
      });
    }

    // Create offer with expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Add offer to item
    const newOffer = {
      offeredBy: buyerId,
      offerAmount: offerAmount,
      offerCurrency: offerCurrency || "USD",
      offerRate:
        offerRate || (offerCurrency === "GEL" ? item.currencyRate : null),
      message: message || `Offer for ${item.marketHashName}`,
      createdAt: new Date(),
      expiresAt: expiresAt,
      status: "pending",
    };

    item.offers.push(newOffer);
    await item.save();

    // Get the new offer ID
    const offerId = item.offers[item.offers.length - 1]._id;

    // Look up buyer info for the notification
    const buyer = await User.findById(buyerId).select("displayName avatar");

    // Add notification for item owner
    const notificationForOwner = {
      type: "offer",
      title: "New Offer Received",
      message: `You received a new offer of ${offerAmount} ${
        offerCurrency || "USD"
      } for your ${item.marketHashName}`,
      link: `/marketplace/item/${item._id}`,
      relatedItemId: item._id,
      read: false,
      data: {
        type: "new_offer_received",
        itemId: item._id,
        offerId: offerId,
        offerAmount: offerAmount,
        offerCurrency: offerCurrency || "USD",
        buyerName: buyer ? buyer.displayName : "A buyer",
        itemName: item.marketHashName,
      },
    };

    // Save notification to database and send real-time update
    await notificationService.createNotification({
      user: item.owner._id,
      ...notificationForOwner,
    });

    // Use socket service to send a real-time update
    socketService.notifyOfferUpdate(item.owner._id.toString(), {
      type: "new_offer_received",
      title: "New Offer Received",
      message: `You received a new offer of ${offerAmount} ${
        offerCurrency || "USD"
      } for your ${item.marketHashName}`,
      itemId: item._id.toString(),
      offerId: offerId.toString(),
      buyerId: buyerId.toString(),
      buyerName: buyer ? buyer.displayName : "A buyer",
      buyerAvatar: buyer ? buyer.avatar : null,
      itemName: item.marketHashName,
      openTradePanel: true,
      tradePanelOptions: {
        action: "offers",
        activeTab: "received",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Offer submitted successfully",
      offerId: offerId,
    });
  } catch (err) {
    console.error("Offer error:", err);
    return res.status(500).json({ error: "Failed to submit offer." });
  }
};

// GET /offers/received
exports.getReceivedOffers = async (req, res) => {
  try {
    // Find all items owned by the user with pending offers
    const items = await Item.find({
      owner: req.user._id,
      "offers.status": "pending",
    }).populate("offers.offeredBy");

    // Transform the data to make it easier to consume
    const offers = [];

    items.forEach((item) => {
      item.offers.forEach((offer) => {
        if (offer.status === "pending") {
          offers.push({
            offerId: offer._id,
            itemId: item._id,
            itemName: item.marketHashName,
            itemImage: item.imageUrl,
            offeredBy: offer.offeredBy
              ? {
                  id: offer.offeredBy._id,
                  displayName: offer.offeredBy.displayName,
                  avatar: offer.offeredBy.avatar,
                }
              : null,
            offerAmount: offer.offerAmount,
            offerCurrency: offer.offerCurrency,
            offerRate: offer.offerRate,
            message: offer.message,
            createdAt: offer.createdAt,
            expiresAt: offer.expiresAt,
          });
        }
      });
    });

    return res.json(offers);
  } catch (err) {
    console.error("Get offers error:", err);
    return res.status(500).json({ error: "Failed to retrieve offers." });
  }
};

// GET /offers/sent
exports.getSentOffers = async (req, res) => {
  try {
    // Find all items with pending offers made by the user
    const items = await Item.find({
      "offers.offeredBy": req.user._id,
    }).populate("owner");

    // Transform the data to make it easier to consume
    const offers = [];

    items.forEach((item) => {
      item.offers.forEach((offer) => {
        if (
          offer.offeredBy &&
          offer.offeredBy.toString() === req.user._id.toString()
        ) {
          offers.push({
            offerId: offer._id,
            itemId: item._id,
            itemName: item.marketHashName,
            itemImage: item.imageUrl,
            owner: {
              id: item.owner._id,
              displayName: item.owner.displayName,
              avatar: item.owner.avatar,
            },
            offerAmount: offer.offerAmount,
            offerCurrency: offer.offerCurrency,
            offerRate: offer.offerRate,
            status: offer.status,
            message: offer.message,
            createdAt: offer.createdAt,
            expiresAt: offer.expiresAt,
          });
        }
      });
    });

    return res.json(offers);
  } catch (err) {
    console.error("Get sent offers error:", err);
    return res.status(500).json({ error: "Failed to retrieve sent offers." });
  }
};

// PUT /offers/:itemId/:offerId/accept
exports.acceptOffer = async (req, res) => {
  try {
    const { itemId, offerId } = req.params;
    const sellerId = req.user._id;

    console.log(
      `[offerController] Processing offer acceptance: itemId=${itemId}, offerId=${offerId}`
    );

    // Find the item and verify ownership
    const item = await Item.findById(itemId).populate("offers.offeredBy");
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    if (item.owner.toString() !== sellerId.toString()) {
      return res.status(403).json({
        error: "You don't have permission to accept offers for this item.",
      });
    }

    // Find the specific offer
    const offerIndex = item.offers.findIndex(
      (o) => o._id.toString() === offerId
    );
    if (offerIndex === -1) {
      return res.status(404).json({ error: "Offer not found." });
    }

    const offer = item.offers[offerIndex];

    // Make sure offer is pending
    if (offer.status !== "pending") {
      return res.status(400).json({
        error: `Cannot accept an offer that is already ${offer.status}.`,
      });
    }

    console.log(
      `[offerController] Creating trade for accepted offer: ${offerId}`
    );

    // Create a trade record with the offer details
    const Trade = mongoose.model("Trade");

    const newTrade = new Trade({
      item: item._id,
      seller: sellerId,
      buyer: offer.offeredBy,
      price: offer.offerAmount,
      currency: offer.offerCurrency || "USD",
      status: "awaiting_seller",
      itemName: item.marketHashName,
      itemImage: item.imageUrl,
      itemWear: item.wear,
      itemRarity: item.rarity,
      assetId: item.assetId,
      createdAt: new Date(),
      statusHistory: [
        {
          status: "created",
          timestamp: new Date(),
          note: "Trade created from accepted offer",
        },
        {
          status: "awaiting_seller",
          timestamp: new Date(),
          note: "Waiting for seller to initiate trade",
        },
      ],
    });

    // Save the trade first and wait for it to complete
    const savedTrade = await newTrade.save();

    if (!savedTrade || !savedTrade._id) {
      console.error(
        `[offerController] Failed to create trade record for offer ${offerId}`
      );
      return res.status(500).json({ error: "Failed to create trade record." });
    }

    console.log(`[offerController] Trade created: ${savedTrade._id}`);

    // Verify the trade was actually created
    const verifyTrade = await Trade.findById(savedTrade._id);
    if (!verifyTrade) {
      console.error(
        `[offerController] Trade verification failed for ID ${savedTrade._id}`
      );
      return res
        .status(500)
        .json({ error: "Trade record verification failed." });
    }

    // Update the offer status and add trade reference
    offer.status = "accepted";
    offer.updatedAt = new Date();
    offer.tradeId = savedTrade._id;

    // Mark all other offers as declined
    item.offers.forEach((o, idx) => {
      if (idx !== offerIndex && o.status === "pending") {
        o.status = "declined";
        o.updatedAt = new Date();
        o.declinedReason = "Another offer was accepted";

        // Send real-time notification to the declined offer's buyer
        socketService.notifyOfferUpdate(o.offeredBy.toString(), {
          type: "offer_declined",
          title: "Offer Declined",
          message: `Your offer for ${item.marketHashName} was declined because another offer was accepted.`,
          itemId: item._id.toString(),
          offerId: o._id.toString(),
          itemName: item.marketHashName,
        });
      }
    });

    // Mark item as no longer listed
    item.isListed = false;
    item.reservedBy = offer.offeredBy;
    item.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save the updated item
    await item.save();

    // Get buyer info for the notification
    const buyerId = offer.offeredBy._id || offer.offeredBy;
    const buyer = await User.findById(buyerId);

    if (buyer) {
      // Add notification for the buyer
      const notificationForBuyer = {
        type: "offer",
        title: "Offer Accepted",
        message: `Your offer of ${offer.offerAmount} ${
          offer.offerCurrency || "USD"
        } for ${
          item.marketHashName
        } has been accepted. Go to the trades page to complete the transaction.`,
        link: `/trades/${savedTrade._id}`,
        relatedItemId: item._id,
        relatedTradeId: savedTrade._id,
        read: false,
        data: {
          type: "offer_accepted",
          itemId: item._id.toString(),
          offerId: offerId,
          tradeId: savedTrade._id.toString(),
          itemName: item.marketHashName,
        },
      };

      await notificationService.createNotification({
        user: buyerId,
        ...notificationForBuyer,
      });

      // Send real-time notification with slightly delayed delivery
      // to ensure database operations are complete
      setTimeout(() => {
        socketService.notifyOfferUpdate(buyerId.toString(), {
          type: "offer_accepted",
          title: "Offer Accepted",
          message: `Your offer of ${offer.offerAmount} ${
            offer.offerCurrency || "USD"
          } for ${
            item.marketHashName
          } has been accepted. Go to the trades page to complete the transaction.`,
          itemId: item._id.toString(),
          offerId: offerId,
          tradeId: savedTrade._id.toString(),
          itemName: item.marketHashName,
          openTradePanel: true,
          tradePanelOptions: {
            action: "offers",
            activeTab: "sent",
          },
        });
      }, 500);
    }

    return res.json({
      success: true,
      message: "Offer accepted successfully. Redirecting to trade details...",
      tradeId: savedTrade._id,
    });
  } catch (err) {
    console.error("Accept offer error:", err);
    return res.status(500).json({ error: "Failed to accept offer." });
  }
};

// PUT /offers/:itemId/:offerId/decline
exports.declineOffer = async (req, res) => {
  try {
    const { itemId, offerId } = req.params;
    const userId = req.user._id;

    // Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    // Verify ownership
    if (item.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        error: "You don't have permission to decline offers for this item.",
      });
    }

    // Find the specific offer
    const offerIndex = item.offers.findIndex(
      (o) => o._id.toString() === offerId
    );
    if (offerIndex === -1) {
      return res.status(404).json({ error: "Offer not found." });
    }

    const offer = item.offers[offerIndex];

    // Make sure offer is pending
    if (offer.status !== "pending") {
      return res.status(400).json({
        error: `Cannot decline an offer that is already ${offer.status}.`,
      });
    }

    // Update offer status
    offer.status = "declined";
    offer.updatedAt = new Date();
    offer.declinedReason = req.body.reason || "Declined by seller";

    await item.save();

    // Send real-time notification to the buyer
    const buyerId = offer.offeredBy.toString();

    socketService.notifyOfferUpdate(buyerId, {
      type: "offer_declined",
      title: "Offer Declined",
      message: `Your offer for ${item.marketHashName} was declined by the seller.`,
      itemId: item._id.toString(),
      offerId: offerId,
      reason: offer.declinedReason,
      itemName: item.marketHashName,
    });

    // Add notification for the buyer via database as well
    const notificationForBuyer = {
      type: "offer",
      title: "Offer Declined",
      message: `Your offer for ${item.marketHashName} was declined by the seller.`,
      link: `/marketplace/item/${item._id}`,
      relatedItemId: item._id,
      read: false,
      data: {
        type: "offer_declined",
        itemId: item._id,
        offerId: offerId,
        reason: offer.declinedReason,
      },
    };

    await notificationService.createNotification({
      user: buyerId,
      ...notificationForBuyer,
    });

    return res.json({
      success: true,
      message: "Offer declined successfully.",
    });
  } catch (err) {
    console.error("Decline offer error:", err);
    return res.status(500).json({ error: "Failed to decline offer." });
  }
};

// POST /offers/:itemId/:offerId/counterOffer
exports.submitCounterOffer = async (req, res) => {
  try {
    const { itemId, offerId } = req.params;
    const { counterAmount, counterCurrency, message } = req.body;
    const userId = req.user._id;

    // Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    // Verify that this user can counter this offer (must be either buyer or seller)
    const isOwner = item.owner.toString() === userId.toString();
    const offer = item.offers.find((o) => o._id.toString() === offerId);

    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    const isBuyer = offer.offeredBy.toString() === userId.toString();

    if (!isOwner && !isBuyer) {
      return res.status(403).json({
        error:
          "You don't have permission to make a counter offer for this item.",
      });
    }

    // Make sure offer is pending
    if (offer.status !== "pending") {
      return res.status(400).json({
        error: `Cannot counter an offer that is already ${offer.status}.`,
      });
    }

    // Create a new counter offer
    const counterOffer = {
      offeredBy: userId,
      offerAmount: counterAmount,
      offerCurrency: counterCurrency || offer.offerCurrency || "USD",
      message: message || `Counter offer for ${item.marketHashName}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      status: "pending",
      isCounterOffer: true,
      originalOfferId: offerId,
    };

    // Add counter offer to the item
    item.offers.push(counterOffer);

    // Update the original offer to indicate it was countered
    offer.status = "countered";
    offer.updatedAt = new Date();
    offer.counterOfferId = counterOffer._id;

    await item.save();

    // Get the recipient ID (the other party in the transaction)
    const recipientId = isOwner
      ? offer.offeredBy.toString()
      : item.owner.toString();

    // Get names for the notification
    const sender = await User.findById(userId).select("displayName");
    const senderName = sender
      ? sender.displayName
      : isOwner
      ? "The seller"
      : "The buyer";

    // Send real-time notification to the recipient
    socketService.notifyOfferUpdate(recipientId, {
      type: "counter_offer",
      title: "Counter Offer Received",
      message: `${senderName} has made a counter offer of ${counterAmount} ${
        counterCurrency || "USD"
      } for ${item.marketHashName}.`,
      itemId: item._id.toString(),
      offerId: counterOffer._id.toString(),
      originalOfferId: offerId,
      senderName: senderName,
      itemName: item.marketHashName,
      counterAmount: counterAmount,
      counterCurrency: counterCurrency || "USD",
      openTradePanel: true,
      tradePanelOptions: {
        action: "offers",
        activeTab: isOwner ? "sent" : "received",
      },
    });

    // Add notification via database as well
    const notificationForRecipient = {
      type: "offer",
      title: "Counter Offer Received",
      message: `${senderName} has made a counter offer of ${counterAmount} ${
        counterCurrency || "USD"
      } for ${item.marketHashName}.`,
      link: `/marketplace/item/${item._id}`,
      relatedItemId: item._id,
      read: false,
      data: {
        type: "counter_offer",
        itemId: item._id,
        offerId: counterOffer._id,
        originalOfferId: offerId,
        counterAmount: counterAmount,
        counterCurrency: counterCurrency || "USD",
      },
    };

    await notificationService.createNotification({
      user: recipientId,
      ...notificationForRecipient,
    });

    return res.json({
      success: true,
      message: "Counter offer submitted successfully.",
      counterOfferId: counterOffer._id,
    });
  } catch (err) {
    console.error("Counter offer error:", err);
    return res.status(500).json({ error: "Failed to submit counter offer." });
  }
};

// GET /offers/steam/trade-offers
exports.checkTradeOffers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with steamLoginSecure
    const user = await User.findById(userId).select("+steamLoginSecure");

    if (!user.steamLoginSecure) {
      return res.status(400).json({
        error:
          "You need to provide your Steam login secure token to check trade offers.",
      });
    }

    const steamApiService = require("../services/steamApiService");

    // Get both sent and received offers in parallel
    const [sent, received] = await Promise.all([
      steamApiService.getSentTradeOffers(user.steamLoginSecure),
      steamApiService.getReceivedTradeOffers(user.steamLoginSecure),
    ]);

    return res.json({
      sent: sent,
      received: received,
    });
  } catch (err) {
    console.error("Check Steam trade offers error:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve Steam trade offers." });
  }
};

// POST /offers/steam/login-secure
exports.updateSteamLoginSecure = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res
        .status(400)
        .json({ error: "Steam login secure token is required." });
    }

    // Update user's steam login secure token
    await User.findByIdAndUpdate(userId, {
      steamLoginSecure: token,
    });

    return res.json({
      success: true,
      message: "Steam login secure token updated successfully.",
    });
  } catch (err) {
    console.error("Update Steam login secure token error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update Steam login secure token." });
  }
};

// POST /offers/steam/trade-url
exports.updateTradeUrl = async (req, res) => {
  try {
    const { tradeUrl } = req.body;
    const userId = req.user._id;

    if (!tradeUrl) {
      return res.status(400).json({ error: "Trade URL is required." });
    }

    // Basic validation
    if (!tradeUrl.includes("steamcommunity.com/tradeoffer/new/")) {
      return res.status(400).json({ error: "Invalid trade URL format." });
    }

    // Set expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Update user's trade URL
    await User.findByIdAndUpdate(userId, {
      tradeUrl: tradeUrl,
      tradeUrlExpiry: expiryDate,
    });

    return res.json({
      success: true,
      message: "Trade URL updated successfully.",
      expiryDate: expiryDate,
    });
  } catch (err) {
    console.error("Update trade URL error:", err);
    return res.status(500).json({ error: "Failed to update trade URL." });
  }
};

// GET /offers/user - Get all offers made by the current user
exports.getUserOffers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all items where the user has made an offer
    const Item = mongoose.model("Item");
    const items = await Item.find({
      "offers.offeredBy": userId,
    }).populate("owner");

    // Extract the offers this user has made from all items
    const userOffers = [];

    items.forEach((item) => {
      item.offers.forEach((offer) => {
        if (
          offer.offeredBy &&
          offer.offeredBy.toString() === userId.toString()
        ) {
          userOffers.push({
            _id: offer._id,
            itemId: item._id,
            itemName: item.marketHashName || "Unknown Item",
            itemImage: item.imageUrl,
            owner: item.owner
              ? {
                  displayName: item.owner.displayName || "Unknown User",
                  avatar: item.owner.avatar,
                }
              : null,
            amount: offer.offerAmount,
            currency: offer.offerCurrency || "USD",
            originalPrice: item.price,
            status: offer.status,
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
            tradeId: offer.tradeId, // If an offer was accepted, it might have a trade ID
          });
        }
      });
    });

    // Sort by creation date (newest first)
    userOffers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      offers: userOffers,
    });
  } catch (err) {
    console.error("Get user offers error:", err);
    return res.status(500).json({ error: "Failed to fetch your offers." });
  }
};

// PUT /offers/:offerId/cancel - Cancel a pending offer
exports.cancelOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    // Find the item containing this offer
    const Item = mongoose.model("Item");
    const item = await Item.findOne({ "offers._id": offerId });

    if (!item) {
      return res.status(404).json({ error: "Offer not found." });
    }

    // Find the specific offer
    const offer = item.offers.find((o) => o._id.toString() === offerId);

    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    // Verify the offer belongs to the user
    if (offer.offeredBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You do not have permission to cancel this offer." });
    }

    // Verify the offer is in a state that can be cancelled
    if (offer.status !== "pending") {
      return res.status(400).json({
        error: "This offer cannot be cancelled as it is no longer pending.",
        status: offer.status,
      });
    }

    // Update the offer status
    offer.status = "cancelled";

    // Add updatedAt timestamp
    offer.updatedAt = new Date();

    // Save the item
    await item.save();

    // Send real-time notification to the seller
    socketService.notifyOfferUpdate(item.owner.toString(), {
      type: "offer_cancelled",
      title: "Offer Cancelled",
      message: `An offer on your item ${item.marketHashName} was cancelled by the buyer.`,
      itemId: item._id.toString(),
      offerId: offerId,
      itemName: item.marketHashName,
    });

    // Add notification via database as well
    const notificationForSeller = {
      type: "offer",
      title: "Offer Cancelled",
      message: `An offer on your item ${item.marketHashName} was cancelled by the buyer.`,
      link: `/marketplace/item/${item._id}`,
      relatedItemId: item._id,
      read: false,
      data: {
        type: "offer_cancelled",
        itemId: item._id,
        offerId: offerId,
      },
    };

    await notificationService.createNotification({
      user: item.owner.toString(),
      ...notificationForSeller,
    });

    return res.json({
      success: true,
      message: "Offer cancelled successfully.",
    });
  } catch (err) {
    console.error("Cancel offer error:", err);
    return res.status(500).json({ error: "Failed to cancel offer." });
  }
};
