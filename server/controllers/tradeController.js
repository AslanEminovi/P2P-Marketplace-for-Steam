const Item = require("../models/Item");
const User = require("../models/User");
const Trade = require("../models/Trade");
const steamApiService = require("../services/steamApiService");
const socketService = require("../services/socketService");
const mongoose = require("mongoose");
const axios = require("axios");
const notificationService = require("../services/notificationService");

// GET /trades/history
exports.getTradeHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // Look up trades where the user is either buyer or seller
    // EXCLUDE cancelled and failed trades completely
    const trades = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
      status: { $nin: ["cancelled", "failed"] }, // Exclude cancelled and failed trades
    })
      .populate("item")
      .populate("buyer", "displayName avatar steamId")
      .populate("seller", "displayName avatar steamId")
      .sort({ createdAt: -1 });

    // Add flags to indicate if user is buyer or seller
    const tradesWithFlags = trades.map((trade) => {
      const tradeObj = trade.toObject();
      tradeObj.isUserBuyer = trade.buyer._id.toString() === userId.toString();
      tradeObj.isUserSeller = trade.seller._id.toString() === userId.toString();
      return tradeObj;
    });

    return res.json(tradesWithFlags);
  } catch (err) {
    console.error("Get trade history error:", err);
    return res.status(500).json({ error: "Failed to retrieve trade history" });
  }
};

// GET /trades/:tradeId
exports.getTradeDetails = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;

    // Find the trade and populate related data
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("buyer", "displayName avatar steamId tradeUrl")
      .populate("seller", "displayName avatar steamId tradeUrl");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is part of this trade
    if (
      trade.buyer._id.toString() !== userId.toString() &&
      trade.seller._id.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ error: "You don't have permission to view this trade" });
    }

    // Add flag to indicate if user is buyer or seller
    const result = trade.toObject();
    result.isUserBuyer = trade.buyer._id.toString() === userId.toString();
    result.isUserSeller = trade.seller._id.toString() === userId.toString();

    return res.json(result);
  } catch (err) {
    console.error("Get trade details error:", err);
    return res.status(500).json({ error: "Failed to retrieve trade details" });
  }
};

// PUT /trades/:tradeId/seller-approve
exports.sellerApproveTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;

    // Find the trade
    const trade = await Trade.findById(tradeId)
      .populate("buyer", "username email tradeUrl")
      .populate("item");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Check if the user is the seller
    if (trade.seller.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the seller can approve this trade" });
    }

    // Check if the trade status is correct
    if (trade.status !== "awaiting_seller") {
      return res.status(400).json({
        error: `Cannot approve a trade that is already in ${trade.status} state`,
      });
    }

    // Update trade status to "accepted" instead of "offer_sent"
    // This is more accurate since the seller approved but hasn't sent a Steam offer yet
    trade.addStatusHistory("accepted", "Seller accepted purchase offer");
    await trade.save();

    // Notify the buyer that the seller has approved the offer
    await notificationService.createNotification(
      trade.buyer._id,
      trade.seller.toString(),
      { status: "accepted", item: trade.item, timeUpdated: new Date() }
    );

    return res.json({
      success: true,
      message: "Trade approved successfully. The buyer has been notified.",
      buyerTradeUrl: trade.buyer.tradeUrl,
    });
  } catch (err) {
    console.error("Seller approve trade error:", err);
    return res.status(500).json({ error: "Failed to approve trade" });
  }
};

