/**
 * Script to fix all trades with missing or generic item data
 *
 * This script will find all trades that have generic or missing item names
 * and update them with proper item details from Steam API data.
 *
 * Run this on render.com using:
 * node server/scripts/fixAllGlitchedTrades.js
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

// List of known CS2 items by asset ID
const knownItems = {
  // Five-SeveN | Forest Night (Field-Tested)
  41301620924: {
    name: "Five-SeveN | Forest Night (Field-Tested)",
    image:
      "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposLOzLhRlxfbaTjVbvYS0h_LgNziomvLRd6gF18J0fTyQoN2j0AfkrUtlNjin8o_FIA5vYw2E81fugOiov8TvtCdSQV2I/360fx360f",
    wear: "Field-Tested",
    rarity: "Consumer Grade",
  },
  // AK-47 | Redline (Field-Tested)
  25802438317: {
    name: "AK-47 | Redline (Field-Tested)",
    image:
      "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_n1pTptM6azHNlpGB8srVJ5QvK/360fx360f",
    wear: "Field-Tested",
    rarity: "Classified",
  },
  // AWP | Asiimov (Field-Tested)
  25802438301: {
    name: "AWP | Asiimov (Field-Tested)",
    image:
      "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7cqWdQ-sJ0xOzAot-jiQa2_xBqYzvzLdSVJlQ3NQvR-FfsxL3qh5e7vM6bzSAysyVwtnbayxKpwUYbEEvK7_M/360fx360f",
    wear: "Field-Tested",
    rarity: "Covert",
  },
  // Add more known items as needed
};

// Fix trades with generic item names
async function fixGlitchedTrades() {
  try {
    // Register the model
    const Trade = mongoose.model("Trade", tradeSchema);

    console.log("Looking for trades with generic or missing item data...");

    // Find trades missing proper item names
    const trades = await Trade.find({
      $or: [
        { itemName: { $exists: false } },
        { itemName: { $regex: /^CS2 Item/ } },
        { itemName: { $regex: /^Item #/ } },
        { itemName: "Unknown Item" },
      ],
    });

    console.log(
      `Found ${trades.length} trades with generic or missing item data`
    );

    let updated = 0;
    let knownUpdated = 0;

    // Process each trade
    for (const trade of trades) {
      const assetId = trade.assetId;

      // Check if we have known data for this asset ID
      if (assetId && knownItems[assetId]) {
        const itemData = knownItems[assetId];

        trade.itemName = itemData.name;
        trade.itemImage = itemData.image;
        trade.itemWear = itemData.wear;
        trade.itemRarity = itemData.rarity;

        await trade.save();
        knownUpdated++;
        console.log(
          `Updated trade ID: ${trade._id} with known item data for asset ID: ${assetId}`
        );
      } else {
        // For unknown items, at least improve the formatting
        if (assetId) {
          trade.itemName = `CS2 Item (${assetId})`;
          await trade.save();
          updated++;
        }
      }
    }

    console.log(`Fix summary:`);
    console.log(`- ${knownUpdated} trades updated with known item data`);
    console.log(`- ${updated} trades updated with improved formatting`);
    console.log(`- ${trades.length - knownUpdated - updated} trades unchanged`);
  } catch (error) {
    console.error("Error during fix:", error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix function
fixGlitchedTrades();
