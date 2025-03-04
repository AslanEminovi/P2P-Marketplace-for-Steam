const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["deposit", "withdrawal", "sale", "purchase", "fee"],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["USD", "GEL"], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
  },
  reference: { type: String }, // Payment processor reference ID
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "offer",
      "trade",
      "trade_update",
      "message",
      "system",
      "transaction",
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String }, // Optional link to navigate to
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  steamId: { type: String, required: true, unique: true },
  displayName: String,
  profileUrl: String,
  avatar: String,
  avatarMedium: String,
  avatarFull: String,
  email: { type: String },
  phone: { type: String },

  // Wallet balance for compatibility with existing code
  walletBalance: { type: Number, default: 0 },
  walletBalanceGEL: { type: Number, default: 0 },

  steamLoginSecure: {
    type: String,
    select: false, // Don't include in regular queries for security
  },
  tradeUrl: { type: String }, // User's Steam trade URL
  tradeUrlExpiry: { type: Date }, // When trade URL needs refreshing
  tradeHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trade" }],

  isVerified: { type: Boolean, default: false },
  verificationLevel: { type: Number, default: 0 }, // 0: None, 1: Email, 2: Phone, 3: ID

  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      trades: { type: Boolean, default: true },
    },
    currency: { type: String, enum: ["USD", "GEL"], default: "USD" },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
  },

  transactions: [transactionSchema],
  notifications: [notificationSchema],

  isBanned: { type: Boolean, default: false },
  banReason: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: { type: Date },
});

// Create compound index for faster notification queries
userSchema.index({ "notifications.read": 1, "notifications.createdAt": -1 });

module.exports = mongoose.model("User", userSchema);
