// import mongoose from "mongoose";

// const caseSchema = new mongoose.Schema(
//   {
//     accountId: {
//       type: String,
//       required: true,
//       index: true,
//     },

//     alerts: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Alert",
//       },
//     ],

//     priorityScore: {
//       type: Number,
//       default: 0,
//       index: true,
//     },

//     riskLevel: {
//       type: String,
//       enum: ["critical", "high", "medium", "low"],
//       default: "low",
//       index: true,
//     },

//     status: {
//       type: String,
//       enum: ["open", "under_review", "closed"],
//       default: "open",
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// const Case = mongoose.model("Case", caseSchema);

// export default Case;


import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      index: true,
    },

    alerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Alert",
      },
    ],

    priorityScore: {
      type: Number,
      default: 0,
      index: true,
    },

    riskLevel: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "low",
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "under_review", "closed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

/* 🔥 IMPORTANT INDEXES */

// Fast lookup
// caseSchema.index({ accountId: 1, status: 1 });

// Prevent multiple open cases for same account
caseSchema.index(
  { accountId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

const Case = mongoose.model("Case", caseSchema);

export default Case;