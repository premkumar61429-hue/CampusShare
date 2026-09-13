function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Authentication required. Please login." });
  }
  next();
}

function requireRole(allowedRole) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Authentication required. Please login." });
    }
    if (req.session.user.role !== allowedRole) {
      return res.status(403).json({ error: `Access denied. ${allowedRole} privilege required.` });
    }
    next();
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  requireAuth,
  requireRole,
  sanitizeUser
};
