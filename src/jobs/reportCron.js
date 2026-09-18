const cron = require("node-cron");
const mongoose = require("mongoose");
const User = require("../models/User");
const Trade = require("../models/Trade");
const { writeCsvFile } = require("../utils/csvExport");

// Builds one aggregate summary row per user: trades, volume, realized P&L
async function buildDailySummaryRows() {
  const rows = await Trade.aggregate([
    {
      $group: {
        _id: { user: "$user", type: "$type" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.user",
        breakdown: { $push: { type: "$_id.type", totalAmount: "$totalAmount", count: "$count" } },
      },
    },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
  ]);

  return rows.map((r) => {
    const buy = r.breakdown.find((b) => b.type === "BUY") || { totalAmount: 0, count: 0 };
    const sell = r.breakdown.find((b) => b.type === "SELL") || { totalAmount: 0, count: 0 };
    return {
      userId: r._id.toString(),
      name: r.user.name,
      email: r.user.email,
      totalTrades: buy.count + sell.count,
      totalBought: buy.totalAmount,
      totalSold: sell.totalAmount,
      realizedPnL: sell.totalAmount - buy.totalAmount,
      walletBalance: r.user.walletBalance,
      reportDate: new Date().toISOString().slice(0, 10),
    };
  });
}

async function runDailyReportJob() {
  try {
    console.log("[CRON] Generating daily P&L / activity report...");
    const rows = await buildDailySummaryRows();

    if (rows.length === 0) {
      console.log("[CRON] No trade activity found, skipping report generation.");
      return;
    }

    const fields = [
      "userId",
      "name",
      "email",
      "totalTrades",
      "totalBought",
      "totalSold",
      "realizedPnL",
      "walletBalance",
      "reportDate",
    ];

    const filePath = writeCsvFile(rows, fields, "daily-platform-report");
    console.log(`[CRON] Report generated: ${filePath} (${rows.length} users)`);
  } catch (err) {
    console.error("[CRON] Report generation failed:", err.message);
  }
}

// Schedules the job. Default: every day at 1:00 AM server time.
// Cron format: minute hour day month weekday
function startReportCron() {
  const schedule = process.env.REPORT_CRON_SCHEDULE || "0 1 * * *";
  cron.schedule(schedule, runDailyReportJob);
  console.log(`[CRON] Daily report job scheduled with pattern "${schedule}"`);
}

module.exports = { startReportCron, runDailyReportJob };
