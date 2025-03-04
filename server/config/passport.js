const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const User = require("../models/User");

// Keep track of serialization to avoid excessive logging
const recentSerializations = new Set();
const MAX_TRACKED_USERS = 20;

passport.serializeUser((user, done) => {
  const userId = user._id.toString();

  // Only log if we haven't seen this user recently
  if (!recentSerializations.has(userId)) {
    console.log("Serializing user:", userId);

    // Add to recently seen set
    recentSerializations.add(userId);

    // Limit the size of the set
    if (recentSerializations.size > MAX_TRACKED_USERS) {
      const iterator = recentSerializations.values();
      recentSerializations.delete(iterator.next().value);
    }
  }

  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // No need to log every deserialization
    const user = await User.findById(id);
    if (user) {
      done(null, user);
    } else {
      console.log("No user found for ID:", id);
      done(null, false);
    }
  } catch (err) {
    console.error("Error during deserialization:", err);
    done(err);
  }
});

// Get config based on environment
const isProduction = process.env.NODE_ENV === "production";
const callbackUrl =
  process.env.CALLBACK_URL ||
  (isProduction
    ? "https://p2p-marketplace-for-steam.onrender.com/auth/steam/return"
    : "http://localhost:5001/auth/steam/return");

console.log("Steam authentication configuration:");
console.log("- CALLBACK_URL:", callbackUrl);
console.log("- NODE_ENV:", process.env.NODE_ENV);

passport.use(
  new SteamStrategy(
    {
      returnURL: callbackUrl,
      realm: isProduction
        ? callbackUrl.split("/auth/steam/return")[0] + "/"
        : "http://localhost:" + (process.env.PORT || 5001) + "/",
      apiKey: process.env.STEAM_API_KEY,
    },
    async (identifier, profile, done) => {
      console.log(
        "Steam authentication callback received",
        profile._json.steamid
      );
      try {
        // Extract the Steam ID from the profile data
        const steamId = profile._json.steamid;
        // Find or create the user in your database
        let user = await User.findOne({ steamId });

        if (!user) {
          // Create new user if not found
          user = await User.create({
            steamId,
            displayName: profile.displayName,
            avatar: profile._json.avatarfull,
            walletBalance: 0,
            lastProfileUpdate: new Date(),
          });
        } else {
          // Always update profile information on login to ensure it's current
          user.displayName = profile.displayName;
          user.avatar = profile._json.avatarfull;
          user.lastProfileUpdate = new Date();

          // If there are other profile fields to update, do it here
          if (profile._json.profileurl) {
            user.profileUrl = profile._json.profileurl;
          }

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
