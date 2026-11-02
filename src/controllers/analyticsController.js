const mongoose = require("mongoose");
const Trade = require("../models/Trade");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { generateCsv } = require("../utils/csvExport");
const demoStore = require("../utils/demoStore");

// GET /api/analytics/summary
// Per-user P&L + activity summary (self-service)
async function getUserSummary(req, res) {
  try {
    if (req.isDemo) {
      const summary = await demoStore.getUserSummary(req.user._id);
      return res.json({ ...summary, isDemo: true });
    }

    const userId = req.user._id;
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const pnlAgg = await Trade.aggregate([
      { $match: { user: userObjectId, status: "EXECUTED" } },
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

    // Realized P&L: total sold value - total bought value
    const realizedPnL = Number((sell.totalAmount - buy.totalAmount).toFixed(2));

    const deposits = await Transaction.aggregate([
      { $match: { user: userObjectId, type: "DEPOSIT" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const withdrawals = await Transaction.aggregate([
      { $match: { user: userObjectId, type: "WITHDRAWAL" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      walletBalance: Number((req.user.walletBalance || 0).toFixed(2)),
      trades: { buyCount: buy.count, sellCount: sell.count, totalTrades: buy.count + sell.count },
      totals: {
        totalBought: Number((buy.totalAmount || 0).toFixed(2)),
        totalSold: Number((sell.totalAmount || 0).toFixed(2)),
      },
      realizedPnL,
      deposits: Number((deposits[0]?.total || 0).toFixed(2)),
      withdrawals: Number((withdrawals[0]?.total || 0).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to build summary", error: err.message });
  }
}

// GET /api/analytics/admin/overview  (admin only)
// Platform-wide aggregate analytics for business intelligence
async function getAdminOverview(req, res) {
  try {
    if (req.isDemo) {
      const overview = await demoStore.getAdminOverview();
      return res.json({ ...overview, isDemo: true });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [topUsersByVolume, totalPlatformVolume, activeLast7d, activeLast30d, totalUsers] =
      await Promise.all([
        Trade.aggregate([
          { $match: { status: "EXECUTED" } },
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
        Trade.aggregate([
          { $match: { status: "EXECUTED" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Trade.distinct("user", { createdAt: { $gte: sevenDaysAgo }, status: "EXECUTED" }),
        Trade.distinct("user", { createdAt: { $gte: thirtyDaysAgo }, status: "EXECUTED" }),
        User.countDocuments(),
      ]);

    const formattedTopUsers = topUsersByVolume.map((u) => ({
      ...u,
      totalVolume: Number((u.totalVolume || 0).toFixed(2)),
    }));

    res.json({
      totalUsers,
      totalPlatformVolume: Number((totalPlatformVolume[0]?.total || 0).toFixed(2)),
      topUsersByVolume: formattedTopUsers,
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
async function downloadTradeReportCsv(req, res) {
  try {
    let records = [];

    if (req.isDemo) {
      const result = await demoStore.getUserTrades(req.user._id, { limit: 1000 });
      records = result.trades.map((t) => ({
        date: new Date(t.createdAt).toISOString(),
        symbol: t.symbol,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        amount: t.amount,
        status: t.status,
      }));
    } else {
      const trades = await Trade.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
      records = trades.map((t) => ({
        date: t.createdAt.toISOString(),
        symbol: t.symbol,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        amount: t.amount,
        status: t.status,
      }));
    }

    if (records.length === 0) {
      return res.status(404).json({ message: "No trades found to export" });
    }

    const fields = ["date", "symbol", "type", "quantity", "price", "amount", "status"];
    const csv = generateCsv(records, fields);
    const filename = `trade-report-${req.user._id}-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV report", error: err.message });
  }
}

module.exports = { getUserSummary, getAdminOverview, downloadTradeReportCsv };
