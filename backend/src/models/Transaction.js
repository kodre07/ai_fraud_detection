

// // export default Transaction;
// import mongoose from "mongoose";

// const transactionSchema = new mongoose.Schema(
//   {
//     senderId: {
//       type: String,
//       required: [true, "Sender ID is required"],
//       trim: true,
//       index: true,
//     },

//     receiverId: {
//       type: String,
//       required: [true, "Receiver ID is required"],
//       trim: true,
//       index: true,
//     },

//     amount: {
//       type: Number,
//       required: [true, "Amount is required"],
//       min: [0, "Amount must be positive"],
//       set: (v) => Math.round(v * 100) / 100,
//     },

//     /* ============================= */
//     /*   ENTITY RESOLUTION FIELDS    */
//     /* ============================= */

//     deviceId: {
//       type: String,
//       required: [true, "Device ID is required"],
//       trim: true,
//       index: true,
//     },

//     ipAddress: {
//       type: String,
//       required: [true, "IP address is required"],
//       trim: true,
//       index: true,
//     },

//     /* ============================= */
//     /*        TEMPORAL FIELD         */
//     /* ============================= */

//     timestamp: {
//       type: Date,
//       default: Date.now,
//       index: true,
//     },

//     /* ============================= */
//     /*      SCORING COMPONENTS       */
//     /* ============================= */

//     // 🟡 Rule Engine Score (Backend)
//     ruleScore: {
//       type: Number,
//       min: 0,
//       max: 1,
//       default: 0,
//       index: true,
//     },

//     // 🔵 AI Model Score
//     aiScore: {
//       type: Number,
//       min: 0,
//       max: 1,
//       default: 0,
//       index: true,
//     },

//     // 🔴 Final Fraud Score
//     fraudScore: {
//       type: Number,
//       min: 0,
//       max: 1,
//       default: 0,
//       index: true,
//     },

//     riskLevel: {
//       type: String,
//       enum: ["low", "medium", "high"],
//       default: "low",
//       index: true,
//     },

//     isFraud: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },

//     status: {
//       type: String,
//       enum: ["pending", "processed"],
//       default: "pending",
//       index: true,
//     },

//     /* ============================= */
//     /*      ML + PIPELINE FLAGS      */
//     /* ============================= */

//     mlProcessed: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// /* ============================= */
// /*         INDEXES               */
// /* ============================= */

// // Compound index for sender-receiver lookup
// transactionSchema.index({ senderId: 1, receiverId: 1 });

// // For entity resolution speed
// transactionSchema.index({ deviceId: 1, senderId: 1 });
// transactionSchema.index({ ipAddress: 1, senderId: 1 });

// // Dashboard sorting
// transactionSchema.index({ createdAt: -1 });

// // Risk filtering
// transactionSchema.index({ riskLevel: 1, createdAt: -1 });

// const Transaction = mongoose.model("Transaction", transactionSchema);

// export default Transaction;
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    receiverId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (v) => Math.round(v * 100) / 100,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    ipAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /* ============================= */
    /*        SCORING LAYER          */
    /* ============================= */

    ruleScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
      index: true,
    },

    aiScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
      index: true,
    },

    fraudScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
      index: true,
    },

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true,
    },

    isFraud: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ============================= */
    /*      PIPELINE TRACKING        */
    /* ============================= */

    processingStage: {
      type: String,
      enum: ["ingested", "rule_scored", "ml_pending", "ml_completed"],
      default: "ingested",
      index: true,
    },

    mlProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },

    mlRequestedAt: {
      type: Date,
      default: null,
    },

    mlResponseAt: {
      type: Date,
      default: null,
    },

    alertCreated: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

/* ============================= */
/*            INDEXES            */
/* ============================= */

transactionSchema.index({ deviceId: 1, senderId: 1 });
transactionSchema.index({ ipAddress: 1, senderId: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ riskLevel: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;