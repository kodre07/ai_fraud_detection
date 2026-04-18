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
      email: data.email?.toLowerCase(),
      ipAddress: data.ipAddress?.trim(),
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
      goldenId,
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
    /* 4️⃣ RULE-BASED RISK           */
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