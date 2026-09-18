const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "SUBSCRIPTION"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    planName: { type: String }, // only relevant when type === "SUBSCRIPTION"
    status: { type: String, enum: ["SUCCESS", "PENDING", "FAILED"], default: "SUCCESS" },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
