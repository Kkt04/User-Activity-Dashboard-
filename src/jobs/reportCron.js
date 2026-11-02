const cron = require("node-cron");
const Trade = require("../models/Trade");
const { writeCsvFile } = require("../utils/csvExport");

// Builds one aggregate summary row per user: trades, volume, realized P&L
async function buildDailySummaryRows() {
  const rows = await Trade.aggregate([
    { $match: { status: "EXECUTED" } },
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
      totalBought: Number((buy.totalAmount || 0).toFixed(2)),
      totalSold: Number((sell.totalAmount || 0).toFixed(2)),
      realizedPnL: Number(((sell.totalAmount || 0) - (buy.totalAmount || 0)).toFixed(2)),
      walletBalance: Number((r.user.walletBalance || 0).toFixed(2)),
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
      return { success: true, count: 0, message: "No trade activity found" };
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
    return { success: true, count: rows.length, filePath };
  } catch (err) {
    console.error("[CRON] Report generation failed:", err.message);
    throw err;
  }
}

// Schedules the job for persistent Node.js servers
function startReportCron() {
  if (process.env.VERCEL) {
    // On Vercel, cron is triggered via Vercel Crons endpoint (/api/cron/daily-report)
    return;
  }
  const schedule = process.env.REPORT_CRON_SCHEDULE || "0 1 * * *";
  cron.schedule(schedule, async () => {
    try {
      await runDailyReportJob();
    } catch (err) {
      console.error("[CRON] Scheduled task error:", err.message);
    }
  });
  console.log(`[CRON] Daily report job scheduled with pattern "${schedule}"`);
}

module.exports = { startReportCron, runDailyReportJob, buildDailySummaryRows };
