const jwt = require("jsonwebtoken");
const User = require("../models/User");
const demoStore = require("../utils/demoStore");

const JWT_SECRET = process.env.JWT_SECRET || "tradeflow_secure_default_secret_2026";

// Verifies JWT sent as "Authorization: Bearer <token>"
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.isDemo) {
      const user = await demoStore.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
      }
      req.user = user;
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
}

// Restrict a route to specific roles, e.g. adminOnly = restrictTo("admin")
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

module.exports = { protect, restrictTo };
