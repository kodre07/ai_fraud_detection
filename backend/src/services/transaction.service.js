// // // import Transaction from "../models/Transaction.js";
// // // import entityResolutionService from "./entityResolution.service.js";
// // // import graphService from "./graph.service.js";
// // // import redisQueueService from "./redisQueue.service.js";

// // // /**
// // //  * Process a new transaction end-to-end
// // //  * Pipeline:
// // //  * 1. Save to MongoDB
// // //  * 2. Run Entity Resolution
// // //  * 3. Update Neo4j Graph
// // //  * 4. Push to Redis queue for ML scoring
// // //  */
// // // const processTransaction = async (data) => {
// // //   try {
// // //     /* ============================= */
// // //     /* 1️⃣ SAVE TRANSACTION (Mongo)  */
// // //     /* ============================= */

// // //     const transaction = await Transaction.create({
// // //       senderId: data.senderId,
// // //       receiverId: data.receiverId,
// // //       amount: data.amount,
// // //       deviceId: data.deviceId,
// // //       ipAddress: data.ipAddress,
// // //       timestamp: data.timestamp || new Date(),
// // //       fraudScore: 0,
// // //       riskLevel: "low",
// // //       isFraud: false,
// // //       status: "pending",
// // //       mlProcessed: false,
// // //     });

// // //     /* ============================= */
// // //     /* 2️⃣ ENTITY RESOLUTION         */
// // //     /* ============================= */

// // //     await entityResolutionService.resolve(transaction);

// // //     /* ============================= */
// // //     /* 3️⃣ UPDATE GRAPH (Neo4j)      */
// // //     /* ============================= */

// // //     await graphService.createTransactionGraph(transaction);

// // //     /* ============================= */
// // //     /* 4️⃣ PUSH TO REDIS QUEUE       */
// // //     /* ============================= */

// // //     await redisQueueService.enqueueFraudCheck(transaction._id);

// // //     return transaction;

// // //   } catch (error) {
// // //     console.error("❌ Transaction processing failed:", error);
// // //     throw error; // Let controller handle response
// // //   }
// // // };

// // // export default {
// // //   processTransaction,
// // // };

// // // import Transaction from "../models/Transaction.js";
// // // import entityResolutionService from "./entityResolution.service.js";
// // // import graphService from "./graph.service.js";
// // // import redisQueueService from "./redisQueue.service.js";

// // // /**
// // //  * Process a new transaction end-to-end
// // //  * Pipeline:
// // //  * 1. Save to MongoDB
// // //  * 2. Run Entity Resolution
// // //  * 3. Update Neo4j Graph
// // //  * 4. Push to Redis queue for ML scoring
// // //  */
// // // const processTransaction = async (data) => {
// // //   try {
// // //     /* ============================= */
// // //     /* 1️⃣ SAVE TRANSACTION (Mongo)  */
// // //     /* ============================= */

// // //     const transaction = await Transaction.create({
// // //       senderId: data.senderId,
// // //       receiverId: data.receiverId,
// // //       amount: data.amount,
// // //       deviceId: data.deviceId,
// // //       ipAddress: data.ipAddress,
// // //       timestamp: data.timestamp || new Date(),

// // //       // ✅ Initial scoring state
// // //       fraudScore: 0,
// // //       riskLevel: "low",
// // //       isFraud: false,

// // //       // ✅ Pipeline tracking
// // //       processingStage: "ingested",
// // //       mlProcessed: false,
// // //       mlRequestedAt: new Date(),

// // //       // ✅ Scores
// // //       ruleScore: 0,
// // //       aiScore: 0,
// // //     });

// // //     console.log("💾 Transaction saved:", transaction._id);

// // //     /* ============================= */
// // //     /* 2️⃣ ENTITY RESOLUTION         */
// // //     /* ============================= */

// // //     const resolution = await entityResolutionService.resolve(transaction);

// // //     const ruleScore = resolution?.ruleScore ?? 0;

// // //     transaction.ruleScore = ruleScore;

// // //     // ✅ Update stage
// // //     transaction.processingStage = "rule_scored";

// // //     // ✅ Temporary risk classification
// // //     if (ruleScore >= 0.5) {
// // //       transaction.riskLevel = "medium";
// // //     }

// // //     await transaction.save();

// // //     console.log("📊 Rule score updated:", ruleScore);

// // //     /* ============================= */
// // //     /* 3️⃣ UPDATE GRAPH (Neo4j)      */
// // //     /* ============================= */

// // //     await graphService.createTransactionGraph(transaction);

// // //     console.log("🔗 Graph updated");

// // //     /* ============================= */
// // //     /* 4️⃣ PUSH TO REDIS QUEUE       */
// // //     /* ============================= */

