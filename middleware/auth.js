const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id email");
    if (!user) {
      return res.status(401).json({ success: false, error: "Account no longer exists" });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
    return next(error);
  }
}

module.exports = { requireAuth };
