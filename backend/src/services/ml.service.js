

// // // import Transaction from "../models/Transaction.js";
// // // import Alert from "../models/Alert.js";
// // // import ScoreHistory from "../models/ScoreHistory.js";
// // // import graphService from "./graph.service.js";

// // // /* ============================= */
// // // /*   HELPER: COMPUTE STATS       */
// // // /* ============================= */

// // // const computeRiskStats = async (accountId) => {
// // //   const now = new Date();

// // //   const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
// // //   const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

// // //   const history7d = await ScoreHistory.find({
// // //     accountId,
// // //     timestamp: { $gte: last7Days },
// // //   });

// // //   const history30d = await ScoreHistory.find({
// // //     accountId,
// // //     timestamp: { $gte: last30Days },
// // //   });

// // //   const last5 = await ScoreHistory.find({ accountId })
// // //     .sort({ timestamp: -1 })
// // //     .limit(5);

// // //   const avg7 =
// // //     history7d.length > 0
// // //       ? history7d.reduce((sum, x) => sum + x.score, 0) /
// // //         history7d.length
// // //       : 0;

// // //   const avg30 =
// // //     history30d.length > 0
// // //       ? history30d.reduce((sum, x) => sum + x.score, 0) /
// // //         history30d.length
// // //       : 0;

// // //   const peak =
// // //     history30d.length > 0
// // //       ? Math.max(...history30d.map((x) => x.score))
// // //       : 0;

// // //   const last5Scores = last5.map((x) => x.score);

// // //   const riskVelocity = avg7 - avg30;

// // //   return {
// // //     avg7: Number(avg7.toFixed(4)),
// // //     avg30: Number(avg30.toFixed(4)),
// // //     peak: Number(peak.toFixed(4)),
// // //     last5Scores,
// // //     riskVelocity: Number(riskVelocity.toFixed(4)),
// // //   };
// // // };

// // // /* ============================= */
// // // /*      MAIN ML PROCESSOR        */
// // // /* ============================= */

// // // const processMLResult = async ({
// // //   transactionId,

// // //   score,
// // //   riskLevel,
// // //   methodUsed,
// // //   confidence,

// // //   aiScore,

// // //   shapExplanation = {},
// // //   suspiciousPaths = [],
// // // }) => {
// // //   try {
// // //     /* ============================= */
// // //     /* 1️⃣ Fetch Transaction         */
// // //     /* ============================= */

// // //     const transaction = await Transaction.findById(transactionId);

// // //     if (!transaction) {
// // //       throw new Error("Transaction not found");
// // //     }

// // //     /* ============================= */
// // //     /* 2️⃣ Prevent Double Processing */
// // //     /* ============================= */

// // //     if (transaction.mlProcessed) {
// // //       return {
// // //         transaction,
// // //         alert: null,
// // //         message: "ML already processed",
// // //       };
// // //     }

// // //     /* ============================= */
// // //     /* 3️⃣ Resolve Final Values      */
// // //     /* ============================= */

// // //     const finalScore = score ?? aiScore;
// // //     const finalRiskLevel = riskLevel ?? null;
// // //     const finalMethod = methodUsed ?? "tabular_only";
// // //     const finalConfidence = confidence ?? null;

// // //     /* ============================= */
// // //     /* 4️⃣ Update Transaction        */
// // //     /* ============================= */

// // //     transaction.aiScore = aiScore ?? finalScore;
// // //     transaction.mlProcessed = true;
// // //     transaction.mlResponseAt = new Date();
// // //     transaction.processingStage = "ml_completed";

// // //     transaction.applyFraudScore(
// // //       Number(finalScore.toFixed(4)),
// // //       finalConfidence,
// // //       finalMethod,
// // //       finalRiskLevel
// // //     );

// // //     /* ============================= */
// // //     /* 5️⃣ Store Explainability      */
// // //     /* ============================= */

// // //     if (shapExplanation && typeof shapExplanation === "object") {
// // //       transaction.explanation.shapValues = Object.entries(
// // //         shapExplanation
// // //       ).map(([feature, value]) => ({
// // //         feature,
// // //         value,
// // //       }));
// // //     }

