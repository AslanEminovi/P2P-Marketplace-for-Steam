const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["offer", "trade", "system", "item"],
    default: "system",
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
    default: null,
  },
  relatedItemId: {
    type: Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },
  offerId: {
    type: Schema.Types.ObjectId,
    ref: "Offer",
    default: null,
  },
  tradeId: {
    type: Schema.Types.ObjectId,
    ref: "Trade",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for finding user's notifications efficiently
notificationSchema.index({ user: 1, createdAt: -1 });
// Index for finding unread notifications
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
