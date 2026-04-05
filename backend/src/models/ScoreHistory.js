import mongoose from "mongoose";

const scoreHistorySchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true,
    },

    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    methodUsed: {
      type: String,
      enum: ["rule_based", "tabular_only", "gnn_hybrid"],
      default: null,
    },

    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

/* 🔥 IMPORTANT INDEX */
scoreHistorySchema.index({ accountId: 1, timestamp: -1 });

const ScoreHistory = mongoose.model("ScoreHistory", scoreHistorySchema);

export default ScoreHistory;