const express = require("express");
const {
  getUserSummary,
  getAdminOverview,
  downloadTradeReportCsv,
} = require("../controllers/analyticsController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/summary", getUserSummary);
router.get("/report/csv", downloadTradeReportCsv);
router.get("/admin/overview", restrictTo("admin"), getAdminOverview);

module.exports = router;
