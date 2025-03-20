const Item = require("../models/Item");
const User = require("../models/User");
const socketService = require("../services/socketService");

// POST /marketplace/list
exports.listItem = async (req, res) => {
  try {
    const {
      steamItemId,
      assetId, // Make sure to include asset ID to identify unique items
      marketHashName,
      price,
      imageUrl,
      wear,
      currencyRate,
      priceGEL,
    } = req.body;

    if (!assetId) {
      return res
        .status(400)
        .json({ error: "Asset ID is required to list an item." });
    }

    // Check if this item is already listed by this user
    const existingListing = await Item.findOne({
      owner: req.user._id,
      assetId: assetId,
      isListed: true,
    });

    if (existingListing) {
      return res.status(400).json({
        error:
          "This item is already listed for sale. Please remove the existing listing first.",
      });
    }

    // Extract wear from marketHashName if not provided
    let itemWear = wear;
    if (!itemWear && marketHashName) {
      const wearMatch = marketHashName.match(
        /(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i
      );
      if (wearMatch) {
        itemWear = wearMatch[0];
      }
    }

    // Extract rarity if possible
    let rarity = null;
    if (req.body.rarity) {
      rarity = req.body.rarity;
    } else if (marketHashName) {
      // Try to determine rarity from name (simplified version)
      if (marketHashName.includes("★")) {
        rarity = "★";
      } else if (marketHashName.includes("Covert")) {
        rarity = "Covert";
      } else if (marketHashName.includes("Classified")) {
        rarity = "Classified";
      } else if (marketHashName.includes("Restricted")) {
        rarity = "Restricted";
      } else if (marketHashName.includes("Mil-Spec")) {
        rarity = "Mil-Spec Grade";
      } else if (marketHashName.includes("Industrial")) {
        rarity = "Industrial Grade";
      } else if (marketHashName.includes("Consumer")) {
        rarity = "Consumer Grade";
      }
    }

    // Set default rate if not provided
    const rate = currencyRate || 1.8;

    // Calculate Georgian Lari price if not provided
    const gelPrice = priceGEL || (price * rate).toFixed(2);

    const newItem = await Item.create({
      owner: req.user._id,
      steamItemId,
      assetId, // Save the unique asset ID
      marketHashName,
      price,
      currencyRate: rate,
      priceGEL: gelPrice,
      imageUrl,
      wear: itemWear,
      rarity,
      isListed: true,
      allowOffers: true, // Default to allowing offers
    });

    // Create notification object
    const notification = {
      type: "system",
      title: "Item Listed",
      message: `Your item ${marketHashName} has been listed for $${price} USD.`,
      relatedItemId: newItem._id,
      createdAt: new Date(),
    };

    // Add notification to the user about the successful listing
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: notification,
      },
    });

    // Send real-time notification via WebSocket
    socketService.sendNotification(req.user._id, notification);

    // Broadcast new listing to all connected clients
    socketService.sendMarketUpdate({
      type: "new_listing",
      item: newItem,
    });

    // Update site stats since we've added a new listing
    if (server && typeof server.updateSiteStats === "function") {
      server.updateSiteStats();
    } else {
      // Try to require server.js to access the function
      try {
        const server = require("../server");
        if (typeof server.updateSiteStats === "function") {
          server.updateSiteStats();
        }
      } catch (err) {
        console.log("Could not trigger site stats update:", err.message);
      }
    }

    return res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list item for sale." });
  }
};

