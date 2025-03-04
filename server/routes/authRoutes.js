const express = require("express");
const passport = require("passport");
const router = express.Router();
const steamApiService = require('../services/steamApiService');
const User = require('../models/User');

// @route GET /auth/steam
router.get("/steam", passport.authenticate("steam"));

// @route GET /auth/steam/return
router.get(
  "/steam/return",
  passport.authenticate("steam", {
    failureRedirect: "http://localhost:3000/login",
  }),
  (req, res) => {
    // Successful authentication
    // Redirect back to your React client or anywhere
    res.redirect("http://localhost:3000");
  }
);

// @route GET /auth/user
router.get("/user", async (req, res) => {
  if (req.user) {
    try {
      // Automatically refresh the user's profile if it hasn't been updated in the last hour
      const lastUpdateTime = req.user.lastProfileUpdate ? new Date(req.user.lastProfileUpdate) : null;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (!lastUpdateTime || lastUpdateTime < oneHourAgo) {
        // Try to refresh profile data from Steam
        try {
          await steamApiService.refreshUserProfile(req.user._id);
          // Reload user from database to get fresh data
          req.user = await User.findById(req.user._id);
        } catch (refreshError) {
          console.error("Profile auto-refresh failed:", refreshError);
          // Continue with existing data if refresh fails
        }
      }
      
      res.json({
        authenticated: true,
        user: {
          id: req.user._id,
          steamId: req.user.steamId,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
          tradeUrl: req.user.tradeUrl,
          tradeUrlExpiry: req.user.tradeUrlExpiry,
          walletBalance: req.user.walletBalance,
          walletBalanceGEL: req.user.walletBalanceGEL,
          lastProfileUpdate: req.user.lastProfileUpdate
        },
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// @route GET /auth/refresh-profile
// Manually force a profile refresh
router.get("/refresh-profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  
  try {
    const refreshedUser = await steamApiService.refreshUserProfile(req.user._id);
    
    res.json({
      success: true,
      user: {
        id: refreshedUser._id,
        steamId: refreshedUser.steamId,
        displayName: refreshedUser.displayName,
        avatar: refreshedUser.avatar,
        lastProfileUpdate: refreshedUser.lastProfileUpdate
      }
    });
  } catch (error) {
    console.error("Manual profile refresh error:", error);
    res.status(500).json({ 
      error: "Failed to refresh profile", 
      message: error.message 
    });
  }
});

// @route GET /auth/logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.sendStatus(200);
  });
});

module.exports = router;