// // //     await redisQueueService.enqueueFraudCheck(transaction._id);

// // //     // ✅ Update stage
// // //     transaction.processingStage = "ml_pending";

// // //     await transaction.save();

// // //     console.log("📩 Transaction pushed to ML queue");

// // //     return transaction;

// // //   } catch (error) {
// // //     console.error("❌ Transaction processing failed:", error);
// // //     throw error;
// // //   }
// // // };

// // // export default {
// // //   processTransaction,
// // // };

// // import Transaction from "../models/Transaction.js";
// // import entityResolutionService from "./entityResolution.service.js";
// // import graphService from "./graph.service.js";
// // import redisQueueService from "./redisQueue.service.js";

// // const processTransaction = async (data) => {
// //   let transaction;

// //   try {
// //     /* 1️⃣ SAVE */
// //     transaction = await Transaction.create({
// //       senderId: data.senderId,
// //       receiverId: data.receiverId,
// //       amount: data.amount,
// //       deviceId: data.deviceId,
// //       ipAddress: data.ipAddress,
// //       timestamp: data.timestamp || new Date(),
// //     });

// //     /* 2️⃣ ENTITY RESOLUTION */
// //     const resolution = await entityResolutionService.resolve(transaction);

// //     const ruleScore = resolution?.ruleScore ?? 0;
// //     const links = resolution?.links ?? [];

// //     transaction.ruleScore = ruleScore;

// //     transaction.entityResolution = {
// //       links,
// //       maxLinkConfidence:
// //         links.length > 0
// //           ? Math.max(...links.map((l) => l.confidence))
// //           : 0,
// //       linkedAccountCount: links.length,
// //       resolvedAt: new Date(),
// //     };

// //     transaction.processingStage = "entity_resolved";

// //     if (ruleScore >= 0.5) {
// //       transaction.riskLevel = "medium";
// //     }

// //     await transaction.save();

// //     /* 3️⃣ GRAPH (safe) */
// //     try {
// //       await graphService.createTransactionGraph(transaction);
// //       await graphService.updateEntityRelationships(transaction);
// //     } catch (err) {
// //       console.error("Graph error:", err.message);
// //     }

// //     /* 4️⃣ QUEUE */
// //     const job = await redisQueueService.enqueueFraudCheck(transaction._id);

// //     transaction.jobId = job?.id || null;
// //     transaction.processingStage = "ml_pending";
// //     transaction.mlRequestedAt = new Date();

// //     await transaction.save();

// //     return transaction;
// //   } catch (error) {
// //     console.error("❌ Transaction processing failed:", error);

// //     if (transaction) {
// //       transaction.recordRetry(error.message);
// //       await transaction.save();
// //     }

// //     throw error;
// //   }
// // };
// // export default {
// //   processTransaction,
// // };

// import Transaction from "../models/Transaction.js";
// import entityResolutionService from "./entityResolution.service.js";
// import graphService from "./graph.service.js";
// import redisQueueService from "./redisQueue.service.js";

// /* ============================= */
// /* 🔥 GET TRANSACTIONS BY ACCOUNT */
// /* ============================= */

// const getTransactionsByAccount = async (accountId) => {
//   try {
//     const transactions = await Transaction.find({
//       senderId: accountId,
//     })
//       .sort({ createdAt: -1 })
//       .limit(50); // safe for demo

//     return transactions;
//   } catch (error) {
//     console.error("❌ Fetch transactions error:", error);
//     throw error;
//   }
// };

// /* ============================= */
// /* 🔥 MAIN TRANSACTION PIPELINE  */
// /* ============================= */

// const processTransaction = async (data) => {
//   let transaction;

//   try {
//     /* ============================= */
//     /* 1️⃣ NORMALIZE INPUT 🔥        */
//     /* ============================= */

//     const normalizedData = {
//       ...data,
//       email: data.email?.toLowerCase(),
//       ipAddress: data.ipAddress?.trim(),
//     };

//     /* ============================= */
//     /* 2️⃣ SAVE TRANSACTION          */
//     /* ============================= */

//     transaction = await Transaction.create({
//       senderId: normalizedData.senderId,
//       receiverId: normalizedData.receiverId,
//       amount: normalizedData.amount,
//       deviceId: normalizedData.deviceId,
//       ipAddress: normalizedData.ipAddress,
//       email: normalizedData.email,
//       phone: normalizedData.phone,
//       timestamp: normalizedData.timestamp || new Date(),
//     });

//     /* ============================= */
//     /* 3️⃣ ENTITY RESOLUTION 🔥      */
//     /* ============================= */

//     const resolution =
//       await entityResolutionService.resolve(transaction);

