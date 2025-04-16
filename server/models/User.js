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
  firstName: String,
  lastName: String,
  profileUrl: String,
  avatar: String,
  avatarMedium: String,
  avatarFull: String,
  email: { type: String },
  phone: { type: String },

  profileComplete: { type: Boolean, default: false },
  registrationDate: { type: Date, default: Date.now },

  country: { type: String },
  city: { type: String },

  walletBalance: { type: Number, default: 0 },
  walletBalanceGEL: { type: Number, default: 0 },

  steamLoginSecure: {
    type: String,
    select: false,
  },
  tradeUrl: { type: String },
  tradeUrlExpiry: { type: Date },
  tradeHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trade" }],

  isVerified: { type: Boolean, default: false },
  verificationLevel: { type: Number, default: 0 },

  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      trades: { type: Boolean, default: true },
    },
    currency: { type: String, enum: ["USD", "GEL"], default: "USD" },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      showInventoryValue: { type: Boolean, default: false },
    },
  },

  transactions: [transactionSchema],
  notifications: [notificationSchema],

  isBanned: { type: Boolean, default: false },
  banReason: { type: String },

  isAdmin: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: { type: Date },
  lastActive: { type: Date },
  isOnline: { type: Boolean, default: false },
});

userSchema.index({ "notifications.read": 1, "notifications.createdAt": -1 });

module.exports = mongoose.model("User", userSchema);