// PUT /trades/:tradeId/seller-sent
exports.sellerSentItem = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;
    const { steamOfferUrl } = req.body;

    // Find the trade
    const trade = await Trade.findById(tradeId).populate(
      "buyer",
      "username email"
    );

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is the seller
    if (trade.seller.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the seller can mark an item as sent" });
    }

    // Check current trade status
    if (trade.status !== "accepted") {
      return res.status(400).json({
        error: `Trade cannot be marked as sent because it is in ${trade.status} state. It needs to be in 'accepted' state.`,
      });
    }

    // Validate Steam offer URL - accept either trade URLs or offer IDs
    let tradeOfferId;

    if (
      steamOfferUrl &&
      steamOfferUrl.includes("steamcommunity.com/tradeoffer/")
    ) {
      // Extract from URL
      const tradeOfferMatch = steamOfferUrl.match(/tradeoffer\/([0-9]+)/);
      if (tradeOfferMatch && tradeOfferMatch[1]) {
        tradeOfferId = tradeOfferMatch[1];
      }
    } else if (steamOfferUrl && /^[0-9]+$/.test(steamOfferUrl.trim())) {
      // It's just the trade offer ID
      tradeOfferId = steamOfferUrl.trim();
    } else {
      return res
        .status(400)
        .json({ error: "Please enter a valid Steam trade offer ID or URL" });
    }

    // Update trade with offer ID and status
    trade.tradeOfferId = tradeOfferId;
    trade.addStatusHistory("offer_sent", "Seller sent Steam trade offer");
    await trade.save();

    // Notify the buyer that a trade offer has been sent
    await notificationService.createNotification(
      trade.buyer._id,
      trade.seller.toString(),
      {
        status: "offer_sent",
        message: `The seller has sent you a Steam trade offer. Please check your Steam trade offers.`,
        tradeOfferId: tradeOfferId,
      }
    );

    return res.json({
      success: true,
      message: "Trade marked as sent. The buyer has been notified.",
    });
  } catch (err) {
    console.error("Error marking trade as sent:", err);
    return res.status(500).json({ error: "Failed to update trade status" });
  }
};

