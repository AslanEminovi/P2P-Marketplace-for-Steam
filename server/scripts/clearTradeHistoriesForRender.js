/**
 * Script to clear all trade histories from the database (Render.com version)
 *
 * Usage (on Render.com):
 * 1. Navigate to the project root directory
 * 2. Run: node server/scripts/clearTradeHistoriesForRender.js
 *
 * WARNING: This script will permanently delete all trade records without confirmation!
 * It should only be used in the production environment when explicitly needed.
 */

// Ensure we're in the right environment
if (!process.env.MONGO_URI) {
  console.error("ERROR: MONGO_URI environment variable is not defined.");
  console.error(
    "This script is intended to be run on Render.com where environment variables are configured."
  );
  process.exit(1);
}

const mongoose = require("mongoose");

// MongoDB connection URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log("Connecting to MongoDB...");
    console.log(`Using MongoDB URI from environment variables`);

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

    // No confirmation prompt in this version - directly proceed with deletion
    console.log(
      `WARNING: Proceeding to delete ALL ${tradeCount} trade records without confirmation.`
    );
    console.log("This action cannot be undone.");

    // Perform deletion
    console.log("Deleting trade records...");
    const deleteResult = await Trade.deleteMany({});
    console.log(
      `Successfully deleted ${deleteResult.deletedCount} trade records.`
    );

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

    // Close MongoDB connection
    await mongoose.connection.close();

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
