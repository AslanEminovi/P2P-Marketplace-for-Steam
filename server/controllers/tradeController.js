const Item = require("../models/Item");
const User = require("../models/User");
const Trade = require("../models/Trade");
const steamApiService = require("../services/steamApiService");
const socketService = require("../services/socketService");
const mongoose = require("mongoose");

// GET /trades/history
exports.getTradeHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // Look up trades where the user is either buyer or seller
    const trades = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("item")
      .populate("buyer", "displayName avatar steamId")
      .populate("seller", "displayName avatar steamId")
      .sort({ createdAt: -1 });

    return res.json(trades);
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

    // Find the trade and populate buyer info
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("buyer", "displayName steamId tradeUrl");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is the seller
    if (trade.seller.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the seller can approve this trade" });
    }

    // Check current trade status
    if (trade.status !== "awaiting_seller") {
      return res.status(400).json({
        error: `Trade cannot be approved because it is in ${trade.status} state`,
      });
    }

    // Make sure the seller has their Steam login secure token
    const seller = await User.findById(userId).select("+steamLoginSecure");

    if (!seller.steamLoginSecure) {
      return res.status(400).json({
        error:
          "You need to update your Steam login secure token to process trades",
      });
    }

    // Update trade status
    trade.addStatusHistory(
      "offer_sent",
      "Seller approved and sent trade offer"
    );
    await trade.save();

    // Add notification to the buyer
    const notification = {
      type: "trade",
      title: "Trade Approved by Seller",
      message: `Seller ${seller.displayName} has approved your purchase of ${trade.item.marketHashName}. Check your Steam trade offers or your trade link.`,
      link: `/trades/${tradeId}`,
      relatedItemId: trade.item._id,
      read: false,
      createdAt: new Date(),
    };

    await User.findByIdAndUpdate(trade.buyer._id, {
      $push: {
        notifications: notification,
      },
    });

    // Send real-time notification via WebSocket
    socketService.sendNotification(trade.buyer._id, notification);

    // Send trade update via WebSocket
    socketService.sendTradeUpdate(
      tradeId,
      trade.buyer._id,
      trade.seller.toString(),
      { status: "offer_sent", item: trade.item, timeUpdated: new Date() }
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
    const trade = await Trade.findById(tradeId);

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
    if (trade.status !== "offer_sent") {
      return res.status(400).json({
        error: `Trade cannot be marked as sent because it is in ${trade.status} state`,
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
    trade.addStatusHistory(
      "awaiting_confirmation",
      "Seller sent Steam trade offer"
    );
    await trade.save();

    // Update the item status
    await Item.findByIdAndUpdate(trade.item, {
      tradeOfferId: tradeOfferId,
      tradeStatus: "pending",
    });

    // Add notification to the buyer
    await User.findByIdAndUpdate(trade.buyer, {
      $push: {
        notifications: {
          type: "trade",
          title: "Trade Item Sent",
          message: `The seller has sent you a trade offer for the ${trade.item.marketHashName}. Please check your Steam trade offers and confirm receipt.`,
          link: `/trades/${tradeId}`,
          relatedItemId: trade.item,
          read: false,
          createdAt: new Date(),
        },
      },
    });

    // Start monitoring the Steam trade
    try {
      const seller = await User.findById(userId).select("+steamLoginSecure");

      if (seller.steamLoginSecure) {
        // Initialize trade history monitoring
        const isProduction = process.env.NODE_ENV === "production";
        const baseUrl = isProduction
          ? process.env.CALLBACK_URL.split("/auth/steam/return")[0]
          : `http://localhost:${process.env.PORT || 5001}`;

        await steamApiService.initTradeHistory(
          seller.steamLoginSecure,
          `${process.env.WEBHOOK_URL || `${baseUrl}/api/webhooks/steam-trade`}`
        );
      }
    } catch (monitorError) {
      console.error("Failed to initialize trade monitoring:", monitorError);
      // Don't fail the request if monitoring setup fails
    }

    return res.json({
      success: true,
      message:
        "Trade marked as sent. The buyer has been notified to confirm receipt.",
      tradeOfferId,
    });
  } catch (err) {
    console.error("Seller sent item error:", err);
    return res
      .status(500)
      .json({ error: "Failed to process trade sent status" });
  }
};

// PUT /trades/:tradeId/buyer-confirm
exports.buyerConfirmReceipt = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;

    // Find the trade with populated data
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("seller")
      .populate("buyer");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify the user is the buyer
    if (trade.buyer._id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the buyer can confirm receipt" });
    }

    // Check current trade status
    if (
      trade.status !== "awaiting_confirmation" &&
      trade.status !== "offer_sent" &&
      trade.status !== "accepted"
    ) {
      return res.status(400).json({
        error: `Trade cannot be confirmed because it is in ${trade.status} state`,
      });
    }

    try {
      // First, check if this trade is already confirmed via Steam API
      if (trade.tradeOfferId) {
        // Get the buyer with steamLoginSecure
        const buyer = await User.findById(userId).select("+steamLoginSecure");

        if (buyer.steamLoginSecure) {
          try {
            // Try to verify with Steam API that the trade was completed
            const steamTrades = await steamApiService.getReceivedTradeOffers(
              buyer.steamLoginSecure
            );

            // Look for the matching trade
            const matchingTrade = steamTrades.trades?.find(
              (t) => t.tradeofferid === trade.tradeOfferId
            );

            if (!matchingTrade || matchingTrade.status !== "accepted") {
              // If the trade doesn't exist or is not accepted in Steam, require verification
              if (req.body.forceConfirm !== true) {
                return res.status(400).json({
                  error:
                    "Trade not found in Steam or not accepted yet. Are you sure you want to confirm?",
                  requireForceConfirm: true,
                });
              }
              // User chose to force confirm, proceed with caution
            }
          } catch (steamError) {
            console.warn("Could not verify Steam trade status:", steamError);
            // Allow confirmation to proceed even if Steam API check fails
          }
        }
      }

      // Process payment - This is the critical part
      // 1. Deduct funds from buyer's wallet
      // 2. Add funds to seller's wallet
      // 3. Update item ownership

      // Get the latest buyer and seller data to ensure accurate balances
      const buyer = await User.findById(trade.buyer._id);
      const seller = await User.findById(trade.seller._id);

      // Calculate amounts
      const price = trade.price;
      const platformFee = trade.feeAmount || price * 0.025; // 2.5% fee
      const sellerReceives = price - platformFee;

      // Make sure buyer has enough balance
      if (trade.currency === "USD" && buyer.walletBalance < price) {
        return res.status(400).json({
          error: "Insufficient USD balance to complete this transaction.",
          required: price,
          available: buyer.walletBalance,
        });
      } else if (trade.currency === "GEL" && buyer.walletBalanceGEL < price) {
        return res.status(400).json({
          error: "Insufficient GEL balance to complete this transaction.",
          required: price,
          available: buyer.walletBalanceGEL,
        });
      }

      // Update buyer's wallet - deduct the payment
      if (trade.currency === "USD") {
        buyer.walletBalance = parseFloat(
          (buyer.walletBalance - price).toFixed(2)
        );
      } else {
        buyer.walletBalanceGEL = parseFloat(
          (buyer.walletBalanceGEL - price).toFixed(2)
        );
      }

      // Find the pending transaction and mark it completed
      const pendingTransaction = buyer.transactions.find(
        (t) => t.reference === trade._id.toString() && t.status === "pending"
      );

      if (pendingTransaction) {
        pendingTransaction.status = "completed";
        pendingTransaction.completedAt = new Date();
      } else {
        // If no pending transaction is found, create a new one
        buyer.transactions.push({
          type: "purchase",
          amount: -price,
          currency: trade.currency,
          itemId: trade.item._id,
          reference: trade._id.toString(),
          status: "completed",
          completedAt: new Date(),
        });
      }

      // Update seller's wallet - add the payment
      if (trade.currency === "USD") {
        seller.walletBalance = parseFloat(
          (seller.walletBalance + sellerReceives).toFixed(2)
        );
      } else {
        seller.walletBalanceGEL = parseFloat(
          (seller.walletBalanceGEL + sellerReceives).toFixed(2)
        );
      }

      // Add transaction record for seller
      seller.transactions.push({
        type: "sale",
        amount: sellerReceives,
        currency: trade.currency,
        itemId: trade.item._id,
        reference: trade._id.toString(),
        status: "completed",
        completedAt: new Date(),
      });

      // Add platform fee transaction for record-keeping
      seller.transactions.push({
        type: "fee",
        amount: -platformFee,
        currency: trade.currency,
        itemId: trade.item._id,
        reference: trade._id.toString(),
        status: "completed",
        completedAt: new Date(),
      });

      // Update the item ownership
      const item = await Item.findById(trade.item._id);
      item.owner = buyer._id;
      item.isListed = false;
      item.tradeStatus = "completed";
      item.priceHistory.push({
        price: price,
        currency: trade.currency,
        timestamp: new Date(),
      });
      await item.save();

      // Update trade status
      trade.addStatusHistory("completed", "Buyer confirmed receipt");
      trade.completedAt = new Date();
      await trade.save();

      // Create notification objects
      const buyerNotification = {
        type: "trade",
        title: "Trade Status Updated",
        message: `You have successfully purchased ${item.marketHashName} for ${
          trade.currency === "USD" ? "$" : ""
        }${price}${trade.currency === "GEL" ? " ₾" : ""}.`,
        relatedItemId: item._id,
        read: false,
        createdAt: new Date(),
      };

      const sellerNotification = {
        type: "trade",
        title: "Trade Status Updated",
        message: `Your ${item.marketHashName} has been sold for ${
          trade.currency === "USD" ? "$" : ""
        }${price}${trade.currency === "GEL" ? " ₾" : ""}. You received ${
          trade.currency === "USD" ? "$" : ""
        }${sellerReceives.toFixed(2)}${
          trade.currency === "GEL" ? " ₾" : ""
        } after fees.`,
        relatedItemId: item._id,
        read: false,
        createdAt: new Date(),
      };

      // Add notifications to database
      buyer.notifications.push(buyerNotification);
      seller.notifications.push(sellerNotification);

      // Send real-time notifications via WebSocket
      socketService.sendNotification(buyer._id.toString(), buyerNotification);
      socketService.sendNotification(seller._id.toString(), sellerNotification);

      // Send trade update via WebSocket
      socketService.sendTradeUpdate(
        trade._id.toString(),
        buyer._id.toString(),
        seller._id.toString(),
        {
          status: "completed",
          item: item,
          completedAt: new Date(),
        }
      );

      // Send inventory update to buyer
      socketService.sendInventoryUpdate(buyer._id.toString(), {
        type: "item_added",
        data: {
          item: item,
          source: "purchase",
          tradeId: trade._id,
        },
      });

      // Send wallet updates
      socketService.sendWalletUpdate(buyer._id.toString(), {
        balance: buyer.walletBalance,
        balanceGEL: buyer.walletBalanceGEL,
        transaction: {
          type: "purchase",
          amount: -price,
          currency: trade.currency,
        },
      });

      socketService.sendWalletUpdate(seller._id.toString(), {
        balance: seller.walletBalance,
        balanceGEL: seller.walletBalanceGEL,
        transaction: {
          type: "sale",
          amount: sellerReceives,
          currency: trade.currency,
        },
      });

      // Save all changes
      await Promise.all([buyer.save(), seller.save()]);

      return res.json({
        success: true,
        message:
          "Trade completed successfully. Item ownership has been transferred.",
      });
    } catch (processError) {
      console.error("Error processing trade payment:", processError);
      return res.status(500).json({ error: "Failed to process trade payment" });
    }
  } catch (err) {
    console.error("Buyer confirm receipt error:", err);
    return res.status(500).json({ error: "Failed to confirm receipt" });
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

    try {
      // Get user with steamLoginSecure
      const user = await User.findById(userId).select("+steamLoginSecure");

      if (!user.steamLoginSecure) {
        return res.status(400).json({
          error: "Steam login secure token is required to check trade status",
        });
      }

      // Check trade offers - try both sent and received
      const promises = [
        steamApiService.getSentTradeOffers(user.steamLoginSecure),
        steamApiService.getReceivedTradeOffers(user.steamLoginSecure),
      ];

      const [sent, received] = await Promise.all(promises);

      // Look for the matching trade in both sent and received
      const allTrades = [...(sent.trades || []), ...(received.trades || [])];
      const matchingTrade = allTrades.find(
        (t) => t.tradeofferid === trade.tradeOfferId
      );

      if (!matchingTrade) {
        return res.json({
          status: "not_found",
          message: "Trade offer not found in Steam",
        });
      }

      // Map Steam status to our system
      let status = matchingTrade.status;
      let statusMessage = `Steam trade status: ${status}`;

      // If trade is accepted in Steam but not in our system
      if (status === "accepted" && trade.status !== "completed") {
        // Update our system to reflect Steam status
        trade.addStatusHistory("completed", "Confirmed via Steam API");
        trade.completedAt = new Date();
        await trade.save();

        // You might want to trigger the payment processing here as well,
        // but for simplicity, we'll just notify the user to confirm manually
        statusMessage =
          "Trade is completed in Steam. Please confirm receipt to complete the transaction.";
      }

      return res.json({
        status,
        message: statusMessage,
        steamDetails: matchingTrade,
      });
    } catch (steamError) {
      console.error("Steam API error:", steamError);
      return res
        .status(500)
        .json({ error: "Failed to check Steam trade status" });
    }
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
    const userId = req.user._id;
    console.log(
      `Verifying inventory for trade ${tradeId} requested by user ${userId}`
    );

    // Find the trade with populated item and seller
    const trade = await Trade.findById(tradeId)
      .populate("item")
      .populate("seller");

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Verify this user is the buyer
    if (trade.buyer.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the buyer can verify item receipt" });
    }

    // Get the seller info if not populated
    if (!trade.seller || !trade.seller.steamId) {
      const seller = await User.findById(trade.seller);
      if (!seller || !seller.steamId) {
        return res
          .status(400)
          .json({ error: "Seller's Steam account not linked" });
      }
      trade.seller = seller;
    }

    // Prepare result object
    const result = {
      itemRemovedFromSellerInventory: false,
      canConfirmReceived: false,
      message: "",
      error: null,
    };

    // Check seller's inventory to verify item is NO LONGER there
    try {
      console.log(
        `Checking seller (${trade.seller.steamId}) inventory for item ${trade.item.marketHashName} with assetId ${trade.item.assetId}`
      );

      if (!trade.seller.steamId) {
        throw new Error("Seller's Steam ID is missing");
      }

      // Force refresh the seller's inventory
      const sellerInventory = await steamApiService.getInventory(
        trade.seller.steamId,
        null, // We don't need appId anymore as we're using 'game' parameter in the API
        true // Force refresh
      );

      const assetId = trade.item.assetId;
      const itemName = trade.item.marketHashName;
      let itemFoundInSellerInventory = false;

      if (sellerInventory && sellerInventory.assets) {
        // Check if the specific asset ID is still in the seller's inventory
        if (assetId) {
          console.log(
            `Looking for asset ID ${assetId} in seller's inventory with ${sellerInventory.assets.length} assets`
          );
          itemFoundInSellerInventory = sellerInventory.assets.some(
            (asset) => asset.assetid === assetId
          );

          if (itemFoundInSellerInventory) {
            console.log(`Asset ID ${assetId} found in seller's inventory`);
          } else {
            console.log(
              `Asset ID ${assetId} NOT found in seller's inventory (good)`
            );
          }
        }
        // If there's no asset ID, fall back to matching by name
        else if (sellerInventory.descriptions) {
          console.log(
            `No asset ID available. Looking for item by name: ${itemName}`
          );
          for (const asset of sellerInventory.assets) {
            const description = sellerInventory.descriptions.find(
              (desc) =>
                desc.classid === asset.classid &&
                desc.instanceid === asset.instanceid
            );

            if (description && description.market_hash_name === itemName) {
              itemFoundInSellerInventory = true;
              console.log(
                `Item "${itemName}" found in seller's inventory by name match`
              );
              break;
            }
          }

          if (!itemFoundInSellerInventory) {
            console.log(
              `Item "${itemName}" NOT found in seller's inventory by name (good)`
            );
          }
        }
      } else {
        console.log(
          `Couldn't properly parse seller's inventory or no assets found.`
        );
      }

      // Update result - if the item is NOT found, that's good!
      result.itemRemovedFromSellerInventory = !itemFoundInSellerInventory;
      result.canConfirmReceived = result.itemRemovedFromSellerInventory;

      if (result.itemRemovedFromSellerInventory) {
        result.message =
          "Item has been withdrawn from seller's inventory. You can confirm receipt.";
      } else {
        result.message =
          "Item is still in seller's inventory. The trade may not have been completed yet.";
      }
    } catch (err) {
      console.error("Seller's inventory check error:", err);
      result.error = err.message;
      result.message =
        "Could not check seller's inventory. You may need to verify manually or try again later.";
    }

    return res.json(result);
  } catch (err) {
    console.error("Verify inventory error:", err);
    return res.status(500).json({ error: "Failed to verify inventory" });
  }
};

module.exports = exports;
