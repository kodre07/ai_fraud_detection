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

import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
import transactionService from "../services/transaction.service.js";

/* Alias for clarity inside uploadTransactions */
const createTransactionService = transactionService.processTransaction;

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

/* ========================================= */
/*         UPLOAD TRANSACTIONS (CSV)         */
/* ========================================= */

const uploadTransactions = async (req, res, next) => {
  /* ── 1. Guard: file must exist ─────────────────────────── */
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Use field name \"file\".",
    });
  }

  const filePath = req.file.path;
  console.log(`\n📂 CSV Upload started — file: ${req.file.originalname} (${req.file.size} bytes)`);

  let total = 0;
  let processed = 0;
  let failed = 0;
  const errors = [];

  try {
    /* ── 2. Parse all rows from CSV ────────────────────────── */
    const rows = await new Promise((resolve, reject) => {
      const collected = [];
      createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => collected.push(row))
        .on("end", () => resolve(collected))
        .on("error", (err) => reject(err));
    });

    total = rows.length;
    console.log(`📋 Total rows parsed from CSV: ${total}`);

    /* ── 3. Process each row sequentially ──────────────────── */
    for (const [index, row] of rows.entries()) {
      try {
        /* -- Type conversion (CSV values are all strings) -- */
        // ✅ Support BOTH frontend format (account_id, device_id, ip)
        //    and backend format (senderId, receiverId, ipAddress)
        const senderIdRaw   = row.senderId?.trim()    || row.account_id?.trim() || null;
        const receiverIdRaw = row.receiverId?.trim()   || null;
        const ipRaw         = row.ipAddress?.trim()    || row.ip?.trim()         || null;
        const deviceRaw     = row.deviceId?.trim()     || row.device_id?.trim()  || null;

        // When only account_id is present (frontend CSV) generate a stable receiver
        const generatedReceiverId = receiverIdRaw
          || `RECV_${(senderIdRaw || "unknown").replace(/\W/g, "").slice(0, 8).toUpperCase()}`;

        const transformedRow = {
          senderId:   senderIdRaw,
          receiverId: generatedReceiverId,
          amount:     row.amount ? Number(row.amount) : null,

          /* Optional network / device signals */
          deviceId:  deviceRaw,
          ipAddress: ipRaw,

          /* Boolean coercions */
          isVpn:   row.isVpn  === "true",
          isProxy: row.isProxy === "true",

          /* Geo / country codes */
          ipCountry:      row.ipCountry?.trim().toUpperCase()      || null,
          accountCountry: row.accountCountry?.trim().toUpperCase() || null,

          /* Contact signals */
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,

          /* Optional metadata */
          currency:         row.currency?.trim()         || null,
          merchantCategory: row.merchantCategory?.trim() || null,
          userAgent:        row.userAgent?.trim()        || null,

          /* Timestamp (ISO string → Date, or let service default to now) */
          timestamp: row.timestamp ? new Date(row.timestamp) : undefined,
        };

        /* -- Minimal validation: skip rows missing required fields -- */
        if (!transformedRow.senderId || !transformedRow.receiverId || !transformedRow.amount) {
          throw new Error(
            `Row ${index + 1}: Missing required fields (senderId, receiverId, amount). ` +
            `Got: senderId=${transformedRow.senderId}, receiverId=${transformedRow.receiverId}, amount=${transformedRow.amount}`
          );
        }

        if (isNaN(transformedRow.amount) || transformedRow.amount <= 0) {
          throw new Error(`Row ${index + 1}: Invalid amount "${row.amount}" — must be a positive number.`);
        }

        /* -- Run the FULL pipeline via existing service -- */
        await createTransactionService(transformedRow);

        processed += 1;
        console.log(`  ✅ Row ${index + 1}/${total} processed (sender: ${transformedRow.senderId})`);

      } catch (rowErr) {
        failed += 1;
        const errMsg = rowErr?.message || String(rowErr);
        errors.push({ row: index + 1, error: errMsg });
        console.error(`  ❌ Row ${index + 1}/${total} FAILED: ${errMsg}`);
        /* Continue with the next row — do NOT crash the upload */
      }
    }

    /* ── 4. Final summary log ───────────────────────────────── */
    console.log(`\n📊 Upload complete — total: ${total} | processed: ${processed} | failed: ${failed}\n`);

    return res.status(200).json({
      success: true,
      total,
      processed,
      failed,
      ...(errors.length > 0 && { rowErrors: errors }),
    });

  } catch (err) {
    console.error("❌ CSV Upload fatal error:", err);
    next(err);
  } finally {
    /* ── 5. Always delete the temp file ─────────────────────── */
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Temp file deleted: ${filePath}`);
      }
    } catch (cleanupErr) {
      console.warn("⚠️  Could not delete temp file:", cleanupErr.message);
    }
  }
};

export default {
  createTransaction,
  getTransactionsByAccount,
  uploadTransactions,
};