// PUT /trades/:tradeId/buyer-confirm
exports.buyerConfirmReceipt = async (req, res) => {
  try {
    const tradeId = req.params.tradeId;
    const userId = req.user._id;

    console.log(
      `Buyer ${userId} attempting to confirm receipt for trade ${tradeId}`
    );

    // First check if the trade exists and the user is the buyer
    const trade = await Trade.findById(tradeId)
      .populate("seller", "steamId username")
      .populate("item");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    if (trade.buyer.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the buyer can confirm receipt for this trade" });
    }

    if (trade.status !== "pending" && trade.status !== "offer_sent") {
      return res.status(400).json({
        error: `Cannot confirm receipt for a trade in '${trade.status}' status`,
      });
    }

    // Verify the item is no longer in the seller's inventory before confirming
    try {
      const apiKey = "FSWJNSWYW8QSAQ6W";

      // Format the API URL according to the improved pattern
      const timestamp = Date.now();
      const steamApiUrl = `https://steamwebapi.com/steam/api/inventory?key=${apiKey}&steam_id=${trade.seller.steamId}&parse=1&no_cache=1&_nocache=${timestamp}`;

      console.log(
        `Final check of seller's inventory before confirming receipt: ${steamApiUrl}`
      );

      // Use our improved API call approach
      const response = await axios.get(steamApiUrl, { timeout: 30000 });

      // Parse inventory data using our improved methods
      let inventory = [];
      let assetFound = false;

      // First determine if we're dealing with an array or array-like object
      if (Array.isArray(response.data)) {
        inventory = response.data;
      } else if (
        Object.keys(response.data).length > 0 &&
        Object.keys(response.data).every((key) => !isNaN(parseInt(key)))
      ) {
        // The response is an object with numeric keys (array-like)
        inventory = Object.values(response.data);
      } else if (response.data.items && Array.isArray(response.data.items)) {
        inventory = response.data.items;
      } else {
        console.log(
          "Unexpected inventory format, proceeding with confirmation anyway"
        );
      }

      // Try to find the item by its asset ID
      const assetId = trade.assetId;

      // Search the inventory for the asset
      if (inventory.length > 0) {
        for (const item of inventory) {
          // Check all possible asset ID fields
          const possibleAssetIdFields = [
            "assetid",
            "asset_id",
            "id",
            "classid",
            "instanceid",
            "asset",
            "market_id",
            "tradable_id",
          ];

          for (const field of possibleAssetIdFields) {
            if (item[field] && item[field].toString() === assetId.toString()) {
              assetFound = true;
              break;
            }
          }

          if (assetFound) break;
        }

        // If asset still in seller's inventory, prevent confirmation
        if (assetFound) {
          return res.status(400).json({
            error:
              "Cannot confirm receipt: The item is still in the seller's inventory",
            tradeOffersLink: "https://steamcommunity.com/my/tradeoffers",
          });
        }
      }

      // If we get here, the item is not in the seller's inventory and we can proceed with confirming

      // Update the trade status to 'completed'
      trade.status = "completed";
      trade.completedAt = new Date();

      await trade.save();

      // Update the item's owner
      const item = await Item.findById(trade.item._id);
      if (item) {
        item.owner = userId;
        item.status = "owned";
        item.isListed = false;
        item.tradeStatus = "none";
        item.tradeOfferId = null;
        await item.save();
      }

      // Notify the seller that the trade has been completed
      socketService.notifyUser(trade.seller.toString(), "trade_completed", {
        tradeId: trade._id,
        message: `Buyer confirmed receipt of item: ${trade.item.name}`,
      });

      return res.json({
        success: true,
        message: "Trade completed successfully. The item is now yours!",
      });
    } catch (error) {
      console.error("Error checking seller inventory during confirm:", error);
      return res.status(500).json({
        error: "Server error while confirming receipt. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in buyerConfirmReceipt:", error);
    return res
      .status(500)
      .json({ error: "Server error while confirming receipt" });
  }
};

// PUT /trades/:tradeId/cancel
exports.cancelTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    // Find the trade
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is part of this trade
    const isBuyer = trade.buyer.toString() === userId.toString();
    const isSeller = trade.seller.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res
        .status(403)
        .json({ error: "You don't have permission to cancel this trade" });
    }

    // Check current trade status
    const allowedStatuses = ["awaiting_seller", "offer_sent"];
    if (!allowedStatuses.includes(trade.status)) {
      return res.status(400).json({
        error: `Trade cannot be cancelled because it is in ${trade.status} state`,
      });
    }

    // If the trade has a Steam offer ID and the user is the seller, try to cancel on Steam
    if (trade.tradeOfferId && isSeller) {
      try {
        const seller = await User.findById(userId).select("+steamLoginSecure");

        if (seller.steamLoginSecure) {
          await steamApiService.cancelTradeOffer(
            seller.steamLoginSecure,
            trade.tradeOfferId
          );
        }
      } catch (steamError) {
        console.warn("Failed to cancel Steam trade offer:", steamError);
        // Continue with cancellation even if Steam API call fails
      }
    }

    // Update trade status
    const cancelledBy = isBuyer ? "buyer" : "seller";
    const cancelReason = reason || `Cancelled by ${cancelledBy}`;
    trade.addStatusHistory("cancelled", cancelReason);
    await trade.save();

    // Update the item status
    await Item.findByIdAndUpdate(trade.item, {
      isListed: true, // Re-list the item
      tradeStatus: null,
      tradeOfferId: null,
    });

    // Add notifications
    const otherUserId = isBuyer ? trade.seller : trade.buyer;
    const item = await Item.findById(trade.item);

    // Notify the other party
    await User.findByIdAndUpdate(otherUserId, {
      $push: {
        notifications: {
          type: "trade",
          title: "Trade Cancelled",
          message: `The trade for ${item.marketHashName} has been cancelled by the ${cancelledBy}. Reason: ${cancelReason}`,
          relatedItemId: trade.item,
          read: false,
          createdAt: new Date(),
        },
      },
    });

    return res.json({
      success: true,
      message: "Trade cancelled successfully.",
    });
  } catch (err) {
    console.error("Cancel trade error:", err);
    return res.status(500).json({ error: "Failed to cancel trade" });
  }
};

// PUT /trades/:tradeId/check-steam-status
exports.checkSteamTradeStatus = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;

    // Find the trade
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is part of this trade
    const isBuyer = trade.buyer.toString() === userId.toString();
    const isSeller = trade.seller.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res
        .status(403)
        .json({ error: "You don't have permission to check this trade" });
    }

    // If trade doesn't have a Steam offer ID yet
    if (!trade.tradeOfferId) {
      return res.json({
        status: "pending",
        message: "No Steam trade offer has been created yet",
      });
    }

    // Just return the current state from our database
    return res.json({
      status: trade.status,
      tradeOfferId: trade.tradeOfferId,
      message:
        "Please check your Steam trade offers page directly for the most up-to-date status",
      tradeUrl: `https://steamcommunity.com/tradeoffer/${trade.tradeOfferId}`,
    });
  } catch (err) {
    console.error("Check Steam trade status error:", err);
    return res.status(500).json({ error: "Failed to check trade status" });
  }
};

// Add new controller functions for the P2P trading flow

