require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const cronRoutes = require("./routes/cronRoutes");

const app = express();

// --- Core middleware ---
app.use(cors());
app.use(express.json());
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    if (req.socket && req.socket.remoteAddress) {
      return morgan("dev")(req, res, next);
    }
    next();
  });
}

// --- Frontend (static files) ---
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

// --- Enhanced Health & Diagnostic check ---
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  let dbError = null;

  if (process.env.MONGO_URI) {
    try {
      await connectDB();
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      dbError = err.message;
    }
  } else {
    dbStatus = "not_configured";
  }

  res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    environment: process.env.VERCEL ? "vercel-serverless" : "standalone-server",
    database: {
      status: dbStatus,
      configured: Boolean(process.env.MONGO_URI),
      isAtlas: process.env.MONGO_URI ? process.env.MONGO_URI.startsWith("mongodb+srv://") : false,
      error: dbError,
    },
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    time: new Date().toISOString(),
  });
});

// --- MongoDB connection middleware for API routes (Serverless safe) ---
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB] Connection error in request handler:", err.message);
    res.status(503).json({
      message: err.message || "Database connection failed. Please ensure MONGO_URI is properly configured.",
      error: err.message,
    });
  }
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api", tradeRoutes); // /api/trades, /api/transactions/*
app.use("/api/analytics", analyticsRoutes);
app.use("/api/cron", cronRoutes); // /api/cron/daily-report

// --- SPA Fallback for non-API GET requests ---
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) next();
  });
});

// --- 404 handler for API routes ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

module.exports = app;