// // //     transaction.explanation.suspiciousPaths =
// // //       suspiciousPaths || [];

// // //     /* ============================= */
// // //     /* 6️⃣ SAVE SCORE HISTORY 🔥     */
// // //     /* ============================= */

// // //     await ScoreHistory.create({
// // //       accountId: transaction.senderId,
// // //       transactionId: transaction._id,
// // //       score: transaction.fraudScore,
// // //       methodUsed: transaction.scoringMethod,
// // //       confidenceScore: transaction.confidence,
// // //     });

// // //     /* ============================= */
// // //     /* 7️⃣ COMPUTE TEMPORAL STATS 🔥 */
// // //     /* ============================= */

// // //     const stats = await computeRiskStats(transaction.senderId);

// // //     // 👉 For MVP: just log (no Neo4j yet)
// // //     await graphService.updateAccountRiskProfile(
// // //       transaction.senderId,
// // //       stats
// // //     );

// // //     /* ============================= */
// // //     /* 8️⃣ Create Alert              */
// // //     /* ============================= */

// // //     let alert = null;

// // //     if (["high", "critical"].includes(transaction.riskLevel)) {
// // //       const existingAlert = await Alert.findOne({
// // //         transactionId: transaction._id,
// // //       });

// // //       if (!existingAlert) {
// // //         alert = await Alert.create({
// // //           transactionId: transaction._id,
// // //           accountId: transaction.senderId,
// // //           fraudScore: transaction.fraudScore,
// // //           riskLevel: transaction.riskLevel,
// // //           status: "open",
// // //           explanation: shapExplanation,
// // //           suspiciousPaths,
// // //           methodUsed: transaction.scoringMethod,
// // //           confidence: transaction.confidence,
// // //         });

// // //         transaction.alertCreated = true;
// // //       }
// // //     }

// // //     /* ============================= */
// // //     /* 9️⃣ Save Transaction          */
// // //     /* ============================= */

// // //     await transaction.save();

// // //     /* ============================= */
// // //     /* 🔟 Return Result             */
// // //     /* ============================= */

// // //     return {
// // //       transaction,
// // //       alert,
// // //       stats, // ✅ useful for future dashboard
// // //     };
// // //   } catch (error) {
// // //     console.error("❌ ML Service Error:", error);
// // //     throw error;
// // //   }
// // // };

// // // export default {
// // //   processMLResult,
// // // };

// // import Transaction from "../models/Transaction.js";
// // import Alert from "../models/Alert.js";
// // import ScoreHistory from "../models/ScoreHistory.js";
// // import graphService from "./graph.service.js";
// // import alertPostProcessingService from "./alertPostProcessing.service.js";

// // /* ============================= */
// // /*   HELPER: COMPUTE STATS       */
// // /* ============================= */

// // const computeRiskStats = async (accountId) => {
// //   const now = new Date();

// //   const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
// //   const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

// //   const history7d = await ScoreHistory.find({
// //     accountId,
// //     timestamp: { $gte: last7Days },
// //   });

// //   const history30d = await ScoreHistory.find({
// //     accountId,
// //     timestamp: { $gte: last30Days },
// //   });

// //   const last5 = await ScoreHistory.find({ accountId })
// //     .sort({ timestamp: -1 })
// //     .limit(5);

// //   const avg7 =
// //     history7d.length > 0
// //       ? history7d.reduce((sum, x) => sum + x.score, 0) /
// //       history7d.length
// //       : 0;

// //   const avg30 =
// //     history30d.length > 0
// //       ? history30d.reduce((sum, x) => sum + x.score, 0) /
// //       history30d.length
// //       : 0;

// //   const peak =
// //     history30d.length > 0
// //       ? Math.max(...history30d.map((x) => x.score))
// //       : 0;

// //   const last5Scores = last5.map((x) => x.score);

// //   const riskVelocity = avg7 - avg30;

// //   return {
// //     avg7: Number(avg7.toFixed(4)),
// //     avg30: Number(avg30.toFixed(4)),
// //     peak: Number(peak.toFixed(4)),
// //     last5Scores,
// //     riskVelocity: Number(riskVelocity.toFixed(4)),
// //   };
// // };

