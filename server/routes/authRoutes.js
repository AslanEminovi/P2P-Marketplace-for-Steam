const express = require("express");
const passport = require("passport");
const router = express.Router();
const steamApiService = require("../services/steamApiService");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Determine environment
const isProduction = process.env.NODE_ENV === "production";

// Get config based on environment
const config = isProduction
  ? require("../config/production")
  : {
      CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
    };

// @route GET /auth/steam
router.get("/steam", passport.authenticate("steam"));

// @route GET /auth/steam/return
router.get(
  "/steam/return",
  passport.authenticate("steam", { failureRedirect: "/" }),
  (req, res) => {
    try {
      console.log("Steam auth successful, user:", req.user);

      // Generate token from user ID
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Ensure user object has all required fields
      if (!req.user.avatar) {
        console.log(
          "Missing avatar in user object, attempting to add from profile"
        );
        if (
          req.user.profile &&
          req.user.profile.photos &&
          req.user.profile.photos.length > 0
        ) {
          req.user.avatar = req.user.profile.photos[0].value;
        }
      }

      // Update user auth token in database (optional but useful for tracking)
      User.findByIdAndUpdate(req.user.id, {
        lastLogin: new Date(),
        authToken: token,
      }).catch((err) => console.error("Error updating user last login:", err));

      // Set cookie with token
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Additional logging to track the redirect flow
      console.log(
        `Redirecting to client URL: ${process.env.CLIENT_URL}?auth_token=${token}`
      );

      // Send user back to client with token in URL
      return res.redirect(`${process.env.CLIENT_URL}?auth_token=${token}`);
    } catch (error) {
      console.error("Error in Steam auth callback:", error);
      return res.redirect(`${process.env.CLIENT_URL}?auth_error=true`);
    }
  }
);

// Verify token endpoint
router.post("/verify-token", async (req, res) => {
  try {
    console.log("Verifying token request received");
    const { token } = req.body;

    if (!token) {
      console.log("No token provided in request");
      return res
        .status(400)
        .json({ authenticated: false, message: "No token provided" });
    }

    console.log("Verifying token:", token.substring(0, 10) + "...");

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      console.log("Invalid token structure:", decoded);
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }

    console.log("Token verified, finding user with ID:", decoded.id);

    // Find user by ID
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("User not found for ID:", decoded.id);
      return res
        .status(404)
        .json({ authenticated: false, message: "User not found" });
    }

    console.log("User found:", user.username || user.displayName);

    // Set token in cookie as well for extra security
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Return user data
    return res.json({
      authenticated: true,
      user: {
        id: user._id,
        steamId: user.steamId,
        username: user.username || user.displayName,
        displayName: user.displayName,
        avatar: user.avatar,
        roles: user.roles || [],
        tradeUrl: user.tradeUrl || "",
        balance: user.balance || 0,
        settings: user.settings || {
          currency: "USD",
          theme: "dark",
          notifications: {},
        },
        // Add other necessary user fields
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ authenticated: false, message: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ authenticated: false, message: "Invalid token" });
    }

    return res
      .status(500)
      .json({ authenticated: false, message: "Server error" });
  }
});

