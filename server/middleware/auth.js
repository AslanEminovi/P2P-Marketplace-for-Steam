/**
 * Authentication Middleware
 * Provides functions to check authentication status and admin privileges
 */

// Check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res
    .status(401)
    .json({ error: "Unauthorized - Please log in to access this resource" });
};

// Check if the user is an admin
const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res
      .status(401)
      .json({ error: "Unauthorized - Please log in to access this resource" });
  }

  if (!req.user.isAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden - You do not have admin privileges" });
  }

  return next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
