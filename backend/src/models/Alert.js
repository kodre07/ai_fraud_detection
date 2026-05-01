// import mongoose from "mongoose";

// const alertSchema = new mongoose.Schema(
//   {
//     transactionId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Transaction",
//       required: true,
//       // ❌ REMOVE index: true here
//     },

//     accountId: {
//       type: String,
//       required: true,
//       index: true,
//     },

//     fraudScore: {
//       type: Number,
//       required: true,
//       min: 0,
//       max: 1,
//       index: true,
//     },

//     riskLevel: {
//       type: String,
//       enum: ["low", "medium", "high"],
//       required: true,
//       index: true,
//     },

//     status: {
//       type: String,
//       enum: ["open", "reviewing", "closed"],
//       default: "open",
//       index: true,
//     },

//     assignedTo: {
//       type: String,
//       default: null,
//       index: true,
//     },

//     analystDecision: {
//       type: String,
//       enum: ["fraud", "legitimate", null],
//       default: null,
//       index: true,
//     },

//     reviewedAt: {
//       type: Date,
//       default: null,
//     },

//     explanation: {
//       type: Object,
//       default: {},
//     },

//     suspiciousPaths: {
//       type: [String],
//       default: [],
//     },
//   },
//   { timestamps: true }
// );

// /* ✅ ONLY ONE INDEX DEFINITION */
// alertSchema.index({ transactionId: 1 }, { unique: true });

// const Alert = mongoose.model("Alert", alertSchema);

// export default Alert;


import mongoose from "mongoose";

/* ============================= */
/*   SUB-SCHEMA (MATCH TXN)      */
/* ============================= */

const suspiciousPathSchema = new mongoose.Schema(
  {
    path: { type: [String], default: [] },
    description: { type: String, default: "" },
    pathScore: { type: Number, min: 0, max: 1, default: 0 },
  },
  { _id: false }
);

/* ============================= */
/*         MAIN SCHEMA           */
/* ============================= */

const alertSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
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

    // ✅ FIX 1: Add "critical"
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
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

    /* ============================= */
    /*      EXPLAINABILITY           */
    /* ============================= */

    explanation: {
      type: Object,
      default: {},
    },

    // ✅ FIX 2: Match Transaction schema (STRUCTURED)
    suspiciousPaths: {
      type: [suspiciousPathSchema],
      default: [],
    },

    // ✅ Method name from Python scorer — must stay in sync with Transaction.scoringMethod
    methodUsed: {
      type: String,
      enum: ["rule_based", "xgboost", "gnn_hybrid_fallback"],
      default: null,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
  },
  { timestamps: true }
);

/* ============================= */
/*            INDEXES            */
/* ============================= */

// ✅ Prevent duplicate alerts per transaction
alertSchema.index({ transactionId: 1 }, { unique: true });

// ✅ Analyst queue optimization
alertSchema.index({ status: 1, riskLevel: -1, createdAt: -1 });

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;