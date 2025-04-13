/**
 * Script to set a user as admin by their Steam ID
 *
 * Usage:
 * node make_admin.js <steamId>
 *
 * Example:
 * node make_admin.js 76561198012345678
 */

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = mongoose.model("User") || require("../models/User");

// Connect to MongoDB
(async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
})();

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

    // Make the user an admin
    user.isAdmin = true;
    await user.save();

    console.log(`User: ${user.displayName}`);
    console.log(`Steam ID: ${user.steamId}`);
    console.log(`Admin status: ${user.isAdmin ? "Yes" : "No"}`);
    console.log(`MongoDB ID: ${user._id}`);
    console.log("User has been successfully made an admin!");
  } catch (error) {
    console.error("Error making user admin:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

// Get the Steam ID from command line arguments
const steamId = process.argv[2];
makeAdmin(steamId);
