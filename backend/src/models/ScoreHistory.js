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
      // Must stay in sync with:
      //   Transaction.scoringMethod
      //   Alert.methodUsed
      //   Python scorer: scoring/scorer.py route()
      enum: ["rule_based", "xgboost", "gnn_hybrid_fallback"],
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