// import dotenv from "dotenv";
// dotenv.config();

// import redisClient from "../config/redis.js";
// import axios from "axios";

// const QUEUE_NAME = "fraud_scoring_queue";

// /**
//  * Call Python ML API
//  */
// const callMLService = async (jobData) => {
//   try {
//     const { transactionId } = JSON.parse(jobData);

//     console.log(`🤖 Processing ML for transaction: ${transactionId}`);

//     // 🔥 Call Python FastAPI
//     const response = await axios.post(
//       `${process.env.ML_SERVICE_URL}/predict`,
//       {
//         transactionId,
//       }
//     );

//     console.log("✅ ML response received:", response.data);
//   } catch (error) {
//     console.error("❌ ML service error:", error.message);
//   }
// };

// /**
//  * Worker Loop
//  */
// const startWorker = async () => {
//   console.log("🚀 ML Worker started...");

//   while (true) {
//     try {
//       // 🔥 Pop from Redis queue
//       const job = await redisClient.rPop(QUEUE_NAME);

//       if (job) {
//         await callMLService(job);
//       } else {
//         // 💤 Sleep if queue empty
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     } catch (error) {
//       console.error("❌ Worker error:", error);
//     }
//   }
// };

// startWorker();

// import dotenv from "dotenv";
// dotenv.config();

// import redisClient, { connectRedis } from "../config/redis.js";
// import axios from "axios";

// const QUEUE_NAME = "fraud_scoring_queue";

// /* ============================= */
// /*     CALL PYTHON ML SERVICE    */
// /* ============================= */

// const callMLService = async (jobData) => {
//   try {
//     const parsed = JSON.parse(jobData);
//     const { transactionId } = parsed;

//     if (!transactionId) {
//       console.warn("⚠️ Invalid job data:", jobData);
//       return;
//     }

//     console.log(`🤖 Processing ML for transaction: ${transactionId}`);

//     const response = await axios.post(
//       `${process.env.ML_SERVICE_URL}/predict`,
//       {
//         transactionId,
//       }
//     );

//     console.log("✅ ML response received:", response.data);
//   } catch (error) {
//     console.error("❌ ML service error:", error.message);
//   }
// };

// /* ============================= */
// /*        WORKER LOOP            */
// /* ============================= */

// const startWorker = async () => {
//   try {
//     // ✅ VERY IMPORTANT: Connect Redis
//     await connectRedis();

//     console.log("🚀 ML Worker started...");

//     while (true) {
//       try {
//         /* ====================================== */
//         /* 🔥 BLOCKING POP (BEST PRACTICE)        */
//         /* ====================================== */

//         const result = await redisClient.brPop(QUEUE_NAME, 0);
//         // result = { key: QUEUE_NAME, element: jobData }

//         const jobData = result?.element;

//         if (!jobData) continue;

//         await callMLService(jobData);
//       } catch (error) {
//         console.error("❌ Worker loop error:", error);

//         // small delay to prevent crash loop
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }
//   } catch (error) {
//     console.error("❌ Worker startup failed:", error);
//     process.exit(1);
//   }
// };

// /* ============================= */
// /*        START WORKER           */
// /* ============================= */

// startWorker();

import dotenv from "dotenv";
dotenv.config();

/* ===========================================================================================
 * ⚠️  NODE.JS IS A PRODUCER ONLY — THIS FILE NO LONGER RUNS A CONSUMER LOOP
 *
 * Architecture decision (Fix 1 + Fix 2):
 *   - Redis jobs are pushed by: transaction.service.js → redisQueue.service.js
 *   - Redis jobs are consumed by: Python AI service (aiml/worker.py)
 *   - Running a Node.js consumer HERE caused duplicate processing / race conditions
 *
 * The /predict HTTP path is also disabled:
 *   - Python fetches jobs from Redis directly; nothing calls /predict in production
 *   - /predict remains available in Python as a DEBUG-ONLY endpoint
 *
 * Queue constant reference (shared with redisQueue.service.js):
 *   MAIN  : fraud_scoring_queue
 *   RETRY : fraud_scoring_retry_queue
 *   DLQ   : fraud_scoring_dlq
 * =========================================================================================== */

console.log(
  "ℹ️  ml.worker.js loaded — Node.js is producer-only. " +
  "Redis consumption is handled exclusively by the Python AI service."
);