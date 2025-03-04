const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new SteamStrategy(
    {
      returnURL: process.env.CALLBACK_URL,
      realm:
        process.env.NODE_ENV === "production"
          ? process.env.CALLBACK_URL.split("/auth/steam/return")[0] + "/"
          : "http://localhost:" + (process.env.PORT || 5001) + "/",
      apiKey: process.env.STEAM_API_KEY,
    },
    async (identifier, profile, done) => {
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