// // /* ============================= */
// // /*      MAIN ML PROCESSOR        */
// // /* ============================= */

// // const processMLResult = async ({
// //   transactionId,
// //   score,
// //   riskLevel,
// //   methodUsed,
// //   confidence,
// //   aiScore,
// //   shapExplanation = {},
// //   suspiciousPaths = [],
// // }) => {
// //   try {
// //     /* ============================= */
// //     /* 1️⃣ Fetch Transaction         */
// //     /* ============================= */

// //     const transaction = await Transaction.findById(transactionId);

// //     if (!transaction) {
// //       throw new Error("Transaction not found");
// //     }

// //     /* ============================= */
// //     /* 2️⃣ Prevent Double Processing */
// //     /* ============================= */

// //     if (transaction.mlProcessed) {
// //       return {
// //         transaction,
// //         alert: null,
// //         message: "ML already processed",
// //       };
// //     }

// //     /* ============================= */
// //     /* 3️⃣ Resolve Final Values      */
// //     /* ============================= */

// //     const finalScore = score ?? aiScore;
// //     const finalRiskLevel = riskLevel ?? null;
// //     const finalMethod = methodUsed ?? "tabular_only";
// //     const finalConfidence = confidence ?? null;

// //     /* ============================= */
// //     /* 4️⃣ Update Transaction        */
// //     /* ============================= */

// //     transaction.aiScore = aiScore ?? finalScore;
// //     transaction.mlProcessed = true;
// //     transaction.mlResponseAt = new Date();
// //     transaction.processingStage = "ml_completed";

// //     transaction.applyFraudScore(
// //       Number(finalScore.toFixed(4)),
// //       finalConfidence,
// //       finalMethod,
// //       finalRiskLevel
// //     );

// //     /* ============================= */
// //     /* 5️⃣ Store Explainability      */
// //     /* ============================= */

// //     if (shapExplanation && typeof shapExplanation === "object") {
// //       transaction.explanation.shapValues = Object.entries(
// //         shapExplanation
// //       ).map(([feature, value]) => ({
// //         feature,
// //         value,
// //       }));
// //     }

// //     transaction.explanation.suspiciousPaths = (suspiciousPaths || []).map((p) =>
// //       typeof p === "string"
// //         ? { path: [p], description: p, pathScore: 0 }
// //         : p   // already correct shape
// //     );


// //     /* ============================= */
// //     /* 6️⃣ SAVE SCORE HISTORY 🔥     */
// //     /* ============================= */
// //     await transaction.save();

// //     await ScoreHistory.create({
// //       accountId: transaction.senderId,
// //       transactionId: transaction._id,
// //       score: transaction.fraudScore,
// //       methodUsed: transaction.scoringMethod,
// //       confidenceScore: transaction.confidence,
// //     });

// //     /* ============================= */
// //     /* 7️⃣ COMPUTE TEMPORAL STATS 🔥 */
// //     /* ============================= */

// //     const stats = await computeRiskStats(transaction.senderId);

// //     /* ============================= */
// //     /* 8️⃣ UPDATE NEO4J PROFILE 🔥   */
// //     /* ============================= */

// //     await graphService.updateAccountRiskProfile(
// //       transaction.senderId,
// //       stats
// //     );

// //     /* ============================= */
// //     /* 9️⃣ CREATE ALERT              */
// //     /* ============================= */

// //     let alert = null;

// //     if (["high", "critical"].includes(transaction.riskLevel)) {
// //       const existingAlert = await Alert.findOne({
// //         transactionId: transaction._id,
// //       });

// //       if (!existingAlert) {
// //         alert = await Alert.create({
// //           transactionId: transaction._id,
// //           accountId: transaction.senderId,
// //           fraudScore: transaction.fraudScore,
// //           riskLevel: transaction.riskLevel,
// //           status: "open",
// //           explanation: shapExplanation,
// //           suspiciousPaths,
// //           methodUsed: transaction.scoringMethod,
// //           confidence: transaction.confidence,
// //         });

// //         transaction.alertCreated = true;

// //         /* 🔥 STEP 4: ALERT POST-PROCESSING (CASE GROUPING) */
// //         await alertPostProcessingService.processAlert(alert);
// //       }
// //     }