// PUT /trades/:tradeId/seller-initiate
exports.sellerInitiate = async (req, res) => {
  console.log(
    `[TRADE SERVER] sellerInitiate called at ${new Date().toISOString()}`
  );
  console.log(`[TRADE SERVER] Request params:`, req.params);
  console.log(
    `[TRADE SERVER] Request user:`,
    req.user ? req.user._id : "No user"
  );

  try {
    const { tradeId } = req.params;
    const sellerId = req.user._id;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(tradeId)) {
      console.error(`[TRADE SERVER] Invalid trade ID format: ${tradeId}`);
      return res.status(400).json({ error: "Invalid trade ID format" });
    }

    console.log(`[TRADE SERVER] Looking up trade ${tradeId}`);

    // Find the trade with full population for debugging
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("buyer", "displayName steamId")
      .populate("seller", "displayName steamId");

    console.log(
      `[TRADE SERVER] Trade lookup result:`,
      trade ? "Found" : "Not Found"
    );

    if (trade) {
      console.log(`[TRADE SERVER] Trade status: ${trade.status}`);
      console.log(
        `[TRADE SERVER] Trade seller: ${trade.seller._id}, Current user: ${sellerId}`
      );
      console.log(`[TRADE SERVER] Full trade object:`, JSON.stringify(trade));
    }

    // Validate trade exists
    if (!trade) {
      console.error(`[TRADE SERVER] Trade not found: ${tradeId}`);
      return res.status(404).json({ error: "Trade not found" });
    }

    // Validate that the user is the seller
    if (trade.seller._id.toString() !== sellerId.toString()) {
      console.error(
        `[TRADE SERVER] Unauthorized: User ${sellerId} is not the seller of trade ${tradeId}`
      );
      return res
        .status(403)
        .json({ error: "Unauthorized: You are not the seller of this trade" });
    }

    // Log existing status history
    console.log(
      `[TRADE SERVER] Current status history:`,
      JSON.stringify(trade.statusHistory)
    );

    // Check if trade is in the correct status
    if (trade.status !== "awaiting_seller") {
      console.error(
        `[TRADE SERVER] Invalid trade status: ${trade.status} for trade ${tradeId}`
      );
      return res.status(400).json({
        error: "This trade cannot be initiated at this time",
        details: `Current status: ${trade.status}`,
      });
    }

    // Update the trade status directly with Mongoose's findByIdAndUpdate
    console.log(`[TRADE SERVER] Updating trade status directly`);
    let updatedTrade;
    try {
      updatedTrade = await Trade.findByIdAndUpdate(
        tradeId,
        {
          status: "accepted",
          $push: {
            statusHistory: {
              status: "accepted",
              timestamp: new Date(),
              note: "Seller accepted the trade",
            },
          },
        },
        { new: true, runValidators: true }
      ).populate("item");

      console.log(`[TRADE SERVER] Trade status update successful`);
      console.log(
        `[TRADE SERVER] Updated trade:`,
        updatedTrade ? JSON.stringify(updatedTrade) : "No result"
      );
    } catch (updateError) {
      console.error(
        `[TRADE SERVER] Failed to update trade status:`,
        updateError
      );
      return res.status(500).json({
        error: "Failed to update trade status",
        details: updateError.message,
      });
    }

    if (!updatedTrade) {
      console.error(
        `[TRADE SERVER] Failed to update trade: No document returned`
      );
      return res
        .status(500)
        .json({ error: "Failed to update trade: No document returned" });
    }

    console.log(
      `[TRADE SERVER] Trade status updated successfully to: ${updatedTrade.status}`
    );

    // Create notification for the buyer
    const notification = {
      type: "trade",
      title: "Trade Status Updated",
      message: `The seller has accepted your trade for ${updatedTrade.item.name}`,
      relatedTradeId: updatedTrade._id,
      createdAt: new Date(),
    };

    // Add notification to the buyer
    console.log(
      `[TRADE SERVER] Adding notification to buyer: ${updatedTrade.buyer}`
    );
    try {
      await User.findByIdAndUpdate(updatedTrade.buyer, {
        $push: {
          notifications: notification,
        },
      });
      console.log(`[TRADE SERVER] Notification added to buyer`);
    } catch (notifyError) {
      // Don't fail the whole transaction if notification fails
      console.error(`[TRADE SERVER] Failed to add notification:`, notifyError);
    }

    // Send real-time notification via WebSocket if available
    try {
      console.log(`[TRADE SERVER] Sending WebSocket notification`);
      socketService.sendNotification(
        updatedTrade.buyer.toString(),
        notification
      );
    } catch (socketError) {
      console.error(`[TRADE SERVER] Socket notification error:`, socketError);
    }

    console.log(
      `[TRADE SERVER] Trade ${tradeId} initiated by seller ${sellerId}`
    );
    console.log(`[TRADE SERVER] Sending success response`);

    return res.status(200).json({
      success: true,
      message: "Trade initiated successfully",
      trade: updatedTrade,
    });
  } catch (error) {
    console.error(`[TRADE SERVER] Uncaught error in sellerInitiate:`, error);
    return res.status(500).json({
      error: "Failed to initiate trade",
      details: error.message,
    });
  }
};

