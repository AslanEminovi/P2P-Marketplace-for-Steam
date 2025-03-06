/**
 * Script to make a user an admin by their Steam ID
 *
 * Usage:
 * node make_admin.js <steamId>
 *
 * Example:
 * node make_admin.js 76561198012345678
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

// Make a user an admin by Steam ID
const makeAdmin = async (steamId) => {
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

    // Check if already admin
    if (user.isAdmin) {
      console.log(`User ${user.displayName} (${steamId}) is already an admin`);
      process.exit(0);
    }

    // Update user to admin
    user.isAdmin = true;
    await user.save();

    console.log(`User ${user.displayName} (${steamId}) is now an admin`);
  } catch (error) {
    console.error("Error making user admin:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

// Main function
(async () => {
  await connectDB();
  const steamId = process.argv[2];
  await makeAdmin(steamId);
})();
