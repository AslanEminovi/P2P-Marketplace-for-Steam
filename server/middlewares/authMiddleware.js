/**
 * Authentication middleware - verifies that the user is logged in
 * Supports both session-based authentication and token-based authentication
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  try {
    // First check if the user is already authenticated via session
    if (req.isAuthenticated() && req.user) {
      return next();
    }

    // If not authenticated via session, check for token authentication

    // Look for token in the authorization header
    let token = null;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token in header, check cookies
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    // If no token found, check body (for API requests)
    if (!token && req.body && req.body.token) {
      token = req.body.token;
    }

    // If still no token, return error
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Set the user in the request
      req.user = user;
      return next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Admin authorization middleware - verifies that the user is an admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (
    !req.user.isAdmin &&
    !(req.user.roles && req.user.roles.includes("admin"))
  ) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