// Get current user (session-based fallback)
router.get("/user", async (req, res) => {
  try {
    console.log("Auth check request received");

    // First check if the user is authenticated via session
    if (req.user) {
      console.log(
        "User authenticated via session:",
        req.user.username || req.user.displayName
      );

      // Generate a new token for the user (refresh their session)
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // Set token in cookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({
        authenticated: true,
        user: {
          id: req.user._id,
          steamId: req.user.steamId,
          username: req.user.username || req.user.displayName,
          displayName: req.user.displayName,
          firstName: req.user.firstName || "",
          lastName: req.user.lastName || "",
          email: req.user.email || "",
          phone: req.user.phone || "",
          country: req.user.country || "",
          city: req.user.city || "",
          avatar: req.user.avatar,
          roles: req.user.roles || [],
          tradeUrl: req.user.tradeUrl || "",
          balance: req.user.balance || 0,
          walletBalance: req.user.balance || 0,
          isAdmin: req.user.isAdmin || false,
          profileComplete: req.user.profileComplete || false,
          settings: req.user.settings || {
            currency: "USD",
            theme: "dark",
            notifications: {},
          },
          // Add other necessary user fields
        },
      });
    }

    // If not authenticated via session, check for token in query parameters
    const token = req.query.auth_token;

    if (!token) {
      console.log("No auth token in session or query parameters");
      return res.json({
        authenticated: false,
        message: "No authentication token",
      });
    }

    console.log(
      "Checking token from query parameters:",
      token.substring(0, 10) + "..."
    );

    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || !decoded.id) {
        console.log("Invalid token structure:", decoded);
        return res
          .status(401)
          .json({ authenticated: false, message: "Invalid token" });
      }

      console.log("Token verified, finding user with ID:", decoded.id);

      // Find user by ID
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log("User not found for ID:", decoded.id);
        return res
          .status(404)
          .json({ authenticated: false, message: "User not found" });
      }

      console.log("User found via token:", user.username || user.displayName);

      // Update last login time
      user.lastLogin = new Date();
      await user.save();

      // Set token in cookie as well for extra security
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return the user data
      return res.json({
        authenticated: true,
        user: {
          id: user._id,
          steamId: user.steamId,
          username: user.username || user.displayName,
          displayName: user.displayName,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
          country: user.country || "",
          city: user.city || "",
          avatar: user.avatar,
          roles: user.roles || [],
          tradeUrl: user.tradeUrl || "",
          balance: user.balance || 0,
          walletBalance: user.balance || 0,
          walletBalanceGEL: user.walletBalanceGEL || 0,
          lastProfileUpdate: user.lastProfileUpdate,
          isAdmin: user.isAdmin || false,
          profileComplete: user.profileComplete || false,
          settings: user.settings || {
            currency: "USD",
            theme: "dark",
            notifications: {},
          },
          // Add other necessary user fields
        },
      });
    } catch (error) {
      console.error("Token verification error:", error);

      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ authenticated: false, message: "Token expired" });
      }

      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ authenticated: false, message: "Invalid token" });
      }

      return res
        .status(500)
        .json({ authenticated: false, message: "Server error" });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    return res
      .status(500)
      .json({ authenticated: false, message: "Server error" });
  }
});

// @route GET /auth/refresh-profile
// Manually force a profile refresh
router.get("/refresh-profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const refreshedUser = await steamApiService.refreshUserProfile(
      req.user._id
    );

    res.json({
      success: true,
      user: {
        id: refreshedUser._id,
        steamId: refreshedUser.steamId,
        displayName: refreshedUser.displayName,
        avatar: refreshedUser.avatar,
        lastProfileUpdate: refreshedUser.lastProfileUpdate,
      },
    });
  } catch (error) {
    console.error("Manual profile refresh error:", error);
    res.status(500).json({
      error: "Failed to refresh profile",
      message: error.message,
    });
  }
});

// @route GET /auth/me
router.get("/me", (req, res) => {
  console.log("Auth ME check - Session ID:", req.sessionID);
  console.log("Auth ME check - Is authenticated:", req.isAuthenticated());
  console.log("Auth ME check - User:", req.user ? req.user._id : "none");

  if (req.user) {
    try {
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
          lastProfileUpdate: req.user.lastProfileUpdate,
          isAdmin: req.user.isAdmin || false,
          settings: req.user.settings || {
            currency: "USD",
            theme: "dark",
            notifications: {},
          },
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

// @route GET /auth/logout
router.get("/logout", (req, res) => {
  try {
    console.log("Logout request received");

    // Clear the auth token cookie
    res.clearCookie("auth_token");

    // Call passport's logout method to clear the session
    req.logout((err) => {
      if (err) {
        console.error("Passport logout error:", err);
        // Continue with logout process despite passport error
      }

      // Destroy the session
      if (req.session) {
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error("Session destruction error:", sessionErr);
            // Continue with response despite session error
          }
          console.log("User logged out successfully");
          return res.status(200).json({ message: "Logged out successfully" });
        });
      } else {
        console.log("No session to destroy, user logged out");
        return res.status(200).json({ message: "Logged out successfully" });
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Failed to logout" });
  }
});

// @route POST /auth/refresh-token
// @desc Refresh authentication token
// @access Public
router.post("/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify the existing token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account has been banned",
        reason: user.banReason,
      });
    }

    // Generate a new token
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token valid for 7 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set token in cookie
    res.cookie("auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return the new token and basic user info
    return res.json({
      success: true,
      token: newToken,
      user: {
        id: user._id,
        steamId: user.steamId,
        displayName: user.displayName,
        avatar: user.avatar,
        isAdmin: user.isAdmin || false,
        settings: user.settings || {
          currency: "USD",
          theme: "dark",
          notifications: {},
        },
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during token refresh",
    });
  }
});

module.exports = router;
