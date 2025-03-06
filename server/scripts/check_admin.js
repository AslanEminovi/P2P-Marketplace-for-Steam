/**
 * Script to check if a user is an admin by their Steam ID
 *
 * Usage:
 * node check_admin.js <steamId>
 *
 * Example:
 * node check_admin.js 76561198012345678
 */

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/cs2-marketplace";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Check if a user is an admin by Steam ID
const checkAdmin = async (steamId) => {
  try {
    if (!steamId) {
      console.error("Please provide a Steam ID");
      process.exit(1);
    }

    const user = await User.findOne({ steamId });

    if (!user) {
      console.error(`User with Steam ID ${steamId} not found`);
      process.exit(1);
    }

    console.log(`User: ${user.displayName}`);
    console.log(`Steam ID: ${user.steamId}`);
    console.log(`Admin status: ${user.isAdmin ? "Yes" : "No"}`);

    // Show MongoDB ID for reference
    console.log(`MongoDB ID: ${user._id}`);

    // Other useful info
    console.log(`Banned: ${user.isBanned ? "Yes" : "No"}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Last login: ${user.lastLoginAt || "Never"}`);
  } catch (error) {
    console.error("Error checking user admin status:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

// Main function
(async () => {
  await connectDB();
  const steamId = process.argv[2];
  await checkAdmin(steamId);
})();
