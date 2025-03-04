const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  
  // Steam trade info
  tradeOfferId: { type: String },
  sellerSteamId: { type: String, required: true },
  buyerSteamId: { type: String, required: true },
  assetId: { type: String, required: true },
  
  // Payment info
  price: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'GEL'], default: 'USD' },
  feeAmount: { type: Number, default: 0 },
  
  // Trade status tracking
  status: {
    type: String, 
    enum: ['created', 'pending', 'accepted', 'declined', 'cancelled', 'completed', 'failed', 'timed_out', 'awaiting_seller', 'offer_sent', 'item_received', 'awaiting_confirmation'],
    default: 'created'
  },
  statusHistory: [{
    status: { type: String },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }],
  
  // Escrow details if using platform escrow
  escrowReleased: { type: Boolean, default: false },
  escrowReleasedAt: { type: Date },
  
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  
  // Webhook data from Steam API
  webhookData: { type: mongoose.Schema.Types.Mixed }
});

// Add indexes for common queries
tradeSchema.index({ status: 1, createdAt: -1 });
tradeSchema.index({ seller: 1, status: 1 });
tradeSchema.index({ buyer: 1, status: 1 });
tradeSchema.index({ tradeOfferId: 1 }, { unique: true, sparse: true });

// Add status tracking methods
tradeSchema.methods.addStatusHistory = function(status, note) {
  this.status = status;
  this.statusHistory.push({
    status: status,
    timestamp: new Date(),
    note: note || ''
  });
  
  if (status === 'completed') {
    this.completedAt = new Date();
  }
  
  return this;
};

module.exports = mongoose.model("Trade", tradeSchema);