//     const ruleScore = resolution?.ruleScore ?? 0;
//     const links = resolution?.links ?? [];
//     const goldenId = resolution?.goldenId ?? null;

//     transaction.ruleScore = ruleScore;

//     transaction.entityResolution = {
//       ruleScore,
//       goldenId,
//       links,
//       maxLinkConfidence:
//         links.length > 0
//           ? Math.max(...links.map((l) => l.confidence))
//           : 0,
//       linkedAccountCount: links.length,
//       resolvedAt: new Date(),
//     };

//     /* 🔥 Persist Golden ID */
//     if (goldenId) {
//       transaction.goldenId = goldenId;
//     }

//     transaction.processingStage = "entity_resolved";

//     /* ============================= */
//     /* 4️⃣ RULE-BASED RISK           */
//     /* ============================= */

//     if (ruleScore >= 0.5) {
//       transaction.riskLevel = "medium";
//     }

//     await transaction.save();

//     /* ============================= */
//     /* 5️⃣ GRAPH UPDATE (SAFE)       */
//     /* ============================= */

//     try {
//       await graphService.createTransactionGraph(transaction);
//       await graphService.updateEntityRelationships(transaction);
//     } catch (err) {
//       console.error("⚠️ Graph error:", err.message);
//     }

//     /* ============================= */
//     /* 6️⃣ QUEUE FOR ML 🔥           */
//     /* ============================= */

//     const job =
//       await redisQueueService.enqueueFraudCheck(
//         transaction._id
//       );

//     transaction.jobId = job?.id || null;
//     transaction.processingStage = "ml_pending";
//     transaction.mlRequestedAt = new Date();

//     await transaction.save();

//     /* ============================= */
//     /* 7️⃣ RETURN                   */
//     /* ============================= */

//     return transaction;

//   } catch (error) {
//     console.error("❌ Transaction processing failed:", error);

//     if (transaction) {
//       transaction.recordRetry(error.message);
//       await transaction.save();
//     }

//     throw error;
//   }
// };

// /* ============================= */
// /* EXPORTS */
// /* ============================= */

// export default {
//   processTransaction,
//   getTransactionsByAccount, // ✅ IMPORTANT
// };

import Transaction from "../models/Transaction.js";
import entityResolutionService from "./entityResolution.service.js";
import graphService from "./graph.service.js";
import redisQueueService from "./redisQueue.service.js";

/* ============================= */
/* 🔥 GET TRANSACTIONS BY ACCOUNT */
/* ============================= */

