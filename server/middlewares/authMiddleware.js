const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated() && !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