// //     /* ============================= */
// //     /* 🔟 SAVE TRANSACTION           */
// //     /* ============================= */



// //     /* ============================= */
// //     /* 1️⃣1️⃣ RETURN RESULT          */
// //     /* ============================= */

// //     return {
// //       transaction,
// //       alert,
// //       stats,
// //     };
// //   } catch (error) {
// //     console.error("❌ ML Service Error:", error);
// //     throw error;
// //   }
// // };

// // export default {
// //   processMLResult,
// // };

// // backend/src/services/ml.service.js

// import Transaction from "../models/Transaction.js";
// import Alert from "../models/Alert.js";
// import ScoreHistory from "../models/ScoreHistory.js";
// import graphService from "./graph.service.js";
// import alertPostProcessingService from "./alertPostProcessing.service.js";

// /* ============================= */
// /*   HELPER: COMPUTE STATS       */
// /* ============================= */

// const computeRiskStats = async (accountId) => {
//   const now = new Date();

//   const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
//   const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

//   const history7d = await ScoreHistory.find({
//     accountId,
//     timestamp: { $gte: last7Days },
//   });

//   const history30d = await ScoreHistory.find({
//     accountId,
//     timestamp: { $gte: last30Days },
//   });

//   const last5 = await ScoreHistory.find({ accountId })
//     .sort({ timestamp: -1 })
//     .limit(5);

//   const avg7 =
//     history7d.length > 0
//       ? history7d.reduce((sum, x) => sum + x.score, 0) / history7d.length
//       : 0;

//   const avg30 =
//     history30d.length > 0
//       ? history30d.reduce((sum, x) => sum + x.score, 0) / history30d.length
//       : 0;

//   const peak =
//     history30d.length > 0
//       ? Math.max(...history30d.map((x) => x.score))
//       : 0;

//   const last5Scores = last5.map((x) => x.score);

//   const riskVelocity = avg7 - avg30;

//   return {
//     avg7: Number(avg7.toFixed(4)),
//     avg30: Number(avg30.toFixed(4)),
//     peak: Number(peak.toFixed(4)),
//     last5Scores,
//     riskVelocity: Number(riskVelocity.toFixed(4)),
//   };
// };

// /* ============================= */
// /*      MAIN ML PROCESSOR        */
// /* ============================= */

// const processMLResult = async ({
//   transactionId,
//   score,
//   riskLevel,
//   methodUsed,
//   confidence,
//   aiScore,
//   shapExplanation = {},
//   suspiciousPaths = [],
// }) => {
//   try {
//     /* ============================= */
//     /* 1️⃣ Fetch Transaction         */
//     /* ============================= */

//     const transaction = await Transaction.findById(transactionId);

//     if (!transaction) {
//       throw new Error("Transaction not found");
//     }

//     /* ============================= */
//     /* 2️⃣ Prevent Double Processing */
//     /* ============================= */

//     if (transaction.mlProcessed) {
//       return {
//         transaction,
//         alert: null,
//         message: "ML already processed",
//       };
//     }

//     /* ============================= */
//     /* 3️⃣ Resolve Final Values      */
//     /* ============================= */

//     const finalScore = score ?? aiScore;
//     const finalRiskLevel = riskLevel ?? null;
//     const finalMethod = methodUsed ?? "tabular_only";
//     const finalConfidence = confidence ?? null;

//     /* ============================= */
//     /* 4️⃣ Update Transaction        */
//     /* ============================= */

//     transaction.aiScore = aiScore ?? finalScore;
//     transaction.mlProcessed = true;
//     transaction.mlResponseAt = new Date();
//     transaction.processingStage = "ml_completed";

//     transaction.applyFraudScore(
//       Number(finalScore.toFixed(4)),
//       finalConfidence,
//       finalMethod,
//       finalRiskLevel
//     );

//     /* ============================= */
//     /* 5️⃣ Store Explainability      */
//     /* ============================= */

//     if (shapExplanation && typeof shapExplanation === "object") {
//       transaction.explanation.shapValues = Object.entries(
//         shapExplanation
//       ).map(([feature, value]) => ({
//         feature,
//         value,
//       }));
//     }