// Simplified alternative for seller initiation that uses a different approach
exports.sellerInitiateSimple = async (req, res) => {
  console.log(`[TRADE SIMPLE] Starting simplified seller initiation for trade`);

  try {
    const { tradeId } = req.params;
    const sellerId = req.user._id;

    // Verify valid ObjectID
    if (!mongoose.Types.ObjectId.isValid(tradeId)) {
      return res.status(400).json({ error: "Invalid trade ID format" });
    }

    console.log(`[TRADE SIMPLE] Finding trade by ID: ${tradeId}`);

    // Simple update operation without populating first
    const updateResult = await Trade.updateOne(
      {
        _id: tradeId,
        seller: sellerId,
        status: "awaiting_seller",
      },
      {
        $set: {
          status: "accepted",
        },
        $push: {
          statusHistory: {
            status: "accepted",
            timestamp: new Date(),
            note: "Seller accepted the trade (simple method)",
          },
        },
      }
    );

    console.log(`[TRADE SIMPLE] Update result:`, updateResult);

    // Check if document was found and updated
    if (!updateResult || updateResult.matchedCount === 0) {
      console.error(`[TRADE SIMPLE] Trade not found or conditions not met`);
      return res.status(404).json({
        error: "Trade not found or cannot be initiated",
        details:
          "Trade may not exist, you may not be the seller, or status may not be awaiting_seller",
      });
    }

    if (updateResult.modifiedCount === 0) {
      console.error(`[TRADE SIMPLE] Trade matched but not modified`);
      return res.status(500).json({ error: "Failed to update trade status" });
    }

    // Now get the updated trade for response
    const updatedTrade = await Trade.findById(tradeId)
      .populate("item")
      .populate("buyer", "displayName steamId")
      .populate("seller", "displayName steamId");

    console.log(
      `[TRADE SIMPLE] Trade updated successfully, status: ${updatedTrade.status}`
    );

    // Add notification separately - don't fail if this part has issues
    try {
      const notification = {
        type: "trade",
        title: "Trade Status Updated",
        message: `The seller has accepted your trade for ${updatedTrade.item.name}`,
        relatedTradeId: updatedTrade._id,
        createdAt: new Date(),
      };

      await User.findByIdAndUpdate(updatedTrade.buyer, {
        $push: { notifications: notification },
      });

      socketService.sendNotification(
        updatedTrade.buyer.toString(),
        notification
      );
      console.log(`[TRADE SIMPLE] Notification sent to buyer`);
    } catch (notifyError) {
      console.error(
        `[TRADE SIMPLE] Failed to send notification: ${notifyError.message}`
      );
      // Continue anyway - trade was updated successfully
    }

    console.log(`[TRADE SIMPLE] Sending success response`);
    return res.status(200).json({
      success: true,
      message: "Trade initiated successfully",
      trade: updatedTrade,
    });
  } catch (error) {
    console.error(`[TRADE SIMPLE] Error in sellerInitiateSimple:`, error);
    return res.status(500).json({
      error: "Failed to initiate trade",
      details: error.message,
    });
  }
};

