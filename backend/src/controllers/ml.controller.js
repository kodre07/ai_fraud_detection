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


import mlService from "../services/ml.service.js";

/**
 * Handle ML scoring callback
 * Called by Python Analytics Engine
 */
const handleMLResult = async (req, res, next) => {
  try {
    const {
      transactionId,
      aiScore,
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

    if (typeof aiScore !== "number" || aiScore < 0 || aiScore > 1) {
      return res.status(400).json({
        success: false,
        message: "aiScore must be a number between 0 and 1",
      });
    }

    /* ============================= */
    /* 2️⃣ Process ML Result          */
    /* ============================= */

    const result = await mlService.processMLResult({
      transactionId,
      aiScore,
      shapExplanation,
      suspiciousPaths,
    });

    /* ============================= */
    /* 3️⃣ REAL-TIME EMISSION 🔥      */
    /* ============================= */

    const io = req.app.get("io");

    // ✅ Emit ML result (always)
    io.emit("ml_processed", {
      transactionId: result.transaction._id,
      fraudScore: result.transaction.fraudScore,
      riskLevel: result.transaction.riskLevel,
    });

    // ✅ If fraud detected → send alert event
    if (result.alert) {
      io.emit("fraud_alert", result.alert);
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