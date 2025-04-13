const Item = require("../models/Item");
const User = require("../models/User");
const socketService = require("../services/socketService");
const mongoose = require("mongoose");

// POST /marketplace/list
exports.listItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    console.log(
      `Listing item request: ${marketHashName} (Asset ID: ${assetId}) from user ${req.user._id}`
    );

    if (!assetId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Asset ID is required to list an item." });
    }

    if (!marketHashName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Market hash name is required." });
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "A valid price greater than zero is required." });
    }

    // Check if this item is already involved in an active trade
    const Trade = mongoose.model("Trade");
    const activeTrade = await Trade.findOne({
      assetId: assetId,
      status: { $nin: ["cancelled", "completed", "failed"] },
    }).session(session);

    if (activeTrade) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error:
          "This item is already involved in an active trade process. Please wait for the trade to complete or be canceled.",
        tradeId: activeTrade._id,
      });
    }

    // Check if this item is already listed by this user
    const existingListing = await Item.findOne({
      owner: req.user._id,
      assetId: assetId,
      isListed: true,
    }).session(session);

    if (existingListing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error:
          "This item is already listed for sale. Please remove the existing listing first.",
        existingItemId: existingListing._id,
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

    // Create the new item with all the data
    const newItem = new Item({
      owner: req.user._id,
      steamItemId,
      assetId, // Save the unique asset ID
      marketHashName,
      price: parseFloat(price),
      currencyRate: parseFloat(rate),
      priceGEL: parseFloat(gelPrice),
      imageUrl,
      wear: itemWear,
      rarity,
      isListed: true,
      allowOffers: true, // Default to allowing offers
      createdAt: new Date(),
    });

    // Save the new item using the session
    await newItem.save({ session });

    // Add this item to the user's listedItems array
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { listedItems: newItem._id } },
      { session }
    );

    // Create notification object
    const notification = {
      type: "system",
      title: "Item Listed",
      message: `Your item ${marketHashName} has been listed for $${price} USD.`,
      relatedItemId: newItem._id,
      createdAt: new Date(),
    };

    // Add notification to the user about the successful listing
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          notifications: notification,
        },
      },
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Send real-time notification via WebSocket
    socketService.sendNotification(req.user._id, notification);

    // Broadcast new listing to all connected clients
    socketService.sendMarketUpdate({
      type: "new_listing",
      item: newItem,
    });

    // Invalidate marketplace cache
    marketItemsCache.timestamp = 0;

    // Emit socket event for new listing
    socketService.emitMarketActivity({
      type: "listing",
      itemName: newItem.marketHashName,
      price: newItem.price,
      user: req.user.username || req.user.steamName || "A user",
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(newItem);
  } catch (err) {
    console.error("Error listing item:", err);
    await session.abortTransaction();
    session.endSession();

    // Check for duplicate key error
    if (err.code === 11000 && err.message.includes("duplicate key error")) {
      return res.status(400).json({
        error:
          "This item already exists in the marketplace database. Please try again with a different item.",
        details: "Duplicate item detected",
      });
    }

    return res.status(500).json({
      error: "Failed to list item for sale.",
      details: err.message || "Unknown error",
    });
  }
};

