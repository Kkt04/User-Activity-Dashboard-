const mongoose = require("mongoose");
const Trade = require("../models/Trade");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { writeCsvFile } = require("../utils/csvExport");

// GET /api/analytics/summary
// Per-user P&L + activity summary (self-service, matches "Automation of User reports" JD point)
async function getUserSummary(req, res) {
  try {
    const userId = req.user._id;

    const pnlAgg = await Trade.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: "EXECUTED" } },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
    ]);

    const buy = pnlAgg.find((r) => r._id === "BUY") || { totalAmount: 0, count: 0 };
    const sell = pnlAgg.find((r) => r._id === "SELL") || { totalAmount: 0, count: 0 };

    // Simplified realized P&L: total sold value - total bought value
    const realizedPnL = sell.totalAmount - buy.totalAmount;

    const deposits = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "DEPOSIT" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const withdrawals = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "WITHDRAWAL" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      walletBalance: req.user.walletBalance,
      trades: { buyCount: buy.count, sellCount: sell.count, totalTrades: buy.count + sell.count },
      totals: { totalBought: buy.totalAmount, totalSold: sell.totalAmount },
      realizedPnL,
      deposits: deposits[0]?.total || 0,
      withdrawals: withdrawals[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build summary", error: err.message });
  }
}

// GET /api/analytics/admin/overview  (admin only)
// Platform-wide aggregate analytics -> "Derive meaningful analytics ... for business development teams"
async function getAdminOverview(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [topUsersByVolume, totalPlatformVolume, activeLast7d, activeLast30d, totalUsers] =
      await Promise.all([
        Trade.aggregate([
          { $group: { _id: "$user", totalVolume: { $sum: "$amount" }, tradeCount: { $sum: 1 } } },
          { $sort: { totalVolume: -1 } },
          { $limit: 10 },
          {
            $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: 0,
              userId: "$user._id",
              name: "$user.name",
              email: "$user.email",
              totalVolume: 1,
              tradeCount: 1,
            },
          },
        ]),
        Trade.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
        Trade.distinct("user", { createdAt: { $gte: sevenDaysAgo } }),
        Trade.distinct("user", { createdAt: { $gte: thirtyDaysAgo } }),
        User.countDocuments(),
      ]);

    res.json({
      totalUsers,
      totalPlatformVolume: totalPlatformVolume[0]?.total || 0,
      topUsersByVolume,
      retention: {
        activeUsersLast7Days: activeLast7d.length,
        activeUsersLast30Days: activeLast30d.length,
        retentionRate7dOf30d: activeLast30d.length
          ? +((activeLast7d.length / activeLast30d.length) * 100).toFixed(1)
          : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build overview", error: err.message });
  }
}

// GET /api/analytics/report/csv
// Generates a downloadable CSV of the logged-in user's trade history
// -> "Automation of User reports - Detailed summary" JD point
async function downloadTradeReportCsv(req, res) {
  try {
    const trades = await Trade.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();

    const records = trades.map((t) => ({
      date: t.createdAt.toISOString(),
      symbol: t.symbol,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      amount: t.amount,
      status: t.status,
    }));

    if (records.length === 0) {
      return res.status(404).json({ message: "No trades found to export" });
    }

    const fields = ["date", "symbol", "type", "quantity", "price", "amount", "status"];
    const filePath = writeCsvFile(records, fields, `trade-report-${req.user._id}`);

    res.download(filePath);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV report", error: err.message });
  }
}

module.exports = { getUserSummary, getAdminOverview, downloadTradeReportCsv };
