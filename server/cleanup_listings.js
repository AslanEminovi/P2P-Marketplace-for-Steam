// cleanup_listings.js
// A script to clean up stuck listings in the database

// Only load dotenv if this is run directly, not when imported as a module
if (require.main === module) {
  require("dotenv").config();
} else {
  // When imported as a module, dotenv should already be configured by the parent application
  try {
    require("dotenv");
  } catch (err) {
    // Dotenv is not required when imported as a module if the environment is already configured
    console.log("Note: dotenv not loaded when imported as module");
  }
}

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Setup MongoDB connection
let isConnected = false;

async function connectToMongoDB() {
  if (isConnected) {
    return;
  }

  console.log("Connecting to MongoDB...");
  await mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to MongoDB");
      isConnected = true;
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });
}

// Define schemas for MongoDB models needed
const itemSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  steamItemId: String,
  assetId: String,
  isListed: Boolean,
});

const tradeSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  status: String,
});

// Create models from schemas - only if they don't already exist
let Item, Trade;
try {
  // Try to get existing models first
  Item = mongoose.model("Item");
  Trade = mongoose.model("Trade");
} catch (error) {
  // If models don't exist, create them
  Item = mongoose.model("Item", itemSchema);
  Trade = mongoose.model("Trade", tradeSchema);
}

// Function to clean up stuck listings
async function cleanupStuckListings(userId = null) {
  try {
    await connectToMongoDB();

    console.log("Starting cleanup process...");

    // Create query for finding listed items
    const query = { isListed: true };
    if (userId) {
      query.owner = userId;
      console.log(`Targeting cleanup for user: ${userId}`);
    }

    // Find and update all items that are still marked as listed
    const updateResult = await Item.updateMany(query, {
      $set: { isListed: false },
    });

    console.log(
      `Cleanup completed: ${updateResult.modifiedCount} listings updated`
    );

    // Also clean up any trades that are in pending or offer_sent status
    const tradeUpdateResult = await Trade.updateMany(
      {
        status: { $nin: ["completed", "cancelled"] },
      },
      { $set: { status: "cancelled" } }
    );

    console.log(
      `Trade cleanup completed: ${tradeUpdateResult.modifiedCount} trades updated to cancelled`
    );

    // Close MongoDB connection if the script was run directly
    if (require.main === module) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    }

    return {
      itemsUpdated: updateResult.modifiedCount,
      tradesUpdated: tradeUpdateResult.modifiedCount,
    };
  } catch (error) {
    console.error("Error during cleanup:", error);

    // Close MongoDB connection if the script was run directly
    if (require.main === module) {
      await mongoose.connection.close();
      process.exit(1);
    }

    throw error;
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Check if a user ID was provided as a command-line argument
  const userId = process.argv[2];
  if (userId) {
    cleanupStuckListings(userId);
  } else {
    cleanupStuckListings();
  }
}

// Export the function for use in other modules
module.exports = {
  cleanupStuckListings,
};
