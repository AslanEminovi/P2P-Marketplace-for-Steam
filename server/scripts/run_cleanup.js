/**
 * Script to manually run the cleanup_listings function
 *
 * Usage:
 * node run_cleanup.js [userId]
 *
 * Example:
 * node run_cleanup.js                 - Clean up all listings
 * node run_cleanup.js 123456789abc    - Clean up listings for specific user
 */

require("dotenv").config({ path: "../.env" });
const { cleanupStuckListings } = require("../cleanup_listings");

// Main function
const runCleanup = async () => {
  try {
    console.log("Starting cleanup process...");

    const userId = process.argv[2];
    let results;

    if (userId) {
      console.log(`Cleaning up listings for user: ${userId}`);
      results = await cleanupStuckListings(userId);
    } else {
      console.log("Cleaning up all listings");
      results = await cleanupStuckListings();
    }

    console.log("Cleanup completed successfully!");
    console.log("Results:", JSON.stringify(results, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
};

// Run the function
runCleanup();