// POST /marketplace/buy/:itemId
exports.buyItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const buyerId = req.user._id;
    const mongoose = require("mongoose");

    const item = await Item.findById(itemId).populate("owner");
    if (!item || !item.isListed) {
      return res.status(404).json({ error: "Item not found or not for sale." });
    }

    // Prevent users from buying their own items
    if (item.owner._id.toString() === buyerId.toString()) {
      return res.status(400).json({
        error:
          "You cannot buy your own item. Please edit or remove the listing instead.",
      });
    }

    // Get buyer
    const buyer = await User.findById(buyerId);

    // Get seller
    const seller = await User.findById(item.owner._id);

    // Determine which currency is being used for the purchase
    const useCurrency = req.body.currency || "USD";
    const price = useCurrency === "USD" ? item.price : item.priceGEL;

    // Check buyer has enough balance in the selected currency
    if (useCurrency === "USD" && buyer.walletBalance < price) {
      return res.status(400).json({
        error: "Insufficient balance in USD.",
        required: price,
        available: buyer.walletBalance,
      });
    } else if (useCurrency === "GEL" && buyer.walletBalanceGEL < price) {
      return res.status(400).json({
        error: "Insufficient balance in GEL.",
        required: price,
        available: buyer.walletBalanceGEL,
      });
    }

    // Check if user has a trade URL - allow setting it during purchase
    const { tradeUrl } = req.body;

    // If buyer doesn't have a trade URL and didn't provide one in this request
    if (!buyer.tradeUrl && !tradeUrl) {
      return res.status(400).json({
        error: "You need to provide your Steam trade URL to make purchases.",
        requiresTradeUrl: true,
      });
    }

    // If buyer provided a new trade URL, save it
    if (tradeUrl && (!buyer.tradeUrl || tradeUrl !== buyer.tradeUrl)) {
      // Basic validation
      if (!tradeUrl.includes("steamcommunity.com/tradeoffer/new/")) {
        return res.status(400).json({ error: "Invalid trade URL format." });
      }

      // Set expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Update user's trade URL
      buyer.tradeUrl = tradeUrl;
      buyer.tradeUrlExpiry = expiryDate;
      await buyer.save();
    }

    if (!item.assetId) {
      return res.status(400).json({
        error: "This item doesn't have a valid Asset ID for trading.",
      });
    }

    try {
      const Trade = mongoose.model("Trade");

      // Create a trade record
      const trade = new Trade({
        seller: seller._id,
        buyer: buyer._id,
        item: item._id,
        sellerSteamId: seller.steamId,
        buyerSteamId: buyer.steamId,
        assetId: item.assetId,
        price: price,
        currency: useCurrency,
        feeAmount: price * 0.025, // 2.5% platform fee
        status: "awaiting_seller",
      });

      // Save it to get an ID
      await trade.save();

      // Update item status
      item.isListed = false; // Remove from marketplace
      item.tradeStatus = "pending";
      await item.save();

      // Calculate purchase details
      const platformFee = price * 0.025; // 2.5% fee
      const sellerReceives = price - platformFee;

      // Hold the funds but don't deduct yet (will complete when trade completes)
      buyer.transactions.push({
        type: "purchase",
        amount: -price,
        currency: useCurrency,
        itemId: item._id,
        reference: trade._id.toString(),
        status: "pending",
      });

      // Create notification objects
      const buyerNotification = {
        type: "trade",
        title: "Purchase Request Sent",
        message: `Your purchase request for ${item.marketHashName} has been sent to the seller. You will be notified when they respond.`,
        link: `/trades/${trade._id}`,
        relatedItemId: item._id,
        read: false,
        createdAt: new Date(),
      };

      const sellerNotification = {
        type: "trade",
        title: "New Purchase Request",
        message: `${buyer.displayName} wants to buy your ${
          item.marketHashName
        } for ${useCurrency === "USD" ? "$" : ""}${price}${
          useCurrency === "GEL" ? " ₾" : ""
        }. You will receive ${
          useCurrency === "USD" ? "$" : ""
        }${sellerReceives.toFixed(2)}${
          useCurrency === "GEL" ? " ₾" : ""
        } after fees when completed.`,
        link: `/trades/${trade._id}`,
        relatedItemId: item._id,
        read: false,
        createdAt: new Date(),
      };

      // Add notifications to database
      buyer.notifications.push(buyerNotification);
      seller.notifications.push(sellerNotification);

      await buyer.save();

      // Send real-time notifications via WebSocket
      socketService.sendNotification(buyer._id.toString(), buyerNotification);
      socketService.sendNotification(seller._id.toString(), sellerNotification);

      // Send trade update via WebSocket
      socketService.sendTradeUpdate(
        trade._id.toString(),
        buyer._id.toString(),
        seller._id.toString(),
        {
          status: "awaiting_seller",
          item: item,
          price: price,
          currency: useCurrency,
        }
      );

      // Send market update about item being unavailable
      socketService.sendMarketUpdate({
        type: "item_sold",
        item: item,
      });

      await seller.save();

      // Add trade to both users' trade history
      await User.findByIdAndUpdate(seller._id, {
        $push: { tradeHistory: trade._id },
      });

      await User.findByIdAndUpdate(buyer._id, {
        $push: { tradeHistory: trade._id },
      });

      return res.json({
        success: true,
        message:
          "Purchase request sent to seller. You will be notified when they respond.",
        tradeId: trade._id,
        buyerTradeUrl: buyer.tradeUrl,
      });
    } catch (error) {
      console.error("Trade error:", error);
      return res.status(500).json({
        error: "Failed to process purchase request",
        details: error.message,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to purchase item." });
  }
};

// GET /marketplace/
exports.getAllItems = async (req, res) => {
  try {
    // Return all items that are listed for sale
    const items = await Item.find({ isListed: true }).populate(
      "owner",
      "displayName avatar"
    );
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve marketplace items." });
  }
};

// GET /marketplace/featured
exports.getFeaturedItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8; // Default to 8 featured items

    // First try to find items with images
    let items = await Item.find({
      isListed: true,
      imageUrl: { $exists: true, $ne: null, $ne: "" }, // Ensure image exists
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("owner", "displayName avatar");

    // If no items with images are found, fall back to any listed items
    if (items.length === 0) {
      console.log(
        "No featured items with images found, falling back to any listed items"
      );
      items = await Item.find({
        isListed: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("owner", "displayName avatar");
    }

    // Log how many items we're returning
    console.log(`Returning ${items.length} featured items`);

    // Add default image URLs for items without images
    items = items.map((item) => {
      if (!item.imageUrl || item.imageUrl === "") {
        // Create a deep copy to avoid modifying the database document directly
        const itemWithDefaultImage = item.toObject();

        // Default image based on known CS2 weapon type if possible
        const itemName = item.marketHashName
          ? item.marketHashName.toLowerCase()
          : "";
        if (itemName.includes("knife")) {
          itemWithDefaultImage.imageUrl =
            "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsXE1xNwVDv7WrFA5pnabNJGwSuN3gxtnawKOlMO6HzzhQucAm0uvFo4n0jgyx_0M-ZmilJNeLMlhpvs6G/";
        } else if (
          itemName.includes("rifle") ||
          itemName.includes("ak-47") ||
          itemName.includes("m4a")
        ) {
          itemWithDefaultImage.imageUrl =
            "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUznaCaJWVDvozlzdONwvKjYLiBk24IsZEl0uuYrNjw0A3n80JpZWzwIYeLMlhpXFSrhRw/";
        } else {
          itemWithDefaultImage.imageUrl =
            "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUuh6qZJmlD7tiyl4OIlaGhYuLTzjhVupJ12urH89ii3lHlqEdoMDr2I5jVLFFrYQ2D_QDt/";
        }

        return itemWithDefaultImage;
      }
      return item;
    });

    return res.json(items);
  } catch (err) {
    console.error("Error fetching featured items:", err);
    return res
      .status(500)
      .json({ error: "Failed to retrieve featured items." });
  }
};

// GET /marketplace/item/:itemId
exports.getItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Find the item and populate owner details
    const item = await Item.findById(itemId).populate(
      "owner",
      "displayName avatar steamId"
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    // If the item is not listed and the requester is not the owner, don't show it
    if (
      !item.isListed &&
      (!req.user || req.user._id.toString() !== item.owner._id.toString())
    ) {
      return res
        .status(403)
        .json({ error: "Item is not currently listed for sale." });
    }

    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to retrieve item details." });
  }
};

// GET /marketplace/my-listings
exports.getMyListings = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all items that are listed by the current user
    const items = await Item.find({
      owner: userId,
      isListed: true,
    }).sort({ createdAt: -1 });

    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to retrieve your listings." });
  }
};

