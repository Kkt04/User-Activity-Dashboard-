const Trade = require("../models/Trade");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// POST /api/trades
// Places a BUY/SELL trade and adjusts the user's wallet balance
async function placeTrade(req, res) {
  try {
    const { symbol, type, quantity, price } = req.body;
    if (!symbol || !type || !quantity || !price) {
      return res.status(400).json({ message: "symbol, type, quantity and price are required" });
    }

    const amount = quantity * price;
    const user = req.user;

    if (type === "BUY" && user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance for this trade" });
    }

    const trade = await Trade.create({
      user: user._id,
      symbol,
      type,
      quantity,
      price,
      amount,
    });

    // BUY reduces wallet balance, SELL adds to it
    user.walletBalance += type === "BUY" ? -amount : amount;
    await user.save();

    res.status(201).json({ trade, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Failed to place trade", error: err.message });
  }
}

// GET /api/trades  (own trades, paginated, optional date range)
async function getMyTrades(req, res) {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Trade.countDocuments(filter);

    res.json({ trades, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trades", error: err.message });
  }
}

// POST /api/transactions/deposit
async function deposit(req, res) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const user = req.user;
    user.walletBalance += amount;
    await user.save();

    const tx = await Transaction.create({ user: user._id, type: "DEPOSIT", amount });
    res.status(201).json({ transaction: tx, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Deposit failed", error: err.message });
  }
}

// POST /api/transactions/withdraw
async function withdraw(req, res) {
  try {
    const { amount } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }
    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.walletBalance -= amount;
    await user.save();

    const tx = await Transaction.create({ user: user._id, type: "WITHDRAWAL", amount });
    res.status(201).json({ transaction: tx, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Withdrawal failed", error: err.message });
  }
}

// POST /api/transactions/subscribe
async function subscribe(req, res) {
  try {
    const { planName, amount } = req.body;
    const user = req.user;

    if (!planName || !amount) {
      return res.status(400).json({ message: "planName and amount are required" });
    }
    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance for subscription" });
    }

    user.walletBalance -= amount;
    user.investmentPlan = planName;
    await user.save();

    const tx = await Transaction.create({
      user: user._id,
      type: "SUBSCRIPTION",
      amount,
      planName,
    });

    res.status(201).json({ transaction: tx, user });
  } catch (err) {
    res.status(500).json({ message: "Subscription failed", error: err.message });
  }
}

module.exports = { placeTrade, getMyTrades, deposit, withdraw, subscribe };