const getTransactionsByAccount = async (accountId) => {
  try {
    const transactions = await Transaction.find({
      senderId: accountId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return transactions;
  } catch (error) {
    console.error("❌ Fetch transactions error:", error);
    throw error;
  }
};

/* ============================= */
/* 🔥 MAIN TRANSACTION PIPELINE  */
/* ============================= */

const processTransaction = async (data) => {
  let transaction;

  try {
    /* ============================= */
    /* 1️⃣ NORMALIZE INPUT 🔥        */
    /* ============================= */

    const normalizedData = {
      ...data,
      // existing normalizations
      email: data.email?.toLowerCase().trim() ?? null,
      ipAddress: data.ipAddress?.trim() ?? null,
      phone: data.phone?.toString().trim() ?? null,

      // enrichment fields — coerce types so a test script sending "true"/1 still works
      isVpn: data.isVpn === true || data.isVpn === "true" || false,
      isProxy: data.isProxy === true || data.isProxy === "true" || false,
      ipCountry: data.ipCountry ? String(data.ipCountry).trim().toUpperCase() : null,
      accountCountry: data.accountCountry ? String(data.accountCountry).trim().toUpperCase() : null,

      // optional metadata
      currency: data.currency ?? null,
      merchantCategory: data.merchantCategory ?? null,
      userAgent: data.userAgent ?? null,
    };

    /* ============================= */
    /* 2️⃣ SAVE TRANSACTION          */
    /* ============================= */

    transaction = await Transaction.create({
      senderId: normalizedData.senderId,
      receiverId: normalizedData.receiverId,
      amount: normalizedData.amount,
      deviceId: normalizedData.deviceId,
      ipAddress: normalizedData.ipAddress,
      email: normalizedData.email,
      phone: normalizedData.phone,

      // ✅ Enrichment fields — now persisted so the AI scorer can use them
      isVpn: normalizedData.isVpn,
      isProxy: normalizedData.isProxy,
      ipCountry: normalizedData.ipCountry,
      accountCountry: normalizedData.accountCountry,

      // optional metadata
      currency: normalizedData.currency,
      merchantCategory: normalizedData.merchantCategory,
      userAgent: normalizedData.userAgent,

      timestamp: normalizedData.timestamp || new Date(),
    });

    /* ============================= */
    /* 3️⃣ ENTITY RESOLUTION 🔥      */
    /* ============================= */

    const resolution =
      await entityResolutionService.resolve(transaction);

    const ruleScore = resolution?.ruleScore ?? 0;
    const links = Array.isArray(resolution?.links)
      ? resolution.links
      : [];
    const goldenId = resolution?.goldenId ?? null;

    transaction.ruleScore = ruleScore;

    transaction.entityResolution = {
      ruleScore,
      // goldenId lives at the top level — NOT inside entityResolution anymore
      links,
      maxLinkConfidence:
        links.length > 0
          ? Math.max(...links.map((l) => l.confidence))
          : 0,
      linkedAccountCount: links.length,
      resolvedAt: new Date(),
    };

    /* 🔥 Persist Golden ID */
    if (goldenId) {
      transaction.goldenId = goldenId;
    }

    transaction.processingStage = "entity_resolved";

    /* ============================= */
    /* 4️⃣ BEHAVIORAL FEATURES       */
    /* ============================= */
    /* Compute lightweight behavioral signals from existing transaction history.
     * All queries are optional — any failure is swallowed so the pipeline continues. */

    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const sevenDayAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const senderId = transaction.senderId;

      // Count of prior transactions for this sender in the last 1h / 24h
      const [count1h, count24h] = await Promise.all([
        Transaction.countDocuments({ senderId, timestamp: { $gte: oneHourAgo }, _id: { $ne: transaction._id } }),
        Transaction.countDocuments({ senderId, timestamp: { $gte: oneDayAgo }, _id: { $ne: transaction._id } }),
      ]);

      // 7-day average amount for this sender
      const recent7d = await Transaction.find(
        { senderId, timestamp: { $gte: sevenDayAgo }, _id: { $ne: transaction._id } },
        { amount: 1 }
      ).limit(100).lean();

      const avg7d = recent7d.length > 0
        ? recent7d.reduce((s, t) => s + t.amount, 0) / recent7d.length
        : 0;

      const deviation = avg7d > 0
        ? Math.abs(transaction.amount - avg7d) / avg7d
        : 0;

      // First transaction ever for this sender?
      const priorCount = await Transaction.countDocuments({
        senderId,
        _id: { $ne: transaction._id },
      });

      // New device? (this device never seen before for this sender)
      const deviceSeen = transaction.deviceId
        ? await Transaction.exists({
          senderId,
          deviceId: transaction.deviceId,
          _id: { $ne: transaction._id },
        })
        : null;

      // New IP?
      const ipSeen = transaction.ipAddress
        ? await Transaction.exists({
          senderId,
          ipAddress: transaction.ipAddress,
          _id: { $ne: transaction._id },
        })
        : null;

      transaction.isFirstTransaction = priorCount === 0;
      transaction.isNewDevice = !deviceSeen;
      transaction.isNewIp = !ipSeen;
      transaction.transactionCount1h = count1h;
      transaction.transactionCount24h = count24h;
      transaction.avgAmount7d = Number(avg7d.toFixed(4));
      transaction.amountDeviation = Number(deviation.toFixed(4));
    } catch (behavioralErr) {
      console.warn("⚠️ Behavioral feature computation skipped:", behavioralErr.message);
    }

    /* ============================= */
    /* 5️⃣ RULE-BASED RISK           */
    /* ============================= */

    if (ruleScore >= 0.5) {
      transaction.riskLevel = "medium";
    }

    await transaction.save();

    /* ============================= */
    /* 5️⃣ GRAPH UPDATE (SAFE)       */
    /* ============================= */

    try {
      await graphService.createTransactionGraph(transaction);
      await graphService.updateEntityRelationships(transaction);
    } catch (err) {
      console.error("⚠️ Graph error:", err.message);
    }

    /* ============================= */
    /* 6️⃣ QUEUE FOR ML 🔥           */
    /* ============================= */

    let job = null;

    try {
      job = await redisQueueService.enqueueFraudCheck(
        transaction._id
      );
    } catch (err) {
      console.error("⚠️ Queue error:", err.message);
    }

    transaction.jobId = job?.id || null;
    transaction.processingStage = "ml_pending";
    transaction.mlRequestedAt = new Date();

    await transaction.save();

    /* ============================= */
    /* 7️⃣ RETURN                   */
    /* ============================= */

    return transaction;

  } catch (error) {
    console.error("❌ Transaction processing failed:", error);

    if (transaction) {
      transaction.recordRetry(error.message);
      await transaction.save();
    }

    throw error;
  }
};

/* ============================= */
/* EXPORTS */
/* ============================= */

export default {
  processTransaction,
  getTransactionsByAccount,
};