// PUT /marketplace/cancel/:itemId
exports.cancelListing = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user._id;

    console.log(`Cancelling listing for item ${itemId} by user ${userId}`);

    // Find the item
    const item = await Item.findById(itemId);

    if (!item) {
      console.log("Item not found");
      return res.status(404).json({ error: "Item not found." });
    }

    // Check if this is a force cancel request (for cleaning up listings)
    const forceCancel = req.query.force === "true";

    // Verify ownership unless this is a force cancel
    if (!forceCancel && item.owner.toString() !== userId.toString()) {
      console.log(
        `Ownership mismatch: item owner ${item.owner} vs user ${userId}`
      );

      // Check if the item might have been sold or transferred outside the platform
      // If the original owner is the current user and the item is still listed,
      // allow them to cancel it as a cleanup operation
      const originalListedByUser = await User.findOne({
        _id: userId,
        listedItems: { $elemMatch: { $eq: item._id } },
      });

      if (!originalListedByUser) {
        return res
          .status(403)
          .json({ error: "You don't have permission to cancel this listing." });
      }

      console.log(
        `Item was listed by user ${userId} but ownership has changed. Cleaning up listing.`
      );
    }

    // Update the item to not be listed
    item.isListed = false;
    await item.save();

    console.log(`Item ${itemId} successfully unlisted`);

    // Add notification to the user
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type: "system",
          title: "Listing Cancelled",
          message: `Your listing for ${item.marketHashName} has been cancelled.`,
          relatedItemId: item._id,
          createdAt: new Date(),
        },
      },
    });

    // Send WebSocket notification if available
    if (socketService?.sendNotification) {
      socketService.sendNotification(userId, {
        type: "system",
        title: "Listing Cancelled",
        message: `Your listing for ${item.marketHashName} has been cancelled.`,
        relatedItemId: item._id,
      });
    }

    return res.json({
      success: true,
      message: "Listing cancelled successfully.",
    });
  } catch (err) {
    console.error("Error cancelling listing:", err);
    return res.status(500).json({ error: "Failed to cancel listing." });
  }
};

