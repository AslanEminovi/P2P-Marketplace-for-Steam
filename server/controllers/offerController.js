const Item = require("../models/Item");
const User = require("../models/User");
const mongoose = require("mongoose");

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
      return res.status(400).json({ error: "Item is not currently listed for sale." });
    }

    if (!item.allowOffers) {
      return res.status(400).json({ error: "This item does not accept offers." });
    }

    // Prevent offering on your own items
    if (item.owner._id.toString() === buyerId.toString()) {
      return res.status(400).json({ error: "You cannot make an offer on your own item." });
    }

    // Check if user already has a pending offer for this item
    const existingOffer = item.offers.find(
      offer => 
        offer.offeredBy.toString() === buyerId.toString() && 
        offer.status === 'pending'
    );

    if (existingOffer) {
      return res.status(400).json({ 
        error: "You already have a pending offer for this item. Cancel it before making a new offer." 
      });
    }

    // Create offer with expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Add offer to item
    const newOffer = {
      offeredBy: buyerId,
      offerAmount: offerAmount,
      offerCurrency: offerCurrency || 'USD',
      offerRate: offerRate || (offerCurrency === 'GEL' ? item.currencyRate : null),
      message: message || `Offer for ${item.marketHashName}`,
      createdAt: new Date(),
      expiresAt: expiresAt,
      status: 'pending'
    };

    item.offers.push(newOffer);
    await item.save();

    // Add notification for item owner
    const owner = await User.findById(item.owner._id);
    if (owner) {
      owner.notifications.push({
        type: 'offer',
        title: 'New Offer Received',
        message: `You received a new offer of ${offerAmount} ${offerCurrency || 'USD'} for your ${item.marketHashName}`,
        link: `/marketplace/item/${item._id}`,
        relatedItemId: item._id,
        read: false
      });
      await owner.save();
    }

    return res.status(201).json({ 
      success: true, 
      message: "Offer submitted successfully", 
      offerId: item.offers[item.offers.length - 1]._id 
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
      'offers.status': 'pending'
    }).populate('offers.offeredBy');

    // Transform the data to make it easier to consume
    const offers = [];
    
    items.forEach(item => {
      item.offers.forEach(offer => {
        if (offer.status === 'pending') {
          offers.push({
            offerId: offer._id,
            itemId: item._id,
            itemName: item.marketHashName,
            itemImage: item.imageUrl,
            offeredBy: offer.offeredBy ? {
              id: offer.offeredBy._id,
              displayName: offer.offeredBy.displayName,
              avatar: offer.offeredBy.avatar
            } : null,
            offerAmount: offer.offerAmount,
            offerCurrency: offer.offerCurrency,
            offerRate: offer.offerRate,
            message: offer.message,
            createdAt: offer.createdAt,
            expiresAt: offer.expiresAt
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
      'offers.offeredBy': req.user._id
    }).populate('owner');

    // Transform the data to make it easier to consume
    const offers = [];
    
    items.forEach(item => {
      item.offers.forEach(offer => {
        if (offer.offeredBy && offer.offeredBy.toString() === req.user._id.toString()) {
          offers.push({
            offerId: offer._id,
            itemId: item._id,
            itemName: item.marketHashName,
            itemImage: item.imageUrl,
            owner: {
              id: item.owner._id,
              displayName: item.owner.displayName,
              avatar: item.owner.avatar
            },
            offerAmount: offer.offerAmount,
            offerCurrency: offer.offerCurrency,
            offerRate: offer.offerRate,
            status: offer.status,
            message: offer.message,
            createdAt: offer.createdAt,
            expiresAt: offer.expiresAt
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
    
    // Find the item and verify ownership
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }
    
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You don't have permission to accept offers for this item." });
    }
    
    // Find the specific offer
    const offer = item.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }
    
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Offer cannot be accepted because it is ${offer.status}.` });
    }
    
    // Get the buyer
    const buyer = await User.findById(offer.offeredBy);
    if (!buyer) {
      return res.status(404).json({ error: "Buyer not found." });
    }
    
    // Check buyer has enough balance
    const requiredBalance = offer.offerCurrency === 'USD' 
      ? offer.offerAmount 
      : offer.offerAmount / (offer.offerRate || item.currencyRate);
      
    // Get the seller with steamLoginSecure for the Steam API
    const seller = await User.findById(req.user._id).select('+steamLoginSecure');
    
    if (!seller.steamLoginSecure) {
      return res.status(400).json({ error: "You need to re-authenticate with Steam to accept offers. Please update your Steam login secure token." });
    }
    
    if (!seller.tradeUrl) {
      return res.status(400).json({ error: "You need to set up your trade URL before accepting offers." });
    }
    
    if (!item.assetId) {
      return res.status(400).json({ error: "This item doesn't have a valid Asset ID for trading." });
    }
    
    try {
      // Create a new Trade document
      const Trade = mongoose.model('Trade');
      const trade = new Trade({
        seller: seller._id,
        buyer: buyer._id,
        item: item._id,
        sellerSteamId: seller.steamId,
        buyerSteamId: buyer.steamId,
        assetId: item.assetId,
        price: offer.offerAmount,
        currency: offer.offerCurrency,
        message: offer.message || `Offer accepted for ${item.marketHashName}`,
        status: 'created'
      });
      
      // Save it to get an ID
      await trade.save();
      
      // Create Steam trade offer
      const steamApiService = require('../services/steamApiService');
      const steamOffer = await steamApiService.createTradeOffer(
        seller.steamLoginSecure,
        buyer.steamId,
        buyer.tradeUrl,
        item.assetId,  // item from seller
        '',  // no items from buyer
        `CS2 Marketplace Georgia - ${offer.offerAmount} ${offer.offerCurrency}`
      );
      
      // Update trade with Steam trade offer ID
      trade.tradeOfferId = steamOffer.tradeofferid;
      trade.status = 'pending';
      trade.addStatusHistory('pending', 'Steam trade offer created');
      await trade.save();
      
      // Update offer status
      offer.status = 'accepted';
      
      // Update item status
      item.isListed = false;  // Remove from marketplace
      item.tradeStatus = 'pending';
      item.tradeOfferId = steamOffer.tradeofferid;
      
      // Set all other offers to declined
      item.offers.forEach(otherOffer => {
        if (otherOffer._id.toString() !== offerId && otherOffer.status === 'pending') {
          otherOffer.status = 'declined';
        }
      });
      
      await item.save();
      
      // Add trade to both users' trade history
      await User.findByIdAndUpdate(seller._id, {
        $push: { tradeHistory: trade._id }
      });
      
      await User.findByIdAndUpdate(buyer._id, {
        $push: { tradeHistory: trade._id }
      });
      
      // Add notification for the buyer
      buyer.notifications.push({
        type: 'offer',
        title: 'Offer Accepted',
        message: `Your offer of ${offer.offerAmount} ${offer.offerCurrency} for ${item.marketHashName} has been accepted. Check your Steam trade offers.`,
        link: `/trades/${trade._id}`,
        relatedItemId: item._id,
        read: false
      });
      await buyer.save();
      
      return res.json({ 
        success: true, 
        message: "Offer accepted successfully. A Steam trade offer has been sent.",
        tradeId: trade._id,
        tradeOfferId: steamOffer.tradeofferid
      });
    } catch (steamError) {
      console.error("Steam API error:", steamError);
      return res.status(500).json({ 
        error: "Failed to create Steam trade offer", 
        details: steamError.message || "Steam API error" 
      });
    }
  } catch (err) {
    console.error("Accept offer error:", err);
    return res.status(500).json({ error: "Failed to accept offer." });
  }
};

// PUT /offers/:itemId/:offerId/decline
exports.declineOffer = async (req, res) => {
  try {
    const { itemId, offerId } = req.params;
    
    // Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }
    
    // Verify ownership or check if it's the offer creator
    const isOwner = item.owner.toString() === req.user._id.toString();
    
    // Find the specific offer
    const offer = item.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found." });
    }
    
    const isOfferCreator = offer.offeredBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isOfferCreator) {
      return res.status(403).json({ error: "You don't have permission to decline this offer." });
    }
    
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Offer cannot be declined because it is ${offer.status}.` });
    }
    
    // Update offer status
    offer.status = 'declined';
    await item.save();
    
    // Add notification for the appropriate party
    if (isOwner) {
      // Notify the offer creator that their offer was declined
      const offerer = await User.findById(offer.offeredBy);
      if (offerer) {
        offerer.notifications.push({
          type: 'offer',
          title: 'Offer Declined',
          message: `Your offer of ${offer.offerAmount} ${offer.offerCurrency} for ${item.marketHashName} was declined`,
          link: `/marketplace/item/${itemId}`,
          relatedItemId: item._id,
          read: false
        });
        await offerer.save();
      }
    } else {
      // Notify the item owner that the offer was withdrawn
      const owner = await User.findById(item.owner);
      if (owner) {
        owner.notifications.push({
          type: 'offer',
          title: 'Offer Withdrawn',
          message: `An offer of ${offer.offerAmount} ${offer.offerCurrency} for your ${item.marketHashName} was withdrawn`,
          link: `/marketplace/item/${itemId}`,
          relatedItemId: item._id,
          read: false
        });
        await owner.save();
      }
    }
    
    return res.json({ 
      success: true, 
      message: isOfferCreator ? "Offer withdrawn successfully" : "Offer declined successfully"
    });
  } catch (err) {
    console.error("Decline offer error:", err);
    return res.status(500).json({ error: "Failed to decline offer." });
  }
};

// POST /offers/:itemId/:offerId/counterOffer
exports.createCounterOffer = async (req, res) => {
  try {
    const { itemId, offerId } = req.params;
    const { counterAmount, counterCurrency, counterRate, message } = req.body;
    
    // Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }
    
    // Verify ownership
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You don't have permission to make counter offers for this item." });
    }
    
    // Find the specific offer
    const originalOffer = item.offers.id(offerId);
    if (!originalOffer) {
      return res.status(404).json({ error: "Original offer not found." });
    }
    
    if (originalOffer.status !== 'pending') {
      return res.status(400).json({ error: `Cannot counter an offer that is ${originalOffer.status}.` });
    }
    
    // Update original offer status to counter-offered
    originalOffer.status = 'declined';
    
    // Create new counter offer
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    const counterOffer = {
      offeredBy: req.user._id, // The seller is making the counter offer
      offerAmount: counterAmount,
      offerCurrency: counterCurrency || 'USD',
      offerRate: counterRate || (counterCurrency === 'GEL' ? item.currencyRate : null),
      message: message || `Counter offer for ${item.marketHashName}`,
      createdAt: new Date(),
      expiresAt: expiresAt,
      status: 'pending',
      isCounterOffer: true,
      originalOfferId: offerId
    };
    
    item.offers.push(counterOffer);
    await item.save();
    
    // Add notification for the original offerer
    const offerer = await User.findById(originalOffer.offeredBy);
    if (offerer) {
      offerer.notifications.push({
        type: 'offer',
        title: 'Counter Offer Received',
        message: `You received a counter offer of ${counterAmount} ${counterCurrency || 'USD'} for ${item.marketHashName}`,
        link: `/marketplace/item/${itemId}`,
        relatedItemId: item._id,
        read: false
      });
      await offerer.save();
    }
    
    return res.status(201).json({ 
      success: true, 
      message: "Counter offer submitted successfully",
      offerId: item.offers[item.offers.length - 1]._id 
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
    const user = await User.findById(userId).select('+steamLoginSecure');
    
    if (!user.steamLoginSecure) {
      return res.status(400).json({ error: "You need to provide your Steam login secure token to check trade offers." });
    }
    
    const steamApiService = require('../services/steamApiService');
    
    // Get both sent and received offers in parallel
    const [sent, received] = await Promise.all([
      steamApiService.getSentTradeOffers(user.steamLoginSecure),
      steamApiService.getReceivedTradeOffers(user.steamLoginSecure)
    ]);
    
    return res.json({
      sent: sent,
      received: received
    });
  } catch (err) {
    console.error("Check Steam trade offers error:", err);
    return res.status(500).json({ error: "Failed to retrieve Steam trade offers." });
  }
};

// POST /offers/steam/login-secure
exports.updateSteamLoginSecure = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    
    if (!token) {
      return res.status(400).json({ error: "Steam login secure token is required." });
    }
    
    // Update user's steam login secure token
    await User.findByIdAndUpdate(userId, {
      steamLoginSecure: token
    });
    
    return res.json({ 
      success: true, 
      message: "Steam login secure token updated successfully."
    });
  } catch (err) {
    console.error("Update Steam login secure token error:", err);
    return res.status(500).json({ error: "Failed to update Steam login secure token." });
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
    if (!tradeUrl.includes('steamcommunity.com/tradeoffer/new/')) {
      return res.status(400).json({ error: "Invalid trade URL format." });
    }
    
    // Set expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Update user's trade URL
    await User.findByIdAndUpdate(userId, {
      tradeUrl: tradeUrl,
      tradeUrlExpiry: expiryDate
    });
    
    return res.json({
      success: true,
      message: "Trade URL updated successfully.",
      expiryDate: expiryDate
    });
  } catch (err) {
    console.error("Update trade URL error:", err);
    return res.status(500).json({ error: "Failed to update trade URL." });
  }
};