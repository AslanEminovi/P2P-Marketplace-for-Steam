/**
 * Fix script for glitched trade with assetId: 41301620924
 *
 * This script will find all trades with the specified asset ID and
 * update them with the correct item information.
 *
 * Run this on render.com using:
 * node server/scripts/fixGlitchedTrade.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

// MongoDB connection
console.log("Attempting to connect to MongoDB...");
console.log(
  `MongoDB URI: ${process.env.MONGO_URI ? "[CONFIGURED]" : "[MISSING]"}`
);

// Use the correct environment variable as provided by the user
const DB_URI = process.env.MONGO_URI;

if (!DB_URI) {
  console.error("ERROR: MONGO_URI environment variable is not set");
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// Define minimal Trade schema to allow updates
const tradeSchema = new mongoose.Schema(
  {
    assetId: String,
    itemName: String,
    itemImage: String,
    itemWear: String,
    itemRarity: String,
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  },
  { strict: false }
);

// Fix the specific glitched trade
async function fixGlitchedTrade() {
  try {
    // Register the model
    const Trade = mongoose.model("Trade", tradeSchema);

    // Find all trades with the specific assetId
    const trades = await Trade.find({ assetId: "41301620924" });
    console.log(`Found ${trades.length} trades with asset ID 41301620924`);

    // Update all matching trades with correct information
    // This info comes from the Steam API data for this specific item
    let updated = 0;
    for (const trade of trades) {
      trade.itemName = "Five-SeveN | Forest Night (Field-Tested)";
      trade.itemImage =
        "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposLOzLhRlxfbaTjVbvYS0h_LgNziomvLRd6gF18J0fTyQoN2j0AfkrUtlNjin8o_FIA5vYw2E81fugOiov8TvtCdSQV2I/360fx360f";
      trade.itemWear = "Field-Tested";
      trade.itemRarity = "Consumer Grade";
      await trade.save();
      updated++;
      console.log(`Updated trade ID: ${trade._id}`);
    }

    console.log(
      `Successfully updated ${updated} trades with correct data for asset ID 41301620924`
    );
  } catch (error) {
    console.error("Error during fix:", error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix function
fixGlitchedTrade();