// PUT /trades/:tradeId/seller-sent-manual
exports.sellerSentManual = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const { tradeOfferId } = req.body;
    const sellerId = req.user._id;

    // Find the trade
    const trade = await Trade.findById(tradeId).populate("item");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify this user is the seller
    if (trade.seller.toString() !== sellerId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to mark this trade as sent" });
    }

    // Check trade status
    if (trade.status !== "accepted") {
      return res.status(400).json({
        error: `Cannot mark a trade as sent in ${trade.status} status`,
      });
    }

    // Update trade status to offer_sent
    trade.status = "offer_sent";
    trade.statusHistory.push({
      status: "offer_sent",
      timestamp: new Date(),
      userId: sellerId,
    });

    // Store trade offer ID if provided
    if (tradeOfferId) {
      // Extract the ID if a full URL was provided
      if (tradeOfferId.includes("tradeoffer")) {
        const parts = tradeOfferId.split("/");
        const idIndex = parts.findIndex((part) => part === "tradeoffer") + 1;
        if (idIndex < parts.length) {
          trade.tradeOfferId = parts[idIndex];
        } else {
          trade.tradeOfferId = tradeOfferId;
        }
      } else {
        trade.tradeOfferId = tradeOfferId;
      }
    }

    await trade.save();

    // Notify buyer
    socketService.sendNotification(trade.buyer, {
      type: "trade",
      title: "Trade Item Sent",
      message: `Seller has sent a trade offer for ${trade.item.marketHashName}. Please check Steam and confirm receipt.`,
      linkTo: `/trades/${trade._id}`,
      trade: trade,
    });

    return res.json({
      success: true,
      message: "Trade marked as sent successfully",
    });
  } catch (err) {
    console.error("Seller sent trade manual error:", err);
    return res.status(500).json({ error: "Failed to mark trade as sent" });
  }
};

