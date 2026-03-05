// import Transaction from "../models/Transaction.js";
// import entityResolutionService from "./entityResolution.service.js";
// import graphService from "./graph.service.js";
// import redisQueueService from "./redisQueue.service.js";

// /**
//  * Process a new transaction end-to-end
//  * Pipeline:
//  * 1. Save to MongoDB
//  * 2. Run Entity Resolution
//  * 3. Update Neo4j Graph
//  * 4. Push to Redis queue for ML scoring
//  */
// const processTransaction = async (data) => {
//   try {
//     /* ============================= */
//     /* 1️⃣ SAVE TRANSACTION (Mongo)  */
//     /* ============================= */

//     const transaction = await Transaction.create({
//       senderId: data.senderId,
//       receiverId: data.receiverId,
//       amount: data.amount,
//       deviceId: data.deviceId,
//       ipAddress: data.ipAddress,
//       timestamp: data.timestamp || new Date(),
//       fraudScore: 0,
//       riskLevel: "low",
//       isFraud: false,
//       status: "pending",
//       mlProcessed: false,
//     });

//     /* ============================= */
//     /* 2️⃣ ENTITY RESOLUTION         */
//     /* ============================= */

//     await entityResolutionService.resolve(transaction);

//     /* ============================= */
//     /* 3️⃣ UPDATE GRAPH (Neo4j)      */
//     /* ============================= */

//     await graphService.createTransactionGraph(transaction);

//     /* ============================= */
//     /* 4️⃣ PUSH TO REDIS QUEUE       */
//     /* ============================= */

//     await redisQueueService.enqueueFraudCheck(transaction._id);

//     return transaction;

//   } catch (error) {
//     console.error("❌ Transaction processing failed:", error);
//     throw error; // Let controller handle response
//   }
// };

// export default {
//   processTransaction,
// };

import Transaction from "../models/Transaction.js";
import entityResolutionService from "./entityResolution.service.js";
import graphService from "./graph.service.js";
import redisQueueService from "./redisQueue.service.js";

/**
 * Process a new transaction end-to-end
 * Pipeline:
 * 1. Save to MongoDB
 * 2. Run Entity Resolution
 * 3. Update Neo4j Graph
 * 4. Push to Redis queue for ML scoring
 */
const processTransaction = async (data) => {
  try {
    /* ============================= */
    /* 1️⃣ SAVE TRANSACTION (Mongo)  */
    /* ============================= */

    const transaction = await Transaction.create({
      senderId: data.senderId,
      receiverId: data.receiverId,
      amount: data.amount,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      timestamp: data.timestamp || new Date(),
      fraudScore: 0,
      riskLevel: "low",
      isFraud: false,
      status: "pending",
      mlProcessed: false,
      ruleScore: 0,  // ensure explicitly initialized
      aiScore: 0
    });

    console.log("💾 Transaction saved:", transaction._id);

    /* ============================= */
    /* 2️⃣ ENTITY RESOLUTION         */
    /* ============================= */

    const resolution = await entityResolutionService.resolve(transaction);

    // ✅ Store ruleScore
    transaction.ruleScore = resolution.ruleScore;

    // Temporary risk classification (before AI)
    if (resolution.ruleScore >= 0.5) {
      transaction.riskLevel = "medium";
    }

    await transaction.save();

    console.log("📊 Rule score updated:", resolution.ruleScore);

    /* ============================= */
    /* 3️⃣ UPDATE GRAPH (Neo4j)      */
    /* ============================= */

    await graphService.createTransactionGraph(transaction);

    /* ============================= */
    /* 4️⃣ PUSH TO REDIS QUEUE       */
    /* ============================= */

    await redisQueueService.enqueueFraudCheck(transaction._id);

    console.log("📩 Transaction pushed to ML queue");

    return transaction;

  } catch (error) {
    console.error("❌ Transaction processing failed:", error);
    throw error;
  }
};

export default {
  processTransaction,
};