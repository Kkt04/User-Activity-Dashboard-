const express = require("express");
const { runDailyReportJob } = require("../jobs/reportCron");

const router = express.Router();

// GET /api/cron/daily-report
// Triggered by Vercel Cron or manual scheduled trigger
router.get("/daily-report", async (req, res) => {
  try {
    // Optional CRON_SECRET check for production security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ message: "Unauthorized cron request" });
      }
    }

    const result = await runDailyReportJob();
    res.json({
      message: "Daily report job executed successfully",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON ROUTE] Failed:", err.message);
    res.status(500).json({ message: "Failed to run daily report job", error: err.message });
  }
});

module.exports = router;