// GET /trades/:tradeId/verify-inventory
exports.verifyInventory = async (req, res) => {
  try {
    const { tradeId } = req.params;

    if (!tradeId) {
      return res.status(400).json({ error: "Trade ID is required" });
    }

    console.log(`Verifying inventory for trade: ${tradeId}`);

    // Populate trade with seller details to get their Steam ID
    const trade = await Trade.findById(tradeId)
      .populate("seller", "steamId username")
      .populate("buyer", "steamId username")
      .populate("item");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Debug the trade object to see what's available
    console.log("Trade object for debugging:", {
      tradeId: trade._id,
      seller: trade.seller
        ? {
            id: trade.seller._id,
            steamId: trade.seller.steamId,
            username: trade.seller.username,
          }
        : "No seller",
      buyer: trade.buyer
        ? {
            id: trade.buyer._id,
            steamId: trade.buyer.steamId,
            username: trade.buyer.username,
          }
        : "No buyer",
      item: trade.item
        ? {
            id: trade.item._id,
            name: trade.item.name,
            assetId: trade.assetId || trade.item.assetId || "Not available",
          }
        : "No item",
    });

    // Check if the current user is the buyer
    if (req.user._id.toString() !== trade.buyer._id.toString()) {
      return res
        .status(403)
        .json({ error: "Only the buyer can verify this trade" });
    }

    // Prepare the Steam trade offers link for the buyer
    const tradeOffersLink = "https://steamcommunity.com/my/tradeoffers";

    // Create the result object that will be returned
    const result = {
      success: false,
      message: "",
      tradeOffersLink: tradeOffersLink,
      assetId: trade.assetId || "unknown",
    };

    // Ensure seller has linked Steam account
    if (!trade.seller.steamId) {
      return res
        .status(400)
        .json({ error: "Seller's Steam account is not linked" });
    }

    // Ensure buyer has linked Steam account
    if (!trade.buyer.steamId) {
      return res
        .status(400)
        .json({ error: "Your Steam account is not linked" });
    }

    // Get the asset ID from the trade object directly
    const assetId = trade.assetId;

    // Check if the asset ID is available
    if (!assetId) {
      console.error("Asset ID not found in trade object", trade);
      return res.status(400).json({
        error: "Asset ID not found for this trade",
        tradeOffersLink: tradeOffersLink,
      });
    }

    console.log(`Checking for asset ID ${assetId} in seller's inventory`);

    try {
      // Use the steamwebapi.com API with the provided key to check seller's inventory
      const apiKey = "FSWJNSWYW8QSAQ6W";

      // Add cache-busting parameters to force fresh data
      const timestamp = Date.now();

      // Format the API URL according to the documentation with specific parameters
      // steam_id: The seller's Steam ID
      // game: cs2 (default is cs2 according to docs)
      // parse: 1 (for detailed item information)
      // no_cache: 1 (bypass cache to get fresh data)
      let steamApiUrl = `https://steamwebapi.com/steam/api/inventory?key=${apiKey}&steam_id=${trade.seller.steamId}&parse=1&no_cache=1&_nocache=${timestamp}`;

      console.log(`Checking seller's inventory: ${steamApiUrl}`);

      let response;
      try {
        // Set a longer timeout for the API call (30 seconds)
        response = await axios.get(steamApiUrl, { timeout: 30000 });
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);
      } catch (initialError) {
        console.error(`API request failed: ${initialError.message}`);

        // More detailed error info
        if (initialError.response) {
          console.error(`Status: ${initialError.response.status}`);
          console.error(
            `Headers: ${JSON.stringify(initialError.response.headers)}`
          );
          if (initialError.response.data) {
            console.error(
              `Error data: ${JSON.stringify(initialError.response.data)}`
            );
          }
        }

        throw initialError; // Re-throw to be caught by the outer catch block
      }

      // First check if the request was successful
      if (response.status !== 200) {
        console.error(
          "Steam API returned non-200 status code:",
          response.status
        );
        throw new Error(`Steam API returned status code ${response.status}`);
      }

      console.log("API response received, checking data structure...");

      // Check that we have valid data
      if (!response.data || typeof response.data !== "object") {
        console.error("Invalid response data format:", response.data);
        throw new Error("Invalid response data format from Steam API");
      }

      // Log the data structure to debug
      console.log(
        "Response data structure: ",
        Object.keys(response.data).slice(0, 20)
      ); // Only show first 20 keys to avoid log flooding

      // Check if the keys are numeric which indicates an array-like object
      const keys = Object.keys(response.data);
      const isNumericKeys =
        keys.length > 0 && keys.every((key) => !isNaN(parseInt(key)));

      // Parse the inventory from response data according to the API documentation
      let inventory = [];

      // First determine if we're dealing with an array or array-like object
      if (Array.isArray(response.data)) {
        // The API is returning an array of items directly
        inventory = response.data;
        console.log(`Found ${inventory.length} items in direct array response`);
      } else if (isNumericKeys) {
        // The response is an object with numeric keys (array-like)
        inventory = Object.values(response.data);
        console.log(`Found ${inventory.length} items in numeric-keyed object`);
      } else if (response.data.success === true) {
        // Success response format
        if (response.data.items && Array.isArray(response.data.items)) {
          inventory = response.data.items;
          console.log(
            `Found ${inventory.length} items in the successful response`
          );
        } else if (
          response.data.descriptions &&
          Array.isArray(response.data.descriptions)
        ) {
          inventory = response.data.descriptions;
          console.log(`Found ${inventory.length} item descriptions`);
        } else {
          console.error(
            "Success response doesn't contain expected items array"
          );
          console.log(
            "Response sample:",
            JSON.stringify(response.data).substring(0, 500) + "..."
          );
          throw new Error("Response format doesn't match expected structure");
        }
      } else if (response.data.items && Array.isArray(response.data.items)) {
        // Simple items array format
        inventory = response.data.items;
        console.log(`Found ${inventory.length} items in simple format`);
      } else if (response.data.assets && Array.isArray(response.data.assets)) {
        // Alternative assets array format
        inventory = response.data.assets;
        console.log(`Found ${inventory.length} assets`);
      } else if (response.data.inventory) {
        // Another potential format
        inventory = Array.isArray(response.data.inventory)
          ? response.data.inventory
          : Object.values(response.data.inventory);
        console.log(`Found ${inventory.length} items in inventory object`);
      } else {
        // Log complete response for debugging - but be careful not to flood logs
        if (Object.keys(response.data).length > 10) {
          console.log("Response keys:", Object.keys(response.data));

          // Log a sample of the first item if available
          const firstKey = Object.keys(response.data)[0];
          if (firstKey) {
            console.log(
              "First item sample:",
              JSON.stringify(response.data[firstKey])
            );
          }
        } else {
          console.log(
            "Complete API response:",
            JSON.stringify(response.data).substring(0, 1000) + "..."
          );
        }
        throw new Error("Could not parse inventory data from response");
      }

      // Log sample items for debugging
      if (inventory.length > 0) {
        console.log("Sample item structure:", JSON.stringify(inventory[0]));
      } else {
        console.log("Inventory is empty");
      }

      // Try to find the asset in the inventory - use exact asset ID
      let assetFound = false;
      const assetIdToFind = trade.assetId;
      console.log(`Looking for asset ID: ${assetIdToFind}`);

      // Check each item using multiple possible property names for asset ID
      for (const item of inventory) {
        // These are all possible property names for asset IDs in various formats
        // Based on the actual API response format seen in the logs
        const possibleAssetIdFields = [
          "assetid",
          "asset_id",
          "id",
          "classid",
          "instanceid",
          "asset",
          "market_id",
          "tradable_id",
        ];

        // Check each possible field for a match
        for (const field of possibleAssetIdFields) {
          if (
            item[field] &&
            item[field].toString() === assetIdToFind.toString()
          ) {
            console.log(
              `Found matching asset ID in field "${field}": ${item[field]}`
            );
            assetFound = true;
            break;
          }
        }

        if (assetFound) break;
      }

      // If not found by ID, try by name as fallback
      if (!assetFound && trade.item && trade.item.name) {
        console.log(
          `Asset ID not found, trying to match by item name: ${trade.item.name}`
        );

        for (const item of inventory) {
          // Based on the actual response format seen in the logs
          const nameFields = [
            "markethashname",
            "marketname",
            "market_hash_name",
            "name",
            "market_name",
            "item_name",
          ];
          let itemName = null;

          // Try each possible name field
          for (const field of nameFields) {
            if (item[field]) {
              itemName = item[field];
              break;
            }
          }

          if (itemName && itemName === trade.item.name) {
            console.log(`Found item by name match: ${itemName}`);
            assetFound = true;
            break;
          }
        }
      }

      result.itemInSellerInventory = assetFound;
      result.assetId = assetIdToFind; // Always include the asset ID in the result

      if (assetFound) {
        result.message =
          "The item is still in the seller's inventory. The trade offer may not have been sent or accepted yet.";
        result.success = false;
      } else {
        result.message =
          "The item is no longer in the seller's inventory. It may have been transferred to your inventory.";
        result.success = true;
      }
    } catch (error) {
      console.error("Error checking inventory:", error);
      result.success = false;
      result.message = `Failed to check seller inventory: ${error.message}`;
      result.tradeOffersLink = tradeOffersLink;
      result.assetId = assetId || "unknown";
    }

    return res.json(result);
  } catch (error) {
    console.error("Error in verifyInventory:", error);
    return res.status(500).json({
      error: error.message,
      tradeOffersLink: "https://steamcommunity.com/my/tradeoffers",
    });
  }
};

