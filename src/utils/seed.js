// Populates the DB with sample users, trades and transactions for local testing/demo.
// Run with: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Trade = require("../models/Trade");
const Transaction = require("../models/Transaction");

const SYMBOLS = ["BTC", "ETH", "RELIANCE", "TCS", "INFY"];

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  await connectDB();

  console.log("[SEED] Clearing existing data...");
  await Promise.all([User.deleteMany({}), Trade.deleteMany({}), Transaction.deleteMany({})]);

  console.log("[SEED] Creating users...");
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await User.create({
      name: `Demo User ${i}`,
      email: `user${i}@example.com`,
      password: "password123", // hashed automatically by the User model
      role: i === 1 ? "admin" : "user",
      walletBalance: 50000,
    });
    users.push(user);
  }

  console.log("[SEED] Creating trades + transactions...");
  for (const user of users) {
    // A few deposits
    for (let i = 0; i < randomInt(1, 3); i++) {
      const amount = randomInt(5000, 20000);
      await Transaction.create({ user: user._id, type: "DEPOSIT", amount });
    }

    // A batch of trades spread across the last 30 days
    for (let i = 0; i < randomInt(5, 15); i++) {
      const type = Math.random() > 0.5 ? "BUY" : "SELL";
      const quantity = randomInt(1, 10);
      const price = randomInt(100, 5000);
      const amount = quantity * price;
      const daysAgo = randomInt(0, 30);

      const trade = await Trade.create({
        user: user._id,
        symbol: randomOf(SYMBOLS),
        type,
        quantity,
        price,
        amount,
      });

      // Backdate createdAt to simulate historical activity
      trade.createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      await trade.save();
    }
  }

  console.log("[SEED] Done. Sample login -> email: user1@example.com / password: password123");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Failed:", err);
  process.exit(1);
});