// POST /marketplace/buy/:itemId
exports.buyItem = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { itemId } = req.params;
    const buyerId = req.user._id;

    console.log(`Buy request for item ${itemId} by user ${buyerId}`);

    // Find the item with owner details, in a single transaction
    const item = await Item.findById(itemId).populate("owner").session(session);

    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Item not found." });
    }

    if (!item.isListed) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "This item is not currently listed for sale." });
    }

    // Prevent users from buying their own items
    if (item.owner._id.toString() === buyerId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error:
          "You cannot buy your own item. Please edit or remove the listing instead.",
      });
    }

    // Check if item is already in a trade
    const Trade = mongoose.model("Trade");
    const existingTrade = await Trade.findOne({
      item: itemId,
      status: { $nin: ["cancelled", "completed", "failed"] },
    }).session(session);

    if (existingTrade) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "This item is already involved in another trade process.",
        tradeId: existingTrade._id,
      });
    }

    // Get buyer
    const buyer = await User.findById(buyerId).session(session);
    if (!buyer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Buyer account not found." });
    }

    // Get seller
    const seller = await User.findById(item.owner._id).session(session);
    if (!seller) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Seller account not found." });
    }

    // Determine which currency is being used for the purchase
    const useCurrency = req.body.currency || "USD";
    const price = useCurrency === "USD" ? item.price : item.priceGEL;

    // Check buyer has enough balance in the selected currency
    if (useCurrency === "USD" && buyer.walletBalance < price) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Insufficient balance in USD.",
        required: price,
        available: buyer.walletBalance,
      });
    } else if (useCurrency === "GEL" && buyer.walletBalanceGEL < price) {
      await session.abortTransaction();
      session.endSession();
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
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "You need to provide your Steam trade URL to make purchases.",
        requiresTradeUrl: true,
      });
    }

    // If buyer provided a new trade URL, save it
    if (tradeUrl && (!buyer.tradeUrl || tradeUrl !== buyer.tradeUrl)) {
      // Basic validation
      if (!tradeUrl.includes("steamcommunity.com/tradeoffer/new/")) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Invalid trade URL format." });
      }

      // Set expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Update user's trade URL
      buyer.tradeUrl = tradeUrl;
      buyer.tradeUrlExpiry = expiryDate;
      await buyer.save({ session });
    }

    if (!item.assetId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "This item doesn't have a valid Asset ID for trading.",
      });
    }

    try {
      // Create a trade record
      const trade = new Trade({
        seller: seller._id,
        buyer: buyer._id,
        item: item._id,
        itemName: item.marketHashName,
        itemImage: item.imageUrl,
        itemWear: item.wear,
        itemRarity: item.rarity,
        sellerSteamId: seller.steamId,
        buyerSteamId: buyer.steamId,
        assetId: item.assetId,
        price: price,
        currency: useCurrency,
        feeAmount: price * 0.025, // 2.5% platform fee
        status: "awaiting_seller",
        statusHistory: [
          {
            status: "awaiting_seller",
            timestamp: new Date(),
            note: "Purchase request created",
          },
        ],
      });

      // Save it to get an ID
      await trade.save({ session });

      // Update item status
      item.isListed = false; // Remove from marketplace
      item.tradeStatus = "pending";
      await item.save({ session });

      // Calculate purchase details
      const platformFee = price * 0.025; // 2.5% fee
      const sellerReceives = price - platformFee;

      // Hold the funds by adding a transaction
      const buyerTransaction = {
        type: "purchase",
        amount: -price,
        currency: useCurrency,
        itemId: item._id,
        reference: trade._id.toString(),
        status: "pending",
        createdAt: new Date(),
      };

      buyer.transactions.push(buyerTransaction);

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

      await buyer.save({ session });
      await seller.save({ session });

      // Add trade to both users' trade history
      await User.findByIdAndUpdate(
        seller._id,
        { $push: { tradeHistory: trade._id } },
        { session }
      );

      await User.findByIdAndUpdate(
        buyer._id,
        { $push: { tradeHistory: trade._id } },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Send real-time notifications via WebSocket after transaction commits
      socketService.sendNotification(buyer._id.toString(), buyerNotification);
      socketService.sendNotification(seller._id.toString(), sellerNotification);

      // Send trade update via WebSocket
      socketService.sendTradeUpdate(
        trade._id.toString(),
        buyer._id.toString(),
        seller._id.toString(),
        {
          status: "awaiting_seller",
          item: {
            _id: item._id,
            marketHashName: item.marketHashName,
            imageUrl: item.imageUrl,
            wear: item.wear,
            rarity: item.rarity,
          },
          price: price,
          currency: useCurrency,
        }
      );

      // Send market update about item being unavailable
      socketService.sendMarketUpdate({
        type: "item_sold",
        item: {
          _id: item._id,
          marketHashName: item.marketHashName,
        },
      });

      // Update marketplace cache
      if (marketItemsCache.timestamp > 0) {
        console.log("Invalidating marketplace cache due to item purchase");
        marketItemsCache.timestamp = 0;
      }

      // Emit socket event for item sale
      socketService.emitMarketActivity({
        type: "sale",
        itemName: item.marketHashName,
        price: item.price,
        user: buyer.username || buyer.steamName || "A user",
        timestamp: new Date().toISOString(),
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
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        error: "Failed to process purchase request",
        details: error.message,
      });
    }
  } catch (err) {
    console.error("Buy item error:", err);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error: "Failed to purchase item.",
      details: err.message || "Unknown error",
    });
  }
};

// Cache for market items to improve performance
let marketItemsCache = {
  items: [],
  stats: null,
  timestamp: 0,
  cacheDuration: 15 * 1000, // 15 seconds
};

