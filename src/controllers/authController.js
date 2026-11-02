const jwt = require("jsonwebtoken");
const User = require("../models/User");
const demoStore = require("../utils/demoStore");

const JWT_SECRET = process.env.JWT_SECRET || "tradeflow_secure_default_secret_2026";

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (req.isDemo) {
      const existing = await demoStore.findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const user = await demoStore.createUser({ name, email, password });
      const token = signToken(user._id);
      const safeUser = { ...user };
      delete safeUser.password;
      return res.status(201).json({ user: safeUser, token, isDemo: true });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });
    const token = signToken(user._id);

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (req.isDemo) {
      const user = await demoStore.findUserByEmail(normalizedEmail);
      const bcrypt = require("bcryptjs");
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const token = signToken(user._id);
      const safeUser = { ...user };
      delete safeUser.password;
      return res.json({ user: safeUser, token, isDemo: true });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  res.json({ user: req.user, isDemo: Boolean(req.isDemo) });
}

module.exports = { register, login, getMe };