// This function creates a new trade offer if possible
const handleTradeOfferCreation = async (userId, tradeId) => {
  try {
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      console.error(`Trade ${tradeId} not found for trade offer creation`);
      return false;
    }

    // Don't try to auto-create trade offer - we're using manual trading
    // Just log the information that would be needed
    console.log(`Trade offer creation info:
      - Seller: ${userId}
      - Buyer Trade URL: ${trade.buyerTradeUrl}
      - Item Asset ID: ${trade.assetId}
      - Item appid: 730 (CS2)
    `);

    return true;

    /* Commenting out automatic trade offer creation
    // Get the seller with steamLoginSecure for the Steam API
    const seller = await User.findById(userId).select("+steamLoginSecure");
    
    // Only attempt to create a trade offer if the seller has their steamLoginSecure token
    if (seller.steamLoginSecure) {
      try {
        // Create a trade offer using Steam API
        const tradeOfferResult = await steamApiService.createTradeOffer(
          seller.steamLoginSecure,
          trade.buyerTradeUrl,
          [trade.assetId],
          [],
          `Item purchase from CS2 Marketplace for trade #${trade._id}`
        );
        
        if (tradeOfferResult.success) {
          // Update trade with the new offer ID
          trade.tradeOfferId = tradeOfferResult.tradeOfferId;
          await trade.save();
          
          console.log(`Trade offer created successfully: ${tradeOfferResult.tradeOfferId}`);
          return true;
        } else {
          console.error(`Failed to create trade offer: ${tradeOfferResult.error}`);
        }
      } catch (err) {
        console.error(`Error creating trade offer: ${err.message}`);
      }
    }
    */

    return false;
  } catch (err) {
    console.error(`Error in handleTradeOfferCreation: ${err.message}`);
    return false;
  }
};

module.exports = exports;