//     transaction.explanation.suspiciousPaths = (suspiciousPaths || []).map((p) =>
//       typeof p === "string"
//         ? { path: [p], description: p, pathScore: 0 }
//         : p
//     );

//     /* ============================= */
//     /* 6️⃣ SAVE TRANSACTION 🔥       */
//     /* ============================= */

//     await transaction.save();

//     /* ============================= */
//     /* 7️⃣ SAVE SCORE HISTORY 🔥     */
//     /* ============================= */

//     await ScoreHistory.create({
//       accountId: transaction.senderId,
//       transactionId: transaction._id,
//       score: transaction.fraudScore,
//       methodUsed: transaction.scoringMethod,
//       confidenceScore: transaction.confidence,
//     });

//     /* ============================= */
//     /* 8️⃣ COMPUTE TEMPORAL STATS 🔥 */
//     /* ============================= */

//     const stats = await computeRiskStats(transaction.senderId);

//     /* ============================= */
//     /* 9️⃣ UPDATE NEO4J PROFILE 🔥   */
//     /* ============================= */

//     await graphService.updateAccountRiskProfile(
//       transaction.senderId,
//       stats
//     );

//     /* ============================= */
//     /* 🔟 CREATE ALERT              */
//     /* ============================= */

//     let alert = null;

//     if (["high", "critical"].includes(transaction.riskLevel)) {
//       const existingAlert = await Alert.findOne({
//         transactionId: transaction._id,
//       });

//       if (!existingAlert) {
//         alert = await Alert.create({
//           transactionId: transaction._id,
//           accountId: transaction.senderId,
//           fraudScore: transaction.fraudScore,
//           riskLevel: transaction.riskLevel,
//           status: "open",
//           explanation: shapExplanation,
//           suspiciousPaths,
//           methodUsed: transaction.scoringMethod,
//           confidence: transaction.confidence,
//         });

//         /* 🔥 FIX: persist alertCreated properly */
//         await Transaction.findByIdAndUpdate(
//           transaction._id,
//           { alertCreated: true },
//           { new: true }
//         );

//         /* 🔥 CASE GROUPING */
//         await alertPostProcessingService.processAlert(alert);
//       }
//     }

//     /* ============================= */
//     /* 1️⃣1️⃣ RETURN RESULT          */
//     /* ============================= */

//     return {
//       transaction,
//       alert,
//       stats,
//     };
//   } catch (error) {
//     console.error("❌ ML Service Error:", error);
//     throw error;
//   }
// };

// export default {
//   processMLResult,
// };

import Transaction from "../models/Transaction.js";
import Alert from "../models/Alert.js";
import ScoreHistory from "../models/ScoreHistory.js";
import graphService from "./graph.service.js";
import alertPostProcessingService from "./alertPostProcessing.service.js";

/* ============================= */
/*   HELPER: COMPUTE STATS       */
/* ============================= */

const computeRiskStats = async (accountId) => {
  const now = new Date();

  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const history7d = await ScoreHistory.find({
    accountId,
    timestamp: { $gte: last7Days },
  });

  const history30d = await ScoreHistory.find({
    accountId,
    timestamp: { $gte: last30Days },
  });

  const last5 = await ScoreHistory.find({ accountId })
    .sort({ timestamp: -1 })
    .limit(5);

  const avg7 =
    history7d.length > 0
      ? history7d.reduce((sum, x) => sum + x.score, 0) /
      history7d.length
      : 0;

  const avg30 =
    history30d.length > 0
      ? history30d.reduce((sum, x) => sum + x.score, 0) /
      history30d.length
      : 0;

  const peak =
    history30d.length > 0
      ? Math.max(...history30d.map((x) => x.score))
      : 0;

  const last5Scores = last5.map((x) => x.score);

  const riskVelocity = avg7 - avg30;

  return {
    avg7: Number(avg7.toFixed(4)),
    avg30: Number(avg30.toFixed(4)),
    peak: Number(peak.toFixed(4)),
    last5Scores,
    riskVelocity: Number(riskVelocity.toFixed(4)),
  };
};

/* ============================= */
/*      MAIN ML PROCESSOR        */
/* ============================= */

