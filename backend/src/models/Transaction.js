

// // // // // export default Transaction;
// // // // import mongoose from "mongoose";

// // // // const transactionSchema = new mongoose.Schema(
// // // //   {
// // // //     senderId: {
// // // //       type: String,
// // // //       required: [true, "Sender ID is required"],
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     receiverId: {
// // // //       type: String,
// // // //       required: [true, "Receiver ID is required"],
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     amount: {
// // // //       type: Number,
// // // //       required: [true, "Amount is required"],
// // // //       min: [0, "Amount must be positive"],
// // // //       set: (v) => Math.round(v * 100) / 100,
// // // //     },

// // // //     /* ============================= */
// // // //     /*   ENTITY RESOLUTION FIELDS    */
// // // //     /* ============================= */

// // // //     deviceId: {
// // // //       type: String,
// // // //       required: [true, "Device ID is required"],
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     ipAddress: {
// // // //       type: String,
// // // //       required: [true, "IP address is required"],
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     /* ============================= */
// // // //     /*        TEMPORAL FIELD         */
// // // //     /* ============================= */

// // // //     timestamp: {
// // // //       type: Date,
// // // //       default: Date.now,
// // // //       index: true,
// // // //     },

// // // //     /* ============================= */
// // // //     /*      SCORING COMPONENTS       */
// // // //     /* ============================= */

// // // //     // 🟡 Rule Engine Score (Backend)
// // // //     ruleScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     // 🔵 AI Model Score
// // // //     aiScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     // 🔴 Final Fraud Score
// // // //     fraudScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     riskLevel: {
// // // //       type: String,
// // // //       enum: ["low", "medium", "high"],
// // // //       default: "low",
// // // //       index: true,
// // // //     },

// // // //     isFraud: {
// // // //       type: Boolean,
// // // //       default: false,
// // // //       index: true,
// // // //     },

// // // //     status: {
// // // //       type: String,
// // // //       enum: ["pending", "processed"],
// // // //       default: "pending",
// // // //       index: true,
// // // //     },

// // // //     /* ============================= */
// // // //     /*      ML + PIPELINE FLAGS      */
// // // //     /* ============================= */

// // // //     mlProcessed: {
// // // //       type: Boolean,
// // // //       default: false,
// // // //       index: true,
// // // //     },
// // // //   },
// // // //   {
// // // //     timestamps: true,
// // // //   }
// // // // );

// // // // /* ============================= */
// // // // /*         INDEXES               */
// // // // /* ============================= */

// // // // // Compound index for sender-receiver lookup
// // // // transactionSchema.index({ senderId: 1, receiverId: 1 });

// // // // // For entity resolution speed
// // // // transactionSchema.index({ deviceId: 1, senderId: 1 });
// // // // transactionSchema.index({ ipAddress: 1, senderId: 1 });

// // // // // Dashboard sorting
// // // // transactionSchema.index({ createdAt: -1 });

// // // // // Risk filtering
// // // // transactionSchema.index({ riskLevel: 1, createdAt: -1 });

// // // // const Transaction = mongoose.model("Transaction", transactionSchema);

// // // // export default Transaction;
// // // // import mongoose from "mongoose";

// // // // const transactionSchema = new mongoose.Schema(
// // // //   {
// // // //     senderId: {
// // // //       type: String,
// // // //       required: true,
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     receiverId: {
// // // //       type: String,
// // // //       required: true,
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     amount: {
// // // //       type: Number,
// // // //       required: true,
// // // //       min: 0,
// // // //       set: (v) => Math.round(v * 100) / 100,
// // // //     },

// // // //     deviceId: {
// // // //       type: String,
// // // //       required: true,
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     ipAddress: {
// // // //       type: String,
// // // //       required: true,
// // // //       trim: true,
// // // //       index: true,
// // // //     },

// // // //     timestamp: {
// // // //       type: Date,
// // // //       default: Date.now,
// // // //       index: true,
// // // //     },

// // // //     /* ============================= */
// // // //     /*        SCORING LAYER          */
// // // //     /* ============================= */

// // // //     ruleScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     aiScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     fraudScore: {
// // // //       type: Number,
// // // //       min: 0,
// // // //       max: 1,
// // // //       default: 0,
// // // //       index: true,
// // // //     },

// // // //     riskLevel: {
// // // //       type: String,
// // // //       enum: ["low", "medium", "high"],
// // // //       default: "low",
// // // //       index: true,
// // // //     },

// // // //     isFraud: {
// // // //       type: Boolean,
// // // //       default: false,
// // // //       index: true,
// // // //     },

// // // //     /* ============================= */
// // // //     /*      PIPELINE TRACKING        */
// // // //     /* ============================= */

// // // //     processingStage: {
// // // //       type: String,
// // // //       enum: ["ingested", "rule_scored", "ml_pending", "ml_completed"],
// // // //       default: "ingested",
// // // //       index: true,
// // // //     },

// // // //     mlProcessed: {
// // // //       type: Boolean,
// // // //       default: false,
// // // //       index: true,
// // // //     },

// // // //     mlRequestedAt: {
// // // //       type: Date,
// // // //       default: null,
// // // //     },

// // // //     mlResponseAt: {
// // // //       type: Date,
// // // //       default: null,
// // // //     },

// // // //     alertCreated: {
// // // //       type: Boolean,
// // // //       default: false,
// // // //       index: true,
// // // //     },
// // // //   },
// // // //   { timestamps: true }
// // // // );

// // // // /* ============================= */
// // // // /*            INDEXES            */
// // // // /* ============================= */

// // // // transactionSchema.index({ deviceId: 1, senderId: 1 });
// // // // transactionSchema.index({ ipAddress: 1, senderId: 1 });
// // // // transactionSchema.index({ createdAt: -1 });
// // // // transactionSchema.index({ riskLevel: 1, createdAt: -1 });

// // // // const Transaction = mongoose.model("Transaction", transactionSchema);

// // // // export default Transaction;
// // // import mongoose from "mongoose";

// // // /* SUB-SCHEMAS */

// // // const entityLinkSchema = new mongoose.Schema(
// // //   {
// // //     type: {
// // //       type: String,
// // //       enum: ["SHARED_DEVICE", "SHARED_IP", "SHARED_EMAIL", "SHARED_PHONE"],
// // //       required: true,
// // //     },
// // //     linkedAccountId: { type: String, required: true },
// // //     confidence: { type: Number, min: 0, max: 1, required: true },
// // //     linkValue: { type: String, required: true },
// // //   },
// // //   { _id: false }
// // // );

// // // const shapValueSchema = new mongoose.Schema(
// // //   {
// // //     feature: { type: String, required: true },
// // //     value: { type: Number, required: true },
// // //   },
// // //   { _id: false }
// // // );

// // // const suspiciousPathSchema = new mongoose.Schema(
// // //   {
// // //     path: { type: [String], default: [] },
// // //     description: { type: String, default: "" },
// // //     pathScore: { type: Number, min: 0, max: 1, default: 0 },
// // //   },
// // //   { _id: false }
// // // );

// // // /* MAIN SCHEMA */

// // // const transactionSchema = new mongoose.Schema(
// // //   {
// // //     senderId: { type: String, required: true, trim: true, index: true },
// // //     receiverId: { type: String, required: true, trim: true, index: true },

// // //     amount: {
// // //       type: Number,
// // //       required: true,
// // //       min: 0,
// // //       set: (v) => Math.round(v * 100) / 100,
// // //     },

// // //     currency: { type: String, default: "INR", uppercase: true },
// // //     merchantCategory: { type: String, default: null },

// // //     deviceId: { type: String, required: true, index: true },
// // //     ipAddress: { type: String, required: true, index: true },

// // //     ipCountry: { type: String, default: null },
// // //     accountCountry: { type: String, default: null },

// // //     isVpn: { type: Boolean, default: false },
// // //     isProxy: { type: Boolean, default: false },

// // //     userAgent: { type: String, default: null },

// // //     /* ENTITY RESOLUTION */

// // //     entityResolution: {
// // //       links: { type: [entityLinkSchema], default: [] },
// // //       maxLinkConfidence: { type: Number, default: 0 },
// // //       linkedAccountCount: { type: Number, default: 0 },
// // //       resolvedAt: { type: Date, default: null },
// // //     },

// // //     /* GRAPH METADATA */

// // //     graphMetadata: {
// // //       neighborCount: { type: Number, default: 0 },
// // //       embeddingWeight: { type: Number, default: 0 },
// // //       graphWritten: { type: Boolean, default: false },
// // //       graphWrittenAt: { type: Date, default: null },
// // //     },

// // //     /* SCORING */

// // //     ruleScore: { type: Number, default: null },
// // //     aiScore: { type: Number, default: null },

// // //     fraudScore: {
// // //       type: Number,
// // //       default: null,
// // //       index: true,
// // //     },

// // //     confidence: { type: Number, default: null },

// // //     riskLevel: {
// // //       type: String,
// // //       enum: ["critical", "high", "medium", "low"],
// // //       default: null,
// // //       index: true,
// // //     },

// // //     scoringMethod: {
// // //       type: String,
// // //       enum: ["rule_based", "tabular_only", "gnn_hybrid"],
// // //       default: null,
// // //       index: true,
// // //     },

// // //     isFraud: { type: Boolean, default: null, index: true },

// // //     /* EXPLANATION */

// // //     explanation: {
// // //       shapValues: { type: [shapValueSchema], default: [] },
// // //       suspiciousPaths: { type: [suspiciousPathSchema], default: [] },
// // //       topReason: { type: String, default: null },
// // //     },

// // //     /* PIPELINE */

// // //     processingStage: {
// // //       type: String,
// // //       enum: [
// // //         "ingested",
// // //         "entity_resolved",
// // //         "graph_written",
// // //         "queued",
// // //         "rule_scored",
// // //         "ml_pending",
// // //         "ml_completed",
// // //         "alert_created",
// // //         "failed",
// // //       ],
// // //       default: "ingested",
// // //       index: true,
// // //     },

// // //     mlProcessed: { type: Boolean, default: false },
// // //     mlRequestedAt: { type: Date, default: null },
// // //     mlResponseAt: { type: Date, default: null },

// // //     mlLatencyMs: { type: Number, default: null },

// // //     /* QUEUE */

// // //     jobId: { type: String, default: null },

// // //     retryCount: {
// // //       type: Number,
// // //       default: 0,
// // //       max: 3,
// // //     },

// // //     inDlq: { type: Boolean, default: false, index: true },

// // //     lastErrorMessage: { type: String, default: null },

// // //     /* ALERT */

// // //     alertCreated: { type: Boolean, default: false, index: true },

// // //     alertId: {
// // //       type: mongoose.Schema.Types.ObjectId,
// // //       ref: "Alert",
// // //       default: null,
// // //     },

// // //     caseId: { type: String, default: null, index: true },

// // //     timestamp: {
// // //       type: Date,
// // //       default: Date.now,
// // //       index: true,
// // //     },
// // //   },
// // //   {
// // //     timestamps: true,
// // //     collection: "transactions",
// // //   }
// // // );

// // // /* INDEXES */

// // // transactionSchema.index({ deviceId: 1, senderId: 1, timestamp: -1 });
// // // transactionSchema.index({ ipAddress: 1, senderId: 1, timestamp: -1 });
// // // transactionSchema.index({ riskLevel: 1, createdAt: -1 });
// // // transactionSchema.index({ processingStage: 1, mlProcessed: 1 });
// // // transactionSchema.index({ inDlq: 1, createdAt: -1 });
// // // transactionSchema.index({ caseId: 1, createdAt: -1 });
// // // transactionSchema.index({ scoringMethod: 1, fraudScore: -1 });

// // // /* METHODS */

// // // transactionSchema.methods.applyFraudScore = function (
// // //   score,
// // //   confidence,
// // //   method,
// // //   riskLevel
// // // ) {
// // //   this.fraudScore = score;
// // //   this.confidence = confidence;
// // //   this.scoringMethod = method;
// // //   this.riskLevel = riskLevel;
// // //   this.isFraud = score >= 0.65;
// // //   return this;
// // // };

// // // transactionSchema.methods.recordRetry = function (errorMessage) {
// // //   this.retryCount += 1;
// // //   this.lastErrorMessage = errorMessage;

// // //   if (this.retryCount >= 3) {
// // //     this.inDlq = true;
// // //     this.processingStage = "failed";
// // //   }

// // //   return this;
// // // };

// // // /* PRE SAVE */

// // // transactionSchema.pre("save", function (next) {
// // //   if (this.mlRequestedAt && this.mlResponseAt && !this.mlLatencyMs) {
// // //     this.mlLatencyMs =
// // //       this.mlResponseAt.getTime() - this.mlRequestedAt.getTime();
// // //   }
// // //   next();
// // // });

// // // const Transaction = mongoose.model("Transaction", transactionSchema);

// // // export default Transaction;

// // import mongoose from "mongoose";

// // /* SUB-SCHEMAS */

// // const entityLinkSchema = new mongoose.Schema(
// //   {
// //     type: {
// //       type: String,
// //       enum: ["SHARED_DEVICE", "SHARED_IP", "SHARED_EMAIL", "SHARED_PHONE"],
// //       required: true,
// //     },
// //     linkedAccountId: { type: String, required: true },
// //     confidence: { type: Number, min: 0, max: 1, required: true },
// //     linkValue: { type: String, required: true },
// //   },
// //   { _id: false }
// // );

// // const shapValueSchema = new mongoose.Schema(
// //   {
// //     feature: { type: String, required: true },
// //     value: { type: Number, required: true },
// //   },
// //   { _id: false }
// // );

// // const suspiciousPathSchema = new mongoose.Schema(
// //   {
// //     path: { type: [String], default: [] },
// //     description: { type: String, default: "" },
// //     pathScore: { type: Number, min: 0, max: 1, default: 0 },
// //   },
// //   { _id: false }
// // );

// // /* MAIN SCHEMA */

// // const transactionSchema = new mongoose.Schema(
// //   {
// //     senderId: { type: String, required: true, trim: true, index: true },
// //     receiverId: { type: String, required: true, trim: true, index: true },

// //     amount: {
// //       type: Number,
// //       required: true,
// //       min: 0,
// //       set: (v) => Math.round(v * 100) / 100,
// //     },

// //     currency: { type: String, default: "INR", uppercase: true },
// //     merchantCategory: { type: String, default: null },

// //     deviceId: { type: String, required: true, index: true },
// //     ipAddress: { type: String, required: true, index: true },

// //     /* 🔥 ADD THIS (CRITICAL FIX) */
// //     goldenId: {
// //       type: String,
// //       index: true,
// //     },

// //     ipCountry: { type: String, default: null },
// //     accountCountry: { type: String, default: null },

// //     isVpn: { type: Boolean, default: false },
// //     isProxy: { type: Boolean, default: false },

// //     userAgent: { type: String, default: null },

// //     /* 🔥 FIXED ENTITY RESOLUTION */

// //     entityResolution: {
// //       ruleScore: { type: Number, default: 0 }, // ✅ ADD
// //       goldenId: { type: String, default: null }, // ✅ ADD
// //       links: { type: [entityLinkSchema], default: [] },
// //       maxLinkConfidence: { type: Number, default: 0 },
// //       linkedAccountCount: { type: Number, default: 0 },
// //       resolvedAt: { type: Date, default: null },
// //     },

// //     /* REST UNCHANGED */

// //     graphMetadata: {
// //       neighborCount: { type: Number, default: 0 },
// //       embeddingWeight: { type: Number, default: 0 },
// //       graphWritten: { type: Boolean, default: false },
// //       graphWrittenAt: { type: Date, default: null },
// //     },

// //     ruleScore: { type: Number, default: null },
// //     aiScore: { type: Number, default: null },

// //     fraudScore: {
// //       type: Number,
// //       default: null,
// //       index: true,
// //     },

// //     confidence: { type: Number, default: null },

// //     riskLevel: {
// //       type: String,
// //       enum: ["critical", "high", "medium", "low"],
// //       default: null,
// //       index: true,
// //     },

// //     scoringMethod: {
// //       type: String,
// //       enum: ["rule_based", "tabular_only", "gnn_hybrid"],
// //       default: null,
// //       index: true,
// //     },

// //     isFraud: { type: Boolean, default: null, index: true },

// //     explanation: {
// //       shapValues: { type: [shapValueSchema], default: [] },
// //       suspiciousPaths: { type: [suspiciousPathSchema], default: [] },
// //       topReason: { type: String, default: null },
// //     },

// //     processingStage: {
// //       type: String,
// //       enum: [
// //         "ingested",
// //         "entity_resolved",
// //         "graph_written",
// //         "queued",
// //         "rule_scored",
// //         "ml_pending",
// //         "ml_completed",
// //         "alert_created",
// //         "failed",
// //       ],
// //       default: "ingested",
// //       index: true,
// //     },

// //     mlProcessed: { type: Boolean, default: false },
// //     mlRequestedAt: { type: Date, default: null },
// //     mlResponseAt: { type: Date, default: null },

// //     mlLatencyMs: { type: Number, default: null },

// //     jobId: { type: String, default: null },

// //     retryCount: {
// //       type: Number,
// //       default: 0,
// //       max: 3,
// //     },

// //     inDlq: { type: Boolean, default: false, index: true },

// //     lastErrorMessage: { type: String, default: null },

// //     alertCreated: { type: Boolean, default: false, index: true },

// //     alertId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Alert",
// //       default: null,
// //     },

// //     caseId: { type: String, default: null, index: true },

// //     timestamp: {
// //       type: Date,
// //       default: Date.now,
// //       index: true,
// //     },
// //   },
// //   {
// //     timestamps: true,
// //     collection: "transactions",
// //   }
// // );

// // /* (rest unchanged) */

// // const Transaction = mongoose.model("Transaction", transactionSchema);

// // export default Transaction;


// import mongoose from "mongoose";

// /* SUB-SCHEMAS */

// const entityLinkSchema = new mongoose.Schema(
//   {
//     type: {
//       type: String,
//       enum: ["SHARED_DEVICE", "SHARED_IP", "SHARED_EMAIL", "SHARED_PHONE"],
//       required: true,
//     },
//     linkedAccountId: { type: String, required: true },
//     confidence: { type: Number, min: 0, max: 1, required: true },
//     linkValue: { type: String, required: true },
//   },
//   { _id: false }
// );

// const shapValueSchema = new mongoose.Schema(
//   {
//     feature: { type: String, required: true },
//     value: { type: Number, required: true },
//   },
//   { _id: false }
// );

// const suspiciousPathSchema = new mongoose.Schema(
//   {
//     path: { type: [String], default: [] },
//     description: { type: String, default: "" },
//     pathScore: { type: Number, min: 0, max: 1, default: 0 },
//   },
//   { _id: false }
// );

// /* MAIN SCHEMA */

// const transactionSchema = new mongoose.Schema(
//   {
//     senderId: { type: String, required: true, trim: true, index: true },
//     receiverId: { type: String, required: true, trim: true, index: true },

//     amount: {
//       type: Number,
//       required: true,
//       min: 0,
//       set: (v) => Math.round(v * 100) / 100,
//     },

//     currency: { type: String, default: "INR", uppercase: true },
//     merchantCategory: { type: String, default: null },

//     deviceId: { type: String, default: null, index: true },
//     ipAddress: { type: String, default: null, index: true },

//     /* ✅ ADD (IMPORTANT) */
//     email: {
//       type: String,
//       index: true,
//       lowercase: true,
//       trim: true,
//       default: null,
//     },

//     phone: {
//       type: String,
//       index: true,
//       trim: true,
//       default: null,
//     },

//     /* ✅ GOLDEN ID */
//     goldenId: {
//       type: String,
//       index: true,
//     },

//     ipCountry: { type: String, default: null },
//     accountCountry: { type: String, default: null },

//     isVpn: { type: Boolean, default: false },
//     isProxy: { type: Boolean, default: false },

//     userAgent: { type: String, default: null },

//     /* ✅ ENTITY RESOLUTION FIXED */

//     entityResolution: {
//       ruleScore: { type: Number, default: 0 },
//       goldenId: { type: String, default: null },
//       links: { type: [entityLinkSchema], default: [] },
//       maxLinkConfidence: { type: Number, default: 0 },
//       linkedAccountCount: { type: Number, default: 0 },
//       resolvedAt: { type: Date, default: null },
//     },

//     /* GRAPH METADATA */

//     graphMetadata: {
//       neighborCount: { type: Number, default: 0 },
//       embeddingWeight: { type: Number, default: 0 },
//       graphWritten: { type: Boolean, default: false },
//       graphWrittenAt: { type: Date, default: null },
//     },

//     /* SCORING */

//     ruleScore: { type: Number, default: null },
//     aiScore: { type: Number, default: null },

//     fraudScore: {
//       type: Number,
//       default: null,
//       index: true,
//     },

//     confidence: { type: Number, default: null },

//     riskLevel: {
//       type: String,
//       enum: ["critical", "high", "medium", "low"],
//       default: null,
//       index: true,
//     },

//     scoringMethod: {
//       type: String,
//       // rule_based, xgboost           — real methods from Python scorer
//       // gnn_hybrid_fallback           — GNN slot using XGBoost until GNN is trained
//       // tabular_only, gnn_hybrid      — legacy values (kept for backward compat)
//       enum: ["rule_based", "xgboost", "gnn_hybrid_fallback", "tabular_only", "gnn_hybrid"],
//       default: null,
//       index: true,
//     },

//     isFraud: { type: Boolean, default: null, index: true },

//     /* EXPLANATION */

//     explanation: {
//       shapValues: { type: [shapValueSchema], default: [] },
//       suspiciousPaths: { type: [suspiciousPathSchema], default: [] },
//       topReason: { type: String, default: null },
//     },

//     /* PIPELINE */

//     processingStage: {
//       type: String,
//       enum: [
//         "ingested",
//         "entity_resolved",
//         "graph_written",
//         "queued",
//         "rule_scored",
//         "ml_pending",
//         "ml_completed",
//         "alert_created",
//         "failed",
//       ],
//       default: "ingested",
//       index: true,
//     },

//     mlProcessed: { type: Boolean, default: false },
//     mlRequestedAt: { type: Date, default: null },
//     mlResponseAt: { type: Date, default: null },

//     mlLatencyMs: { type: Number, default: null },

//     /* QUEUE */

//     jobId: { type: String, default: null },

//     retryCount: {
//       type: Number,
//       default: 0,
//       max: 3,
//     },

//     inDlq: { type: Boolean, default: false, index: true },

//     lastErrorMessage: { type: String, default: null },

//     /* ALERT */

//     alertCreated: { type: Boolean, default: false, index: true },

//     alertId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Alert",
//       default: null,
//     },

//     caseId: { type: String, default: null, index: true },

//     timestamp: {
//       type: Date,
//       default: Date.now,
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//     collection: "transactions",
//   }
// );

// /* ✅ INDEXES (GOOD PRACTICE) */

// transactionSchema.index({ deviceId: 1, senderId: 1, timestamp: -1 });
// transactionSchema.index({ ipAddress: 1, senderId: 1, timestamp: -1 });
// transactionSchema.index({ riskLevel: 1, createdAt: -1 });
// transactionSchema.index({ processingStage: 1, mlProcessed: 1 });

// /* ✅ METHODS (CRITICAL — DO NOT REMOVE) */

// transactionSchema.methods.applyFraudScore = function (
//   score,
//   confidence,
//   method,
//   riskLevel
// ) {
//   this.fraudScore = score;
//   this.confidence = confidence;
//   this.scoringMethod = method;
//   this.riskLevel = riskLevel;
//   this.isFraud = score >= 0.65;
//   return this;
// };

// transactionSchema.methods.recordRetry = function (errorMessage) {
//   this.retryCount += 1;
//   this.lastErrorMessage = errorMessage;

//   if (this.retryCount >= 3) {
//     this.inDlq = true;
//     this.processingStage = "failed";
//   }

//   return this;
// };

// /* PRE SAVE */

// transactionSchema.pre("save", function (next) {
//   if (this.mlRequestedAt && this.mlResponseAt && !this.mlLatencyMs) {
//     this.mlLatencyMs =
//       this.mlResponseAt.getTime() - this.mlRequestedAt.getTime();
//   }

// });

// const Transaction = mongoose.model("Transaction", transactionSchema);

// export default Transaction;

import mongoose from "mongoose";

/* ================= SUB-SCHEMAS ================= */

const entityLinkSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["SHARED_DEVICE", "SHARED_IP", "SHARED_EMAIL", "SHARED_PHONE"],
      required: true,
    },
    linkedAccountId: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    linkValue: { type: String, required: true },
  },
  { _id: false }
);

const shapValueSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const suspiciousPathSchema = new mongoose.Schema(
  {
    path: { type: [String], default: [] },
    description: { type: String, default: "" },
    pathScore: { type: Number, min: 0, max: 1, default: 0 },
  },
  { _id: false }
);

/* ================= MAIN SCHEMA ================= */

const transactionSchema = new mongoose.Schema(
  {
    /* BASIC INFO */
    senderId: { type: String, required: true, trim: true, index: true },
    receiverId: { type: String, required: true, trim: true, index: true },

    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (v) => Math.round(v * 100) / 100,
    },

    currency: { type: String, default: "INR", uppercase: true },
    merchantCategory: { type: String, default: null },

    /* DEVICE + NETWORK (NOW OPTIONAL → IMPORTANT) */
    deviceId: { type: String, default: null, index: true },
    ipAddress: { type: String, default: null, index: true },

    userAgent: { type: String, default: null },

    /* CONTACT SIGNALS */
    email: {
      type: String,
      index: true,
      lowercase: true,
      trim: true,
      default: null,
    },

    phone: {
      type: String,
      index: true,
      trim: true,
      default: null,
    },

    /* IDENTITY */
    goldenId: {
      type: String,
      index: true,
    },

    /* GEO + NETWORK INTELLIGENCE */
    ipCountry: { type: String, default: null },
    accountCountry: { type: String, default: null },

    isVpn: { type: Boolean, default: false },
    isProxy: { type: Boolean, default: false },

    enriched: { type: Boolean, default: false }, // ✅ backend verified data

    ipMetadata: {
      isp: { type: String, default: null },
      city: { type: String, default: null },
      region: { type: String, default: null },
      timezone: { type: String, default: null },
    },

    /* BEHAVIORAL FEATURES (HIGH VALUE) */
    isFirstTransaction: { type: Boolean, default: false },
    isNewDevice: { type: Boolean, default: false },
    isNewIp: { type: Boolean, default: false },

    transactionCount1h: { type: Number, default: 0 },
    transactionCount24h: { type: Number, default: 0 },

    avgAmount7d: { type: Number, default: 0 },
    amountDeviation: { type: Number, default: 0 },

    /* ENTITY RESOLUTION */
    entityResolution: {
      ruleScore: { type: Number, default: 0 },
      links: { type: [entityLinkSchema], default: [] },
      maxLinkConfidence: { type: Number, default: 0 },
      linkedAccountCount: { type: Number, default: 0 },
      resolvedAt: { type: Date, default: null },
    },

    /* GRAPH METADATA */
    graphMetadata: {
      neighborCount: { type: Number, default: 0 },
      embeddingWeight: { type: Number, default: 0 },
      graphWritten: { type: Boolean, default: false },
      graphWrittenAt: { type: Date, default: null },
    },

    /* SCORING */
    ruleScore: { type: Number, default: null },
    aiScore: { type: Number, default: null },

    fraudScore: {
      type: Number,
      default: null,
      index: true,
    },

    confidence: { type: Number, default: null },

    riskLevel: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: null,
      index: true,
    },

    scoringMethod: {
      type: String,
      enum: ["rule_based", "xgboost", "gnn_hybrid_fallback"],
      default: null,
      index: true,
    },

    isFraud: { type: Boolean, default: null, index: true },

    /* ✅ NEW: RISK EXPLANATION SIGNALS */
    riskSignals: {
      type: [String],
      default: [],
    },

    scoreBreakdown: {
      vpn: { type: Number, default: 0 },
      proxy: { type: Number, default: 0 },
      geoMismatch: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      device: { type: Number, default: 0 },
    },

    /* EXPLANATION */
    explanation: {
      shapValues: { type: [shapValueSchema], default: [] },
      suspiciousPaths: { type: [suspiciousPathSchema], default: [] },
      topReason: { type: String, default: null },
    },

    /* PIPELINE */
    processingStage: {
      type: String,
      enum: [
        "ingested",
        "entity_resolved",
        "graph_written",
        "queued",
        "rule_scored",
        "ml_pending",
        "ml_completed",
        "alert_created",
        "failed",
      ],
      default: "ingested",
      index: true,
    },

    mlProcessed: { type: Boolean, default: false },
    mlRequestedAt: { type: Date, default: null },
    mlResponseAt: { type: Date, default: null },

    mlLatencyMs: { type: Number, default: null },

    /* QUEUE */
    jobId: { type: String, default: null },

    retryCount: { type: Number, default: 0, max: 3 },

    inDlq: { type: Boolean, default: false, index: true },

    lastErrorMessage: { type: String, default: null },

    /* ALERT */
    alertCreated: { type: Boolean, default: false, index: true },

    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      default: null,
    },

    caseId: { type: String, default: null, index: true },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

/* ================= INDEXES ================= */

transactionSchema.index({ deviceId: 1, senderId: 1, timestamp: -1 });
transactionSchema.index({ ipAddress: 1, senderId: 1, timestamp: -1 });
transactionSchema.index({ riskLevel: 1, createdAt: -1 });
transactionSchema.index({ processingStage: 1, mlProcessed: 1 });

/* ================= METHODS ================= */

transactionSchema.methods.applyFraudScore = function (
  score,
  confidence,
  method,
  riskLevel
) {
  this.fraudScore = score;
  this.confidence = confidence;
  this.scoringMethod = method;
  this.riskLevel = riskLevel;
  this.isFraud = score >= 0.65;
  return this;
};

transactionSchema.methods.recordRetry = function (errorMessage) {
  this.retryCount += 1;
  this.lastErrorMessage = errorMessage;

  if (this.retryCount >= 3) {
    this.inDlq = true;
    this.processingStage = "failed";
  }

  return this;
};

/* ================= PRE SAVE ================= */

// transactionSchema.pre("save", function (next) {
//   if (this.mlRequestedAt && this.mlResponseAt && !this.mlLatencyMs) {
//     this.mlLatencyMs =
//       this.mlResponseAt.getTime() - this.mlRequestedAt.getTime();
//   }
//   next();
// });

transactionSchema.pre("save", async function () {
  if (this.mlRequestedAt && this.mlResponseAt && !this.mlLatencyMs) {
    this.mlLatencyMs =
      this.mlResponseAt.getTime() - this.mlRequestedAt.getTime();
  }
});
const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;