// GET /marketplace
exports.getAllItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || "latest";
    const search = req.query.search || "";
    const categories = req.query.categories
      ? req.query.categories.split(",")
      : [];
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const skipCache = req.query.skipCache === "true";

    const cacheKey = `${page}-${limit}-${sort}-${search}-${categories.join(
      ","
    )}-${minPrice}-${maxPrice}`;
    const now = Date.now();

    // Check if we have a valid cache and we're not being asked to skip it
    if (
      !skipCache &&
      marketItemsCache.timestamp > 0 &&
      now - marketItemsCache.timestamp < marketItemsCache.cacheDuration &&
      marketItemsCache.cacheKey === cacheKey
    ) {
      console.log("Returning marketplace items from cache");
      return res.json(marketItemsCache.data);
    }

    console.log(
      `Fetching marketplace items - page: ${page}, limit: ${limit}, sort: ${sort}`
    );
    console.log(
      `Filters - search: "${search}", categories: [${categories}], price: ${
        minPrice || "any"
      } - ${maxPrice || "any"}`
    );

    // Build query
    const query = {
      isListed: true,
    };

    // Add search filter if provided
    if (search) {
      query.marketHashName = { $regex: search, $options: "i" };
    }

    // Add category filter if provided
    if (categories.length > 0) {
      query.category = { $in: categories };
    }

    // Add price filters if provided
    if (minPrice !== null) {
      query.price = { ...(query.price || {}), $gte: minPrice };
    }

    if (maxPrice !== null) {
      query.price = { ...(query.price || {}), $lte: maxPrice };
    }

    // Exclude items that are in active trades
    const Trade = mongoose.model("Trade");
    const itemsInActiveTrades = await Trade.distinct("item", {
      status: { $nin: ["cancelled", "completed", "failed"] },
    });

    if (itemsInActiveTrades.length > 0) {
      console.log(
        `Excluding ${itemsInActiveTrades.length} items in active trades`
      );
      query._id = { $nin: itemsInActiveTrades };
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case "price_asc":
        sortOptions.price = 1;
        break;
      case "price_desc":
        sortOptions.price = -1;
        break;
      case "popular":
        sortOptions.views = -1;
        break;
      case "latest":
      default:
        sortOptions.createdAt = -1;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const countPromise = Item.countDocuments(query);

    // Fetch items with pagination and sorting
    const itemsPromise = Item.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("owner", "displayName avatar steamId")
      .lean();

    // Get market statistics or use cached stats
    let statsPromise;
    if (marketItemsCache.stats && now - marketItemsCache.timestamp < 60000) {
      statsPromise = Promise.resolve(marketItemsCache.stats);
      console.log("Using cached market stats");
    } else {
      statsPromise = getMarketStats();
      console.log("Fetching fresh market stats");
    }

    // Run all promises in parallel
    const [totalItems, items, stats] = await Promise.all([
      countPromise,
      itemsPromise,
      statsPromise,
    ]);

    // Check for missing owner data and handle it gracefully
    const cleanedItems = items.map((item) => {
      if (!item.owner) {
        return {
          ...item,
          owner: {
            displayName: "Unknown User",
            avatar: "/default-avatar.png",
            steamId: null,
          },
        };
      }
      return item;
    });

    const response = {
      items: cleanedItems,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        hasMore: skip + items.length < totalItems,
      },
    };

    // Update cache
    marketItemsCache = {
      cacheKey,
      data: response,
      timestamp: now,
      stats,
      cacheDuration: 15 * 1000, // 15 seconds
    };

    // Return response with items and metadata
    return res.json(response);
  } catch (err) {
    console.error("Error fetching marketplace items:", err);
    return res.status(500).json({
      error: "Failed to fetch marketplace items.",
      details: err.message || "Unknown error",
    });
  }
};

