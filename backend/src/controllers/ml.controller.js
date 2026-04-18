// import mlService from "../services/ml.service.js";

// /**
//  * Handle ML scoring callback
//  * Called by Python Analytics Engine
//  *
//  * Expected body:
//  * {
//  *   transactionId: String,
//  *   aiScore: Number (0-1),
//  *   shapExplanation: Object (optional),
//  *   suspiciousPaths: Array (optional)
//  * }
//  */
// const handleMLResult = async (req, res, next) => {
//   try {
//     const {
//       transactionId,
//       aiScore,
//       shapExplanation,
//       suspiciousPaths,
//     } = req.body;

//     /* ============================= */
//     /* 1️⃣ Basic Validation           */
//     /* ============================= */

//     if (!transactionId) {
//       return res.status(400).json({
//         success: false,
//         message: "transactionId is required",
//       });
//     }

//     if (typeof aiScore !== "number" || aiScore < 0 || aiScore > 1) {
//       return res.status(400).json({
//         success: false,
//         message: "aiScore must be a number between 0 and 1",
//       });
//     }

//     /* ============================= */
//     /* 2️⃣ Process ML Result          */
//     /* ============================= */

//     const result = await mlService.processMLResult({
//       transactionId,
//       aiScore,
//       shapExplanation,
//       suspiciousPaths,
//     });

//     /* ============================= */
//     /* 3️⃣ Success Response           */
//     /* ============================= */

//     return res.status(200).json({
//       success: true,
//       message: "ML result processed successfully",
//       data: {
//         transactionId: result.transaction._id,
//         fraudScore: result.transaction.fraudScore,
//         riskLevel: result.transaction.riskLevel,
//         alertCreated: !!result.alert,
//       },
//     });
//   } catch (error) {
//     console.error("❌ ML Controller Error:", error);
//     next(error);
//   }
// };

// export default {
//   handleMLResult,
// };


// import mlService from "../services/ml.service.js";

// /**
//  * Handle ML scoring callback
//  * Called by Python Analytics Engine
//  */
// const handleMLResult = async (req, res, next) => {
//   try {
//     const {
//       transactionId,
//       aiScore,
//       shapExplanation,
//       suspiciousPaths,
//     } = req.body;

//     /* ============================= */
//     /* 1️⃣ Basic Validation           */
//     /* ============================= */

//     if (!transactionId) {
//       return res.status(400).json({
//         success: false,
//         message: "transactionId is required",
//       });
//     }

//     if (typeof aiScore !== "number" || aiScore < 0 || aiScore > 1) {
//       return res.status(400).json({
//         success: false,
//         message: "aiScore must be a number between 0 and 1",
//       });
//     }

//     /* ============================= */
//     /* 2️⃣ Process ML Result          */
//     /* ============================= */

//     const result = await mlService.processMLResult({
//       transactionId,
//       aiScore,
//       shapExplanation,
//       suspiciousPaths,
//     });

//     /* ============================= */
//     /* 3️⃣ REAL-TIME EMISSION 🔥      */
//     /* ============================= */

//     const io = req.app.get("io");

//     // ✅ Emit ML result (always)
//     io.emit("ml_processed", {
//       transactionId: result.transaction._id,
//       fraudScore: result.transaction.fraudScore,
//       riskLevel: result.transaction.riskLevel,
//     });

//     // ✅ If fraud detected → send alert event
//     if (result.alert) {
//       io.emit("fraud_alert", result.alert);
//     }

//     /* ============================= */
//     /* 4️⃣ Success Response           */
//     /* ============================= */

//     return res.status(200).json({
//       success: true,
//       message: "ML result processed successfully",
//       data: {
//         transactionId: result.transaction._id,
//         fraudScore: result.transaction.fraudScore,
//         riskLevel: result.transaction.riskLevel,
//         alertCreated: !!result.alert,
//       },
//     });

//   } catch (error) {
//     console.error("❌ ML Controller Error:", error);
//     next(error);
//   }
// };

// export default {
//   handleMLResult,
// };

import mlService from "../services/ml.service.js";

/**
 * Handle ML scoring callback
 * Called by Python Analytics Engine
 */
const handleMLResult = async (req, res, next) => {
  try {
    const {
      transactionId,

      // ✅ New Router Output (PRIMARY)
      score,
      risk_level,
      method_used,
      confidence_score,

      // ✅ Backward compatibility (OLD)
      aiScore,

      // ✅ Explainability
      shapExplanation,
      suspiciousPaths,
    } = req.body;

    /* ============================= */
    /* 1️⃣ Basic Validation           */
    /* ============================= */

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transactionId is required",
      });
    }

    const finalScore = score ?? aiScore;

    if (
      typeof finalScore !== "number" ||
      finalScore < 0 ||
      finalScore > 1
    ) {
      return res.status(400).json({
        success: false,
        message: "score/aiScore must be between 0 and 1",
      });
    }

    /* ============================= */
    /* 2️⃣ Process ML Result          */
    /* ============================= */

    const result = await mlService.processMLResult({
      transactionId,
      score: finalScore,
      riskLevel: risk_level,
      methodUsed: method_used,
      confidence: confidence_score,
      aiScore,
      shapExplanation,
      suspiciousPaths,
    });

    /* ============================= */
    /* 3️⃣ REAL-TIME EVENTS 🔥        */
    /* ============================= */

    const io = req.app.get("io");

    if (io) {
      // ✅ ML processed event
      io.emit("ml_processed", {
        transactionId: result.transaction._id,
        fraudScore: result.transaction.fraudScore,
        riskLevel: result.transaction.riskLevel,
        methodUsed: result.transaction.scoringMethod,
        confidence: result.transaction.confidence,
      });

      // ✅ Alert event
      if (result.alert) {
        io.emit("fraud_alert", {
          alertId: result.alert._id,
          accountId: result.alert.accountId,
          riskLevel: result.alert.riskLevel,
          fraudScore: result.alert.fraudScore,
        });

        // 🔥 NEW: CASE UPDATED EVENT (IMPORTANT)
        io.emit("case_updated", {
          caseId: result.alert.caseId,
          alertId: result.alert._id,
          accountId: result.alert.accountId,
          riskLevel: result.alert.riskLevel,
        });

        console.log("📡 case_updated emitted");
      }
    } else {
      console.warn("⚠️ Socket.io not initialized");
    }

    /* ============================= */
    /* 4️⃣ Success Response           */
    /* ============================= */

    return res.status(200).json({
      success: true,
      message: "ML result processed successfully",
      data: {
        transactionId: result.transaction._id,
        fraudScore: result.transaction.fraudScore,
        riskLevel: result.transaction.riskLevel,
        methodUsed: result.transaction.scoringMethod,
        confidence: result.transaction.confidence,
        alertCreated: !!result.alert,
      },
    });

  } catch (error) {
    console.error("❌ ML Controller Error:", error);
    next(error);
  }
};

export default {
  handleMLResult,
};