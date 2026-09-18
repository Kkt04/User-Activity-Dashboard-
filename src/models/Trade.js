const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true }, // e.g. "BTC", "RELIANCE"
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // price per unit at trade time
    amount: { type: Number, required: true }, // quantity * price, computed
    status: { type: String, enum: ["EXECUTED", "PENDING", "FAILED"], default: "EXECUTED" },
  },
  { timestamps: true } // createdAt acts as the trade timestamp
);

// Compound index -> fast "all trades for a user in a date range" queries
tradeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Trade", tradeSchema);