// PUT /marketplace/update-price/:itemId
exports.updatePrice = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { price, priceGEL } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Please provide a valid price." });
    }

    // Find the item
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }

    // Verify ownership
    if (item.owner.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You don't have permission to update this item." });
    }

    // Verify that the item is currently listed
    if (!item.isListed) {
      return res
        .status(400)
        .json({ error: "This item is not currently listed for sale." });
    }

    // Update the item price
    item.price = price;

    // Calculate or set GEL price
    if (priceGEL && !isNaN(priceGEL)) {
      item.priceGEL = priceGEL;
      // Update the currency rate based on new prices
      item.currencyRate = (priceGEL / price).toFixed(2);
    } else {
      // Use the existing rate to calculate GEL price
      item.priceGEL = (price * item.currencyRate).toFixed(2);
    }

    await item.save();

    // Add notification to the user
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type: "system",
          title: "Price Updated",
          message: `Your listing for ${item.marketHashName} has been updated to $${price}.`,
          relatedItemId: item._id,
          createdAt: new Date(),
        },
      },
    });

    return res.json({
      success: true,
      message: "Price updated successfully.",
      item: {
        _id: item._id,
        price: item.price,
        priceGEL: item.priceGEL,
        currencyRate: item.currencyRate,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update price." });
  }
};
