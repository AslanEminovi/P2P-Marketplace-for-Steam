/**
 * Migration script to update trades with item data
 *
 * This script updates all trade records to include item name, image, etc.
 * directly in the trade record for better data preservation.
 *
 * Usage on the server:
 * 1. SSH into the server
 * 2. Navigate to the project directory
 * 3. Run: NODE_ENV=production node server/scripts/migrateTradeItemData.js
 *
 * Note: This script requires access to the MongoDB database and should be run
 * on the server where the environment variables are properly set up.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Trade = require("../models/Trade");
const Item = require("../models/Item");

// MongoDB connection
console.log("Attempting to connect to MongoDB...");
console.log(
  `MongoDB URI: ${process.env.MONGODB_URI ? "[CONFIGURED]" : "[MISSING]"}`
);

// Default to local development MongoDB if environment variable is not set
const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/cs2marketplace";

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

async function migrateTradeData() {
  try {
    console.log("Starting trade data migration...");

    // Get all trades
    const trades = await Trade.find({}).populate("item");
    console.log(`Found ${trades.length} trades to migrate`);

    let updated = 0;
    let skipped = 0;
    let itemMissing = 0;

    for (const trade of trades) {
      // If trade already has item data, skip
      if (trade.itemName && trade.itemImage) {
        skipped++;
        continue;
      }

      if (trade.item) {
        // Item reference exists, update from referenced item
        trade.itemName = trade.item.marketHashName;
        trade.itemImage = trade.item.imageUrl;
        trade.itemWear = trade.item.wear;
        trade.itemRarity = trade.item.rarity;
        await trade.save();
        updated++;
      } else {
        // Item reference is missing, try to look up by assetId
        if (trade.assetId) {
          const item = await Item.findOne({ assetId: trade.assetId });

          if (item) {
            trade.itemName = item.marketHashName;
            trade.itemImage = item.imageUrl;
            trade.itemWear = item.wear;
            trade.itemRarity = item.rarity;
            await trade.save();
            updated++;
          } else {
            // Cannot find item, update with assetId only
            trade.itemName = `CS2 Item (${trade.assetId})`;
            await trade.save();
            itemMissing++;
          }
        } else {
          // No assetId, can't recover data
          trade.itemName = "Unknown Item";
          await trade.save();
          itemMissing++;
        }
      }
    }

    console.log(`Migration complete:`);
    console.log(`- ${updated} trades updated with item data`);
    console.log(`- ${skipped} trades already had item data`);
    console.log(`- ${itemMissing} trades could not be linked to items`);
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

migrateTradeData();