// Helper function to get market statistics
const getMarketStats = async () => {
  try {
    const [totalListings, totalVolume, averagePrice] = await Promise.all([
      Item.countDocuments({ isListed: true }),
      Item.aggregate([
        { $match: { isListed: true } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      Item.aggregate([
        { $match: { isListed: true } },
        { $group: { _id: null, avg: { $avg: "$price" } } },
      ]),
    ]);

    return {
      totalListings,
      totalVolume: totalVolume[0]?.total || 0,
      averagePrice: averagePrice[0]?.avg || 0,
    };
  } catch (err) {
    console.error("Error calculating market stats:", err);
    return {
      totalListings: 0,
      totalVolume: 0,
      averagePrice: 0,
    };
  }
};

// GET /marketplace/featured
exports.getFeaturedItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    console.log(`Getting up to ${limit} featured items`);

    // Find items that are listed for sale
    const items = await Item.find({
      isListed: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("owner", "displayName avatar");

    console.log(`Found ${items.length} featured items`);
    return res.json(items);
  } catch (error) {
    console.error("Error fetching featured items:", error);
    return res
      .status(500)
      .json({ message: "Error fetching featured items", error: error.message });
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
  // No session at first - we'll start it only when needed
  let session = null;

  try {
    const itemId = req.params.itemId;
    const userId = req.user._id;

    console.log(`🔄 Attempting to cancel listing ${itemId} for user ${userId}`);

    // Step 1: First check if the item exists WITHOUT a session to avoid session overhead
    const itemCheck = await Item.findOne({ _id: itemId });

    if (!itemCheck) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
        details: "The requested item does not exist in the database",
      });
    }

    // Step 2: Verify ownership
    if (itemCheck.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Permission denied",
        details: "You don't have permission to cancel this listing",
      });
    }

    // Step 3: If the item is already unlisted, return success immediately
    if (!itemCheck.isListed) {
      console.log(`Item ${itemId} is already unlisted, returning success`);
      return res.json({
        success: true,
        message: "Item is already unlisted",
      });
    }

    // FIXED APPROACH: Instead of updating an existing item with potential
    // duplicate key issues, we update exactly one item by its _id
    try {
      console.log(`Updating item ${itemId} to unlisted status`);

      // Use $set to only update specific fields
      const updateResult = await Item.updateOne(
        { _id: itemId, isListed: true },
        {
          $set: {
            isListed: false,
            unlistedAt: new Date(),
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        console.log(
          `⚠️ No items updated. Item ${itemId} might already be unlisted or was modified`
        );

        // Double-check if it's now unlisted
        const currentStatus = await Item.findById(itemId);
        if (currentStatus && !currentStatus.isListed) {
          console.log(`Verified item ${itemId} is now unlisted`);
        } else {
          console.log(`Failed to update item ${itemId}, returning error`);
          return res.status(500).json({
            success: false,
            error: "Failed to cancel listing",
            details: "Could not update item status",
          });
        }
      } else {
        console.log(`✅ Successfully unlisted item ${itemId}`);
      }

      // Remove from user's listed items (this is idempotent)
      await User.updateOne({ _id: userId }, { $pull: { listedItems: itemId } });

      // Step 4: Check for active trades and cancel them if needed
      const Trade = mongoose.model("Trade");
      const activeTrades = await Trade.find({
        item: itemId,
        status: { $nin: ["cancelled", "completed", "failed"] },
      });

      // Cancel any active trades
      if (activeTrades.length > 0) {
        console.log(
          `Cancelling ${activeTrades.length} active trades for item ${itemId}`
        );

        for (const trade of activeTrades) {
          trade.status = "cancelled";
          trade.cancelReason = "Listing cancelled by seller";
          trade.cancelledAt = new Date();
          trade.cancelledBy = userId;
          await trade.save();

          // Notify the buyer
          try {
            const buyerNotification = {
              type: "trade",
              title: "Trade Cancelled",
              message: `The seller has cancelled the listing for ${itemCheck.marketHashName}`,
              relatedItemId: itemCheck._id,
              createdAt: new Date(),
            };

            await User.updateOne(
              { _id: trade.buyer },
              { $push: { notifications: buyerNotification } }
            );

            // Try to send WebSocket notification
            try {
              socketService.sendNotification(
                trade.buyer.toString(),
                buyerNotification
              );
            } catch (socketError) {
              console.error("Error sending buyer notification:", socketError);
              // Continue regardless of socket errors
            }
          } catch (notifyError) {
            console.error("Error creating buyer notification:", notifyError);
            // Continue regardless of notification errors
          }
        }
      }

      // Step 5: Add notification for the user
      try {
        const notification = {
          type: "system",
          title: "Listing Cancelled",
          message: `Your listing for ${itemCheck.marketHashName} has been cancelled.`,
          relatedItemId: itemCheck._id,
          createdAt: new Date(),
        };

        await User.updateOne(
          { _id: userId },
          { $push: { notifications: notification } }
        );

        // Send WebSocket notification - wrapped in try/catch
        try {
          socketService.sendNotification(userId, notification);
        } catch (notifyError) {
          console.error(
            "Error sending cancellation notification:",
            notifyError
          );
          // Continue regardless of notification errors
        }
      } catch (notificationError) {
        console.error("Error creating user notification:", notificationError);
        // Continue regardless of notification errors
      }

      // Step 6: Try to broadcast market updates without breaking the main flow
      try {
        socketService.sendMarketUpdate({
          type: "item_unavailable",
          itemId: itemCheck._id,
          marketHashName: itemCheck.marketHashName,
        });

        socketService.emitMarketActivity({
          type: "listing_cancelled",
          itemName: itemCheck.marketHashName,
          user: req.user.displayName || req.user.steamName || "A user",
          timestamp: new Date().toISOString(),
        });
      } catch (marketUpdateError) {
        console.error("Error with market updates:", marketUpdateError);
        // Don't break the main flow for socket errors
      }

      return res.json({
        success: true,
        message: "Listing cancelled successfully",
      });
    } catch (updateError) {
      console.error("Error during update operation:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to cancel listing",
        details: updateError.message || "Error during database update",
      });
    }
  } catch (err) {
    // Main error handler - clean up session if it exists
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (sessionError) {
        console.error("Error aborting transaction:", sessionError);
      }
    }

    console.error("Error in cancelListing:", err);

    // Provide a more user-friendly error message
    let errorMessage = "Failed to cancel listing";
    let details = err.message || "Unknown error";

    if (err.code === 11000) {
      errorMessage = "Duplicate item error";
      details = "This item has already been processed by another request";
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: details,
    });
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
