import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      // ❌ REMOVE index: true here
    },

    accountId: {
      type: String,
      required: true,
      index: true,
    },

    fraudScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "reviewing", "closed"],
      default: "open",
      index: true,
    },

    assignedTo: {
      type: String,
      default: null,
      index: true,
    },

    analystDecision: {
      type: String,
      enum: ["fraud", "legitimate", null],
      default: null,
      index: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    explanation: {
      type: Object,
      default: {},
    },

    suspiciousPaths: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

/* ✅ ONLY ONE INDEX DEFINITION */
alertSchema.index({ transactionId: 1 }, { unique: true });

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;