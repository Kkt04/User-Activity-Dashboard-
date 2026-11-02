const Trade = require("../models/Trade");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const demoStore = require("../utils/demoStore");

// POST /api/trades
// Places a BUY/SELL trade and adjusts the user's wallet balance
async function placeTrade(req, res) {
  try {
    const { symbol, type, quantity, price } = req.body;

    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return res.status(400).json({ message: "Valid symbol is required" });
    }

    const tradeType = (type || "").toUpperCase().trim();
    if (!["BUY", "SELL"].includes(tradeType)) {
      return res.status(400).json({ message: "type must be BUY or SELL" });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ message: "quantity must be a positive number" });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ message: "price must be a positive number" });
    }

    const amount = Number((numQty * numPrice).toFixed(2));
    const user = req.user;

    if (tradeType === "BUY" && user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance for this trade" });
    }

    user.walletBalance = Number(
      (user.walletBalance + (tradeType === "BUY" ? -amount : amount)).toFixed(2)
    );

    if (req.isDemo) {
      const trade = await demoStore.addTrade({
        userId: user._id,
        symbol: symbol.trim().toUpperCase(),
        type: tradeType,
        quantity: numQty,
        price: numPrice,
        amount,
      });
      return res.status(201).json({ trade, walletBalance: user.walletBalance, isDemo: true });
    }

    const trade = await Trade.create({
      user: user._id,
      symbol: symbol.trim().toUpperCase(),
      type: tradeType,
      quantity: numQty,
      price: numPrice,
      amount,
    });

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

    if (req.isDemo) {
      const result = await demoStore.getUserTrades(req.user._id, { from, to, page, limit });
      return res.json({ ...result, isDemo: true });
    }

    const filter = { user: req.user._id };

    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid 'from' date format" });
      }
      filter.createdAt = filter.createdAt || {};
      filter.createdAt.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid 'to' date format" });
      }
      filter.createdAt = filter.createdAt || {};
      filter.createdAt.$lte = toDate;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [trades, total] = await Promise.all([
      Trade.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Trade.countDocuments(filter),
    ]);

    res.json({
      trades,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trades", error: err.message });
  }
}

// POST /api/transactions/deposit
async function deposit(req, res) {
  try {
    const num = Number(req.body.amount);
    if (isNaN(num) || num <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const depositAmount = Number(num.toFixed(2));
    const user = req.user;
    user.walletBalance = Number((user.walletBalance + depositAmount).toFixed(2));

    if (req.isDemo) {
      const tx = await demoStore.addTransaction({
        userId: user._id,
        type: "DEPOSIT",
        amount: depositAmount,
      });
      return res.status(201).json({ transaction: tx, walletBalance: user.walletBalance, isDemo: true });
    }

    await user.save();
    const tx = await Transaction.create({ user: user._id, type: "DEPOSIT", amount: depositAmount });
    res.status(201).json({ transaction: tx, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Deposit failed", error: err.message });
  }
}

// POST /api/transactions/withdraw
async function withdraw(req, res) {
  try {
    const num = Number(req.body.amount);
    if (isNaN(num) || num <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const withdrawAmount = Number(num.toFixed(2));
    const user = req.user;

    if (user.walletBalance < withdrawAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.walletBalance = Number((user.walletBalance - withdrawAmount).toFixed(2));

    if (req.isDemo) {
      const tx = await demoStore.addTransaction({
        userId: user._id,
        type: "WITHDRAWAL",
        amount: withdrawAmount,
      });
      return res.status(201).json({ transaction: tx, walletBalance: user.walletBalance, isDemo: true });
    }

    await user.save();
    const tx = await Transaction.create({ user: user._id, type: "WITHDRAWAL", amount: withdrawAmount });
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

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const validPlans = ["basic", "growth", "premium"];
    const normalizedPlan = (planName || "").toLowerCase().trim();
    if (!validPlans.includes(normalizedPlan)) {
      return res.status(400).json({
        message: `Invalid planName. Must be one of: ${validPlans.join(", ")}`,
      });
    }

    const subAmount = Number(num.toFixed(2));
    if (user.walletBalance < subAmount) {
      return res.status(400).json({ message: "Insufficient balance for subscription" });
    }

    user.walletBalance = Number((user.walletBalance - subAmount).toFixed(2));
    user.investmentPlan = normalizedPlan;

    if (req.isDemo) {
      const tx = await demoStore.addTransaction({
        userId: user._id,
        type: "SUBSCRIPTION",
        amount: subAmount,
        planName: normalizedPlan,
      });
      return res.status(201).json({ transaction: tx, user, walletBalance: user.walletBalance, isDemo: true });
    }

    await user.save();
    const tx = await Transaction.create({
      user: user._id,
      type: "SUBSCRIPTION",
      amount: subAmount,
      planName: normalizedPlan,
    });

    res.status(201).json({ transaction: tx, user, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Subscription failed", error: err.message });
  }
}

module.exports = { placeTrade, getMyTrades, deposit, withdraw, subscribe };
