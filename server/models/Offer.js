const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const offerSchema = new Schema({
  buyer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  item: {
    type: Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: "USD",
  },
  message: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "expired", "withdrawn"],
    default: "pending",
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  },
  counterOffer: {
    type: Schema.Types.ObjectId,
    ref: "Offer",
  },
  isCounterOffer: {
    type: Boolean,
    default: false,
  },
  originalOffer: {
    type: Schema.Types.ObjectId,
    ref: "Offer",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for expired offers
offerSchema.index({ expiresAt: 1 });
// Index for buyer and item to find buyer's offers for a specific item
offerSchema.index({ buyer: 1, item: 1 });
// Index for item and status to find pending offers for a specific item
offerSchema.index({ item: 1, status: 1 });

module.exports = mongoose.model("Offer", offerSchema);
