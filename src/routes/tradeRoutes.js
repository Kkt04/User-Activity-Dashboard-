const express = require("express");
const {
  placeTrade,
  getMyTrades,
  deposit,
  withdraw,
  subscribe,
} = require("../controllers/tradeController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes below require a valid JWT
router.use(protect);

router.post("/trades", placeTrade);
router.get("/trades", getMyTrades);

router.post("/transactions/deposit", deposit);
router.post("/transactions/withdraw", withdraw);
router.post("/transactions/subscribe", subscribe);

module.exports = router;
