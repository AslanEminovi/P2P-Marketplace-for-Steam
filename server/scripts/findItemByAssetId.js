/**
 * Script to find all references to a specific asset ID in the database
 *
 * This script searches the Item collection, Trade collection, and server logs
 * for any references to the specified asset ID (41301620924).
 *
 * Run this on render.com using:
 * node server/scripts/findItemByAssetId.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

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

// Define minimal schemas to query collections
const itemSchema = new mongoose.Schema(
  {
    assetId: String,
    marketHashName: String,
    imageUrl: String,
    wear: String,
    rarity: String,
  },
  { strict: false }
);

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

// Search for the asset ID in the database
async function findAssetIdInDatabase() {
  try {
    // Register models
    const Item = mongoose.model("Item", itemSchema);
    const Trade = mongoose.model("Trade", tradeSchema);

    const targetAssetId = "41301620924";
    console.log(`Searching for asset ID: ${targetAssetId} in database...`);

    // Search Items collection
    const items = await Item.find({ assetId: targetAssetId });
    console.log(`Found ${items.length} items with asset ID ${targetAssetId}`);

    if (items.length > 0) {
      console.log("Item details:");
      items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log(`  Market Hash Name: ${item.marketHashName || "Unknown"}`);
        console.log(`  Image URL: ${item.imageUrl || "Not available"}`);
        console.log(`  Wear: ${item.wear || "Not specified"}`);
        console.log(`  Rarity: ${item.rarity || "Not specified"}`);
        console.log(`  Full Item Data: ${JSON.stringify(item, null, 2)}`);
      });
    }

    // Search Trades collection
    const trades = await Trade.find({ assetId: targetAssetId });
    console.log(
      `\nFound ${trades.length} trades with asset ID ${targetAssetId}`
    );

    if (trades.length > 0) {
      console.log("Trade details:");
      trades.forEach((trade, index) => {
        console.log(`\nTrade ${index + 1}:`);
        console.log(`  Trade ID: ${trade._id}`);
        console.log(`  Item Name: ${trade.itemName || "Unknown"}`);
        console.log(`  Item Image: ${trade.itemImage || "Not available"}`);
        console.log(`  Item Wear: ${trade.itemWear || "Not specified"}`);
        console.log(`  Item Rarity: ${trade.itemRarity || "Not specified"}`);
        console.log(`  Trade Status: ${trade.status || "Unknown"}`);
        console.log(
          `  Created At: ${
            trade.createdAt
              ? new Date(trade.createdAt).toLocaleString()
              : "Unknown"
          }`
        );
      });
    }

    // Search all collections for references to this asset ID
    console.log(
      "\nSearching all collections for references to this asset ID..."
    );

    // Get all collection names
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    for (const collection of collections) {
      const collectionName = collection.name;

      // Skip the collections we've already checked
      if (collectionName === "items" || collectionName === "trades") {
        continue;
      }

      try {
        // Query each collection
        const results = await mongoose.connection.db
          .collection(collectionName)
          .find({
            $or: [
              { assetId: targetAssetId },
              { "item.assetId": targetAssetId },
              { assetid: targetAssetId },
            ],
          })
          .toArray();

        if (results.length > 0) {
          console.log(
            `\nFound ${results.length} references in ${collectionName} collection`
          );
          console.log(JSON.stringify(results, null, 2));
        }
      } catch (error) {
        console.error(`Error querying ${collectionName}:`, error.message);
      }
    }

    // Additional search for text references to the asset ID
    const textSearch = await mongoose.connection.db
      .collection("items")
      .find({ $text: { $search: targetAssetId } })
      .toArray();

    if (textSearch.length > 0) {
      console.log(
        `\nFound ${textSearch.length} items containing the asset ID in text fields`
      );
      console.log(JSON.stringify(textSearch, null, 2));
    }

    console.log("\nDatabase search complete!");
  } catch (error) {
    console.error("Error during database search:", error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the search function
findAssetIdInDatabase();
