require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { startReportCron } = require("./jobs/reportCron");

const authRoutes = require("./routes/authRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// --- Core middleware ---
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// --- Frontend (static dashboard) ---
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Health check ---
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api", tradeRoutes); // /api/trades, /api/transactions/*
app.use("/api/analytics", analyticsRoutes);

// --- 404 handler ---
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  startReportCron();
  app.listen(PORT, () => console.log(`[SERVER] Running on http://localhost:${PORT}`));
}

start();
