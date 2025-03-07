/**
 * Script to directly query Steam Web API for information about a specific asset ID
 *
 * This script will query the Steam Web API using a provided Steam ID to find details
 * about the specific asset ID 41301620924.
 *
 * Run this on render.com using:
 * node server/scripts/getSteamItemDetails.js
 */

require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");

// MongoDB connection to get Steam IDs
console.log("Attempting to connect to MongoDB...");
console.log(
  `MongoDB URI: ${process.env.MONGO_URI ? "[CONFIGURED]" : "[MISSING]"}`
);

// Use the correct environment variable as provided by the user
const DB_URI = process.env.MONGO_URI;

// Target asset ID
const targetAssetId = "41301620924";

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

// Define minimal schemas
const userSchema = new mongoose.Schema({ steamId: String }, { strict: false });

// Function to query Steam Web API
async function querySteamWebAPI(steamId) {
  try {
    const apiKey = process.env.STEAMWEBAPI_KEY;

    if (!apiKey) {
      console.error("STEAMWEBAPI_KEY environment variable is not set");
      return null;
    }

    console.log(`Querying Steam Web API for Steam ID ${steamId}...`);

    // Add cache busting to ensure fresh data
    const timestamp = Date.now();
    const url = `https://www.steamwebapi.com/steam/api/inventory`;

    // Make the API call
    const response = await axios.get(url, {
      params: {
        key: apiKey,
        steam_id: steamId,
        game: "cs2",
        parse: 1,
        no_cache: 1,
        _nocache: timestamp,
      },
      timeout: 30000,
    });

    console.log(`Steam API responded with status: ${response.status}`);

    if (!response.data) {
      console.log("No data returned from Steam API");
      return null;
    }

    // Extract inventory data
    const inventory = extractInventoryData(response.data);

    // Find the target asset
    const targetItem = findAssetById(inventory, targetAssetId);

    return {
      inventory: inventory,
      targetItem: targetItem,
    };
  } catch (error) {
    console.error("Error querying Steam Web API:", error.message);
    return null;
  }
}

// Function to extract inventory data from API response
function extractInventoryData(data) {
  // Array to store inventory items
  let inventory = [];

  // Check different possible formats
  if (Array.isArray(data)) {
    inventory = data;
    console.log("Data is in array format");
  } else if (data.assets && Array.isArray(data.assets)) {
    inventory = data.assets;
    console.log("Data has assets array");
  } else if (data.items && Array.isArray(data.items)) {
    inventory = data.items;
    console.log("Data has items array");
  } else if (typeof data === "object") {
    console.log("Data is in object format, checking structure...");
    console.log("Keys:", Object.keys(data));

    // Try to detect array-like objects
    const keys = Object.keys(data);
    if (keys.length > 0 && keys.every((key) => !isNaN(parseInt(key)))) {
      inventory = Object.values(data);
      console.log("Data is array-like object with numeric keys");
    }
  }

  console.log(`Extracted ${inventory.length} items from inventory data`);
  return inventory;
}

// Function to find asset by ID
function findAssetById(inventory, assetId) {
  console.log(
    `Searching for asset ID ${assetId} in inventory of ${inventory.length} items`
  );

  // Try different property names for asset ID
  const item = inventory.find(
    (item) =>
      item.assetid === assetId ||
      item.asset_id === assetId ||
      item.id === assetId
  );

  if (item) {
    console.log("Found item with target asset ID!");
    return item;
  }

  console.log("Item not found in inventory. Looking for partial matches...");

  // If not found, try to print a sample item to see structure
  if (inventory.length > 0) {
    console.log(
      "Sample item structure:",
      JSON.stringify(inventory[0], null, 2)
    );

    // Try to find any items that might have the asset ID in a nested property
    for (const item of inventory) {
      const itemJson = JSON.stringify(item);
      if (itemJson.includes(assetId)) {
        console.log(
          "Found item containing the asset ID in some property:",
          itemJson
        );
        return item;
      }
    }
  }

  return null;
}

// Main function
async function main() {
  try {
    // Get steam IDs from the database
    const User = mongoose.model("User", userSchema);

    // Get some users to query
    const users = await User.find({}, "steamId").limit(10);

    if (users.length === 0) {
      console.log("No users found in the database");
      return;
    }

    console.log(`Found ${users.length} users to query`);

    // Try to query each user's inventory
    for (const user of users) {
      if (!user.steamId) continue;

      console.log(
        `\nQuerying inventory for user with Steam ID: ${user.steamId}`
      );
      const result = await querySteamWebAPI(user.steamId);

      if (!result) {
        console.log("No result returned for this user");
        continue;
      }

      if (result.targetItem) {
        console.log("\n========== ITEM FOUND ==========");
        console.log("Item details:");
        console.log(JSON.stringify(result.targetItem, null, 2));
        console.log("===============================\n");

        // We found the item, no need to continue
        return;
      }
    }

    console.log("\nItem not found in any of the queried inventories");
  } catch (error) {
    console.error("Error in main function:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the main function
main();
