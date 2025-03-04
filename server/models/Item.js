const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  offerAmount: { type: Number, required: true },
  offerCurrency: { type: String, enum: ['USD', 'GEL'], default: 'USD' },
  offerRate: { type: Number }, // Exchange rate if offering in GEL
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const itemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  steamItemId: String, // A reference to the item's unique ID in Steam
  assetId: String, // Unique Steam asset ID for this specific item
  marketHashName: String,
  price: Number, // Price in USD
  currencyRate: { type: Number, default: 1.8 }, // Exchange rate (e.g. 1.8, 1.9, 2.0)
  priceGEL: { type: Number }, // Price in Georgian Lari
  imageUrl: String, // e.g., from the parsed data
  isListed: { type: Boolean, default: false },
  wear: String, // Store the wear condition of the item
  rarity: String, // Rarity level of the item
  createdAt: { type: Date, default: Date.now },
  allowOffers: { type: Boolean, default: true }, // Whether this item accepts offers
  offers: [offerSchema], // Array of offers for this item
  tradelock: { type: Date }, // When item will be tradable if on trade hold
  tradeUrl: { type: String }, // Seller's trade URL
  tradeStatus: { type: String, enum: ['none', 'pending', 'completed', 'failed', 'cancelled'], default: 'none' },
  tradeOfferId: { type: String }, // Steam trade offer ID if in a trade
  
  // Price history for market analysis
  priceHistory: [{
    price: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'GEL'], default: 'USD' },
    timestamp: { type: Date, default: Date.now }
  }]
});

// Compound index to prevent duplicate listings of the same item
itemSchema.index({ owner: 1, assetId: 1, isListed: 1 }, { unique: true });

// Add price to price history when item is listed or price changes
itemSchema.pre('save', function(next) {
  // If this is a new listing or the price has changed
  if ((this.isModified('price') || this.isModified('priceGEL')) && this.isListed) {
    // If priceHistory doesn't exist yet, initialize it
    if (!this.priceHistory) {
      this.priceHistory = [];
    }
    
    // Add current price to history
    if (this.isModified('price')) {
      this.priceHistory.push({
        price: this.price,
        currency: 'USD',
        timestamp: new Date()
      });
    }
    
    // If GEL price exists and was modified, add it too
    if (this.isModified('priceGEL') && this.priceGEL) {
      this.priceHistory.push({
        price: this.priceGEL,
        currency: 'GEL',
        timestamp: new Date()
      });
    }
  }
  next();
});

module.exports = mongoose.model("Item", itemSchema);
