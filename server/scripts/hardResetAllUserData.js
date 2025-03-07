/**
 * Hard Reset User Data - For Use on Render.com
 * This script:
 * 1. Removes ALL trade data from any known collection
 * 2. Disconnects all Steam inventories
 * 3. Clears trade references from user records
 *
 * WARNING: This will reset your application to a state with NO trade history!
 */

// First, load environment variables for the database connection
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  throw new Error(
    "No MongoDB URI found. Please set MONGO_URI or MONGODB_URI environment variable."
  );
}

const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully");
    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    return false;
  }
}

async function hardResetAllUserData() {
  try {
    console.log("Starting hard reset of all user data...");

    // Get all relevant models (with error handling for missing models)
    const models = {};
    try {
      models.User = mongoose.model("User");
      console.log("Found User model");
    } catch (e) {
      console.log("User model not found, will be created if needed");
      models.User = mongoose.model(
        "User",
        new mongoose.Schema({}, { strict: false })
      );
    }

    try {
      models.Trade = mongoose.model("Trade");
      console.log("Found Trade model");
    } catch (e) {
      console.log("Trade model not found, will be created if needed");
      models.Trade = mongoose.model(
        "Trade",
        new mongoose.Schema({}, { strict: false })
      );
    }

    try {
      models.Item = mongoose.model("Item");
      console.log("Found Item model");
    } catch (e) {
      console.log("Item model not found, will be created if needed");
      models.Item = mongoose.model(
        "Item",
        new mongoose.Schema({}, { strict: false })
      );
    }

    // Step 1: Delete all trades
    console.log("Deleting all trades...");
    const tradeDeleteResult = await models.Trade.deleteMany({});
    console.log(`Deleted ${tradeDeleteResult.deletedCount} trade records`);

    // Step 2: Update all items to not be in a trade state
    console.log("Updating all items to clear trade flags...");
    const itemUpdateResult = await models.Item.updateMany(
      {},
      {
        $set: {
          isListed: false,
          inTrade: false,
          pendingTrade: false,
        },
        $unset: {
          currentTrade: "",
          tradeHistory: "",
        },
      }
    );
    console.log(`Updated ${itemUpdateResult.modifiedCount} item records`);

    // Step 3: Update all user documents to clear trade references
    console.log("Updating all user documents to remove trade references...");
    const userUpdateResult = await models.User.updateMany(
      {},
      {
        $unset: {
          trades: "",
          tradeHistory: "",
          lastTrade: "",
          currentTrades: "",
          pendingTrades: "",
          steamInventoryLastFetched: "",
          currentOffers: "",
        },
        $set: {
          steamInventoryConnected: false,
          refreshToken: null,
          sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 0] }, 1] },
        },
      }
    );
    console.log(`Updated ${userUpdateResult.modifiedCount} user documents`);

    // Step 4: Look for any other collections that might contain trade data
    console.log("Checking for other collections with trade-related data...");

    // Get all collection names
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    for (const collection of collections) {
      const collectionName = collection.name;

      // Skip collections we've already processed
      if (["users", "trades", "items"].includes(collectionName.toLowerCase())) {
        continue;
      }

      // Check if this collection might contain trade data
      if (
        collectionName.toLowerCase().includes("trade") ||
        collectionName.toLowerCase().includes("offer")
      ) {
        console.log(
          `Found potential trade-related collection: ${collectionName}`
        );
        try {
          const coll = mongoose.connection.db.collection(collectionName);
          const count = await coll.countDocuments();
          console.log(
            `Collection ${collectionName} contains ${count} documents`
          );

          if (count > 0) {
            const result = await coll.deleteMany({});
            console.log(
              `Deleted ${result.deletedCount} documents from ${collectionName}`
            );
          }
        } catch (e) {
          console.error(
            `Error processing collection ${collectionName}:`,
            e.message
          );
        }
      }
    }

    console.log("Hard reset completed successfully");
    return {
      success: true,
      tradesDeleted: tradeDeleteResult.deletedCount,
      itemsUpdated: itemUpdateResult.modifiedCount,
      usersUpdated: userUpdateResult.modifiedCount,
    };
  } catch (error) {
    console.error("Error during hard reset:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Main function
async function main() {
  try {
    const connected = await connectDB();
    if (!connected) {
      console.error("Could not connect to the database. Exiting...");
      process.exit(1);
    }

    const result = await hardResetAllUserData();
    console.log("Reset operation result:", result);

    await mongoose.connection.close();
    console.log("Database connection closed");

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the main function
main();
