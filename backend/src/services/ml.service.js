// import Transaction from "../models/Transaction.js";
// import Alert from "../models/Alert.js";

// const processMLResult = async ({
//   transactionId,
//   aiScore,
//   shapExplanation,
//   suspiciousPaths,
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
//     /* 2️⃣ Prevent Double Processing  */
//     /* ============================= */

//     if (transaction.mlProcessed) {
//       return {
//         transaction,
//         alert: null,
//         message: "ML already processed",
//       };
//     }

//     /* ============================= */
//     /* 3️⃣ Update AI Score            */
//     /* ============================= */

//     transaction.aiScore = aiScore;
//     transaction.mlProcessed = true;
//     transaction.mlResponseAt = new Date();
//     transaction.processingStage = "ml_completed";

//     /* ============================= */
//     /* 4️⃣ Compute Final Fraud Score  */
//     /* ============================= */

//     const fraudScore =
//       transaction.ruleScore * 0.3 + aiScore * 0.7;

//     transaction.fraudScore = Number(fraudScore.toFixed(4));

//     /* ============================= */
//     /* 5️⃣ Determine Risk Level       */
//     /* ============================= */

//     if (fraudScore >= 0.7) {
//       transaction.riskLevel = "high";
//     } else if (fraudScore >= 0.4) {
//       transaction.riskLevel = "medium";
//     } else {
//       transaction.riskLevel = "low";
//     }

//     await transaction.save();

//     /* ============================= */
//     /* 6️⃣ Create Alert (If Needed)   */
//     /* ============================= */

//     let alert = null;

//     if (
//       transaction.riskLevel === "high" &&
//       !transaction.alertCreated
//     ) {
//       try {
//         alert = await Alert.create({
//           transactionId: transaction._id,
//           accountId: transaction.senderId,
//           fraudScore: transaction.fraudScore,
//           riskLevel: transaction.riskLevel,
//           explanation: shapExplanation || {},
//           suspiciousPaths: suspiciousPaths || [],
//         });

//         transaction.alertCreated = true;
//         await transaction.save();
//       } catch (error) {
//         // In case unique index prevents duplicate
//         if (error.code === 11000) {
//           console.log("⚠️ Alert already exists for transaction");
//         } else {
//           throw error;
//         }
//       }
//     }

//     return {
//       transaction,
//       alert,
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

const processMLResult = async ({
  transactionId,
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
    /* 2️⃣ Prevent Double Processing  */
    /* ============================= */

    if (transaction.mlProcessed) {
      return {
        transaction,
        alert: null,
        message: "ML already processed",
      };
    }

    /* ============================= */
    /* 3️⃣ Update AI Score            */
    /* ============================= */

    transaction.aiScore = aiScore;
    transaction.mlProcessed = true;
    transaction.mlResponseAt = new Date();
    transaction.processingStage = "ml_completed";

    /* ============================= */
    /* 4️⃣ Compute Final Fraud Score  */
    /* ============================= */

    const fraudScore =
      transaction.ruleScore * 0.3 + aiScore * 0.7;

    transaction.fraudScore = Number(fraudScore.toFixed(4));

    /* ============================= */
    /* 5️⃣ Determine Risk Level       */
    /* ============================= */

    if (fraudScore >= 0.7) {
      transaction.riskLevel = "high";
    } else if (fraudScore >= 0.4) {
      transaction.riskLevel = "medium";
    } else {
      transaction.riskLevel = "low";
    }

    await transaction.save();

    /* ============================= */
    /* 6️⃣ Create Alert (High Risk)   */
    /* ============================= */

    let alert = null;

    if (transaction.riskLevel === "high") {
      const existingAlert = await Alert.findOne({
        transactionId: transaction._id,
      });

      if (!existingAlert) {
        alert = await Alert.create({
          transactionId: transaction._id,
          accountId: transaction.senderId,
          fraudScore: transaction.fraudScore,
          status: "open",
          explanation: shapExplanation,
          suspiciousPaths,
        });

        transaction.alertCreated = true;
        await transaction.save();
      }
    }

    return {
      transaction,
      alert,
    };
  } catch (error) {
    console.error("❌ ML Service Error:", error);
    throw error;
  }
};

export default {
  processMLResult,
};