const processMLResult = async ({
  transactionId,
  score,
  riskLevel,
  methodUsed,
  confidence,
  aiScore,
  shapExplanation = {},
  suspiciousPaths = [],
}) => {
  try {
    /* ============================= */
    /* 1️⃣ Fetch Transaction         */
    /* ============================= */

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    /* ============================= */
    /* 2️⃣ Prevent Double Processing */
    /* ============================= */

    if (transaction.mlProcessed) {
      return {
        transaction,
        alert: null,
        message: "ML already processed",
      };
    }

    /* ============================= */
    /* 3️⃣ Resolve Final Values      */
    /* ============================= */

    const finalScore = score ?? aiScore;
    const finalRiskLevel = riskLevel ?? null;
    const finalMethod = methodUsed ?? "tabular_only";
    const finalConfidence = confidence ?? null;

    /* ============================= */
    /* 4️⃣ Update Transaction        */
    /* ============================= */

    transaction.aiScore = aiScore ?? finalScore;
    transaction.mlProcessed = true;
    transaction.mlResponseAt = new Date();
    transaction.processingStage = "ml_completed";

    transaction.applyFraudScore(
      Number(finalScore.toFixed(4)),
      finalConfidence,
      finalMethod,
      finalRiskLevel
    );

    /* ============================= */
    /* 5️⃣ GOLDEN RECORD 🔥          */
    /* ============================= */

    if (transaction.entityResolution?.goldenId) {
      transaction.goldenId = transaction.entityResolution.goldenId;
    }

    /* ============================= */
    /* 6️⃣ Store Explainability      */
    /* ============================= */

    if (shapExplanation && typeof shapExplanation === "object") {
      transaction.explanation.shapValues = Object.entries(
        shapExplanation
      ).map(([feature, value]) => ({
        feature,
        value,
      }));
    }

    transaction.explanation.suspiciousPaths = (suspiciousPaths || []).map(
      (p) =>
        typeof p === "string"
          ? { path: [p], description: p, pathScore: 0 }
          : p
    );

    /* ============================= */
    /* 7️⃣ SAVE TRANSACTION 🔥       */
    /* ============================= */

    await transaction.save();

    /* ============================= */
    /* 8️⃣ SAVE SCORE HISTORY 🔥     */
    /* ============================= */

    await ScoreHistory.create({
      accountId: transaction.senderId,
      transactionId: transaction._id,
      score: transaction.fraudScore,
      methodUsed: transaction.scoringMethod,
      confidenceScore: transaction.confidence,
    });

    /* ============================= */
    /* 9️⃣ COMPUTE TEMPORAL STATS 🔥 */
    /* ============================= */

    const stats = await computeRiskStats(transaction.senderId);

    /* ============================= */
    /* 🔟 UPDATE NEO4J PROFILE 🔥   */
    /* ============================= */

    await graphService.updateAccountRiskProfile(
      transaction.senderId,
      stats
    );

    /* ============================= */
    /* 1️⃣1️⃣ CREATE ALERT           */
    /* ============================= */

    let alert = null;

    if (["high", "critical"].includes(transaction.riskLevel)) {
      const existingAlert = await Alert.findOne({
        transactionId: transaction._id,
      });

      if (!existingAlert) {
        alert = await Alert.create({
          transactionId: transaction._id,
          accountId: transaction.senderId,
          fraudScore: transaction.fraudScore,
          riskLevel: transaction.riskLevel,
          status: "open",
          explanation: shapExplanation,
          suspiciousPaths,
          methodUsed: transaction.scoringMethod,
          confidence: transaction.confidence,
        });

        /* ✅ FIX: Save flag directly (no extra query needed) */
        transaction.alertCreated = true;
        await transaction.save();

        /* 🔥 CASE GROUPING */
        await alertPostProcessingService.processAlert(alert);
      }
    }

    /* ============================= */
    /* 1️⃣2️⃣ RETURN RESULT          */
    /* ============================= */

    return {
      transaction,
      alert,
      stats,
    };
  } catch (error) {
    console.error("❌ ML Service Error:", error);
    throw error;
  }
};

export default {
  processMLResult,
};