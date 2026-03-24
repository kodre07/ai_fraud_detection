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

      // ✅ Initial scoring state
      fraudScore: 0,
      riskLevel: "low",
      isFraud: false,

      // ✅ Pipeline tracking
      processingStage: "ingested",
      mlProcessed: false,
      mlRequestedAt: new Date(),

      // ✅ Scores
      ruleScore: 0,
      aiScore: 0,
    });

    console.log("💾 Transaction saved:", transaction._id);

    /* ============================= */
    /* 2️⃣ ENTITY RESOLUTION         */
    /* ============================= */

    const resolution = await entityResolutionService.resolve(transaction);

    const ruleScore = resolution?.ruleScore ?? 0;

    transaction.ruleScore = ruleScore;

    // ✅ Update stage
    transaction.processingStage = "rule_scored";

    // ✅ Temporary risk classification
    if (ruleScore >= 0.5) {
      transaction.riskLevel = "medium";
    }

    await transaction.save();

    console.log("📊 Rule score updated:", ruleScore);

    /* ============================= */
    /* 3️⃣ UPDATE GRAPH (Neo4j)      */
    /* ============================= */

    await graphService.createTransactionGraph(transaction);

    console.log("🔗 Graph updated");

    /* ============================= */
    /* 4️⃣ PUSH TO REDIS QUEUE       */
    /* ============================= */

    await redisQueueService.enqueueFraudCheck(transaction._id);

    // ✅ Update stage
    transaction.processingStage = "ml_pending";

    await transaction.save();

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