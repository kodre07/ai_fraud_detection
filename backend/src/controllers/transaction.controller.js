// // import transactionService from "../services/transaction.service.js";

// // const createTransaction = async (req, res, next) => {
// //   try {
// //     const result = await transactionService.processTransaction(req.body);

// //     return res.status(201).json({
// //       success: true,
// //       message: "Transaction processed successfully",
// //       data: result,
// //     });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// // export default {
// //   createTransaction,
// // };
// import transactionService from "../services/transaction.service.js";

// const createTransaction = async (req, res, next) => {
//   try {
//     const result = await transactionService.processTransaction(req.body);

//     return res.status(201).json({
//       success: true,
//       message: "Transaction processed successfully",
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export default {
//   createTransaction,
// };


// import transactionService from "../services/transaction.service.js";

// /* ========================================= */
// /*         CREATE TRANSACTION                */
// /* ========================================= */

// const createTransaction = async (req, res, next) => {
//   try {
//     /* ============================= */
//     /* 1️⃣ Process Transaction        */
//     /* ============================= */

//     const result = await transactionService.processTransaction(req.body);

//     /* ============================= */
//     /* 2️⃣ REAL-TIME EMISSION 🔥      */
//     /* ============================= */

//     const io = req.app.get("io");

//     // ✅ Emit new transaction event
//     io.emit("transaction_created", {
//       transactionId: result.transaction._id,
//       amount: result.transaction.amount,
//       userId: result.transaction.userId,
//       status: result.transaction.status,
//       createdAt: result.transaction.createdAt,
//     });

//     // ✅ Notify frontend that ML processing will happen
//     io.emit("ml_processing_started", {
//       transactionId: result._id,
//     });

//     /* ============================= */
//     /* 3️⃣ Success Response           */
//     /* ============================= */

//     return res.status(201).json({
//       success: true,
//       message: "Transaction processed successfully",
//       data: result,
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// export default {
//   createTransaction,
// };

// import transactionService from "../services/transaction.service.js";

// /* ========================================= */
// /*         CREATE TRANSACTION                */
// /* ========================================= */

// const createTransaction = async (req, res, next) => {
//   try {
//     /* ============================= */
//     /* 1️⃣ Process Transaction        */
//     /* ============================= */

//     const transaction = await transactionService.processTransaction(req.body);

//     /* ============================= */
//     /* 2️⃣ REAL-TIME EMISSION 🔥      */
//     /* ============================= */

//     const io = req.app.get("io");

//     // ✅ Emit new transaction event
//     io.emit("transaction_created", {
//       transactionId: transaction._id,
//       amount: transaction.amount,
//       senderId: transaction.senderId,
//       receiverId: transaction.receiverId,
//       createdAt: transaction.timestamp,

//       // ✅ Correct state tracking
//       processingStage: transaction.processingStage,
//       mlProcessed: transaction.mlProcessed,
//       riskLevel: transaction.riskLevel,
//     });

//     // ✅ Notify frontend ML processing started
//     io.emit("ml_processing_started", {
//       transactionId: transaction._id,
//       processingStage: "ml_pending",
//     });

//     /* ============================= */
//     /* 3️⃣ Success Response           */
//     /* ============================= */

//     return res.status(201).json({
//       success: true,
//       message: "Transaction processed successfully",
//       data: transaction,
//     });

//   } catch (error) {
//     next(error);
//   }
// };

// export default {
//   createTransaction,
// };

import transactionService from "../services/transaction.service.js";

/* ========================================= */
/*         CREATE TRANSACTION                */
/* ========================================= */

const createTransaction = async (req, res, next) => {
  try {
    /* ============================= */
    /* 1️⃣ Process Transaction        */
    /* ============================= */

    const transaction = await transactionService.processTransaction(req.body);

    /* ============================= */
    /* 2️⃣ REAL-TIME EMISSION 🔥      */
    /* ============================= */

    const io = req.app.get("io");

    if (io) {
      // ✅ Emit new transaction event
      io.emit("transaction_created", {
        transactionId: transaction._id,
        amount: transaction.amount,
        senderId: transaction.senderId,
        receiverId: transaction.receiverId,
        timestamp: transaction.timestamp,

        // ✅ Pipeline tracking
        processingStage: transaction.processingStage,
        mlProcessed: transaction.mlProcessed,
        riskLevel: transaction.riskLevel,
      });

      // ✅ Notify ML processing started
      io.emit("ml_processing_started", {
        transactionId: transaction._id,
        processingStage: "ml_pending",
      });
    }

    /* ============================= */
    /* 3️⃣ Success Response           */
    /* ============================= */

    return res.status(201).json({
      success: true,
      message: "Transaction processed successfully",
      data: {
        transactionId: transaction._id,
        senderId: transaction.senderId,
        receiverId: transaction.receiverId,
        amount: transaction.amount,
        processingStage: transaction.processingStage,
        mlProcessed: transaction.mlProcessed,
        riskLevel: transaction.riskLevel,
        timestamp: transaction.timestamp,
      },
    });

  } catch (error) {
    console.error("❌ Transaction Controller Error:", error);
    next(error);
  }
};
const getTransactionsByAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transactions = await transactionService.getTransactionsByAccount(id);

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("❌ Get Transactions Error:", error);
    next(error);
  }
};

export default {
  createTransaction,
  getTransactionsByAccount,
};