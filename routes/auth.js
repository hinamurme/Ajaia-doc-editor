const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

router.post("/register", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, error: "Enter a valid email address" });
    }
    if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters and no more than 72 UTF-8 bytes" });
    }

    const user = await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    return res.status(201).json({
      success: true,
      data: { user: publicUser(user), token: issueToken(user) },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!emailPattern.test(email) || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: "Email or password is incorrect" });
    }
    return res.json({
      success: true,
      data: { user: publicUser(user), token: issueToken(user) },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

module.exports = router;
