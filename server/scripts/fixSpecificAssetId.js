/**
 * Script to fix the specific asset ID 41301620924 with correct information
 *
 * This script directly updates all trades with asset ID 41301620924
 * with the correct item information from Steam.
 *
 * Run this on render.com using:
 * node server/scripts/fixSpecificAssetId.js
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

// Fix the specific asset ID with correct information
async function fixSpecificAssetId() {
  try {
    // Register the model
    const Trade = mongoose.model("Trade", tradeSchema);

    // Target asset ID
    const targetAssetId = "41301620924";

    // Find all trades with the specific assetId
    const trades = await Trade.find({ assetId: targetAssetId });
    console.log(`Found ${trades.length} trades with asset ID ${targetAssetId}`);

    // Correct information for this asset ID (Five-SeveN | Forest Night)
    // This information was obtained from Steam API and verified
    const correctInfo = {
      itemName: "Five-SeveN | Forest Night (Field-Tested)",
      itemImage:
        "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposLOzLhRlxfbaTjVbvYS0h_LgNziomvLRd6gF18J0fTyQoN2j0AfkrUtlNjin8o_FIA5vYw2E81fugOiov8TvtCdSQV2I/360fx360f",
      itemWear: "Field-Tested",
      itemRarity: "Consumer Grade",
    };

    // Update all matching trades with correct information
    let updated = 0;
    for (const trade of trades) {
      trade.itemName = correctInfo.itemName;
      trade.itemImage = correctInfo.itemImage;
      trade.itemWear = correctInfo.itemWear;
      trade.itemRarity = correctInfo.itemRarity;

      await trade.save();
      updated++;
      console.log(`Updated trade ID: ${trade._id}`);
    }

    console.log(
      `Successfully updated ${updated} trades with correct data for asset ID ${targetAssetId}`
    );

    // Also check if there's an Item document for this asset ID
    const Item = mongoose.model(
      "Item",
      new mongoose.Schema({}, { strict: false })
    );
    const items = await Item.find({ assetId: targetAssetId });

    if (items.length > 0) {
      console.log(`Found ${items.length} items with asset ID ${targetAssetId}`);

      // Update each item with correct information
      for (const item of items) {
        item.marketHashName = correctInfo.itemName;
        item.imageUrl = correctInfo.itemImage;
        item.wear = correctInfo.itemWear;
        item.rarity = correctInfo.itemRarity;

        await item.save();
        console.log(`Updated item ID: ${item._id}`);
      }
    } else {
      console.log(`No items found with asset ID ${targetAssetId}`);
    }
  } catch (error) {
    console.error("Error during fix:", error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix function
fixSpecificAssetId();
