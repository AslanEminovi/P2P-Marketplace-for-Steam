/**
 * Script to clear all trade histories from the database
 *
 * Usage (on the server):
 * 1. Navigate to the project root directory
 * 2. Run: NODE_ENV=production node server/scripts/clearTradeHistories.js
 *
 * WARNING: This script will permanently delete all trade records!
 * It should only be used for testing or when required by the product owner.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

// MongoDB connection URI - will use the one from environment variables
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cs2-marketplace";

// Create interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log("Connecting to MongoDB...");
    console.log(`Using MongoDB URI: ${MONGO_URI.substring(0, 15)}...`);

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB successfully.");
    return true;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    return false;
  }
}

// Function to clear all trade histories
async function clearTradeHistories() {
  try {
    // Check if Trade model exists
    let Trade;
    try {
      Trade = mongoose.model("Trade");
    } catch (error) {
      // If model doesn't exist, define it with minimal schema needed for deletion
      const tradeSchema = new mongoose.Schema({}, { strict: false });
      Trade = mongoose.model("Trade", tradeSchema);
    }

    // Get count of trades before deletion
    const tradeCount = await Trade.countDocuments();
    console.log(`Found ${tradeCount} trade records in the database.`);

    if (tradeCount === 0) {
      console.log("No trade records to delete. Exiting...");
      return 0;
    }

    // Ask for confirmation
    await new Promise((resolve) => {
      rl.question(
        `WARNING: You are about to delete ALL ${tradeCount} trade records. This action CANNOT be undone.\nType 'DELETE' to confirm: `,
        (answer) => {
          if (answer.trim() === "DELETE") {
            resolve(true);
          } else {
            console.log("Operation cancelled. No records were deleted.");
            process.exit(0);
          }
        }
      );
    });

    // Perform deletion
    console.log("Deleting trade records...");
    const deleteResult = await Trade.deleteMany({});
    console.log(
      `Successfully deleted ${deleteResult.deletedCount} trade records.`
    );

    // Optionally, you could also clear references in other collections
    // For example, if users have a list of trades
    console.log("Checking for other collections that might need updating...");

    // Check if User model exists and has trade references
    try {
      const User = mongoose.model("User");
      console.log(
        "User model found. Checking if users have trade references to update..."
      );

      // For safety, we're not directly modifying user records in this script
      // If needed, uncomment the following code to update user records
      /*
      const userUpdateResult = await User.updateMany(
        { trades: { $exists: true } },
        { $set: { trades: [] } }
      );
      console.log(`Updated trade references in ${userUpdateResult.modifiedCount} user records.`);
      */
    } catch (error) {
      console.log("User model not found or does not contain trade references.");
    }

    return deleteResult.deletedCount;
  } catch (error) {
    console.error("Error clearing trade histories:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error("Could not connect to MongoDB. Exiting...");
      process.exit(1);
    }

    // Clear trade histories
    const deletedCount = await clearTradeHistories();

    // Close MongoDB connection and readline interface
    await mongoose.connection.close();
    rl.close();

    console.log("==== SUMMARY ====");
    console.log(`Total trade records deleted: ${deletedCount}`);
    console.log("MongoDB connection closed.");
    console.log("Operation completed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Error in main execution:", error);
    process.exit(1);
  }
}

// Run the script
main();
