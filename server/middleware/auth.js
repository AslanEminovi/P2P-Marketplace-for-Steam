/**
 * Authentication middleware
 * Checks if the user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  next();
};

/**
 * Admin authorization middleware
 * Checks if the authenticated user has admin privileges
 */
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
