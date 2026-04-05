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
import connectMongo from "../config/mongo.js";
import Transaction from "../models/Transaction.js";

import axios from "axios";
import { connectRedis } from "../config/redis.js";
import queueService from "../services/redisQueue.service.js";

const MAX_RETRIES = 3;

/* ============================= */
/*     CALL PYTHON ML SERVICE    */
/* ============================= */

const callMLService = async (transactionId) => {
  const url = `${process.env.ML_SERVICE_URL}/predict`;

  const response = await axios.post(url, {
    transactionId,
  });

  return response.data;
};

/* ============================= */
/*        PROCESS JOB            */
/* ============================= */

const processJob = async (job) => {
  const { transactionId, attempt } = job;

  try {
    console.log(`🚀 Processing ${transactionId}, attempt ${attempt}`);

    await callMLService(transactionId);

    console.log(`✅ Success: ${transactionId}`);
  } catch (error) {
    console.error(
      `❌ Error processing ${transactionId}:`,
      error.message
    );

    /* ============================= */
    /* 🔁 RETRY LOGIC                */
    /* ============================= */

    if (attempt < MAX_RETRIES) {
      const retryJob = {
        ...job,
        attempt: attempt + 1,
      };

      await queueService.pushToRetryQueue(retryJob);

      console.log(
        `🔁 Retrying ${transactionId}, attempt ${attempt + 1}`
      );
    } else {
      /* ============================= */
      /* 🚨 DEAD LETTER QUEUE          */
      /* ============================= */

      await queueService.pushToDLQ(job);
      await Transaction.findByIdAndUpdate(job.transactionId, {
        inDlq: true,
        processingStage: "failed",
        lastErrorMessage: error.message,
      });

      console.log(`🚨 Sent to DLQ: ${transactionId}`);
    }
  }
};

/* ============================= */
/*        WORKER LOOP            */
/* ============================= */

const startWorker = async () => {
  try {
    // ✅ Connect Redis once
    await connectRedis();
    await connectMongo();

    console.log("🧠 ML Worker started...");

    while (true) {
      try {
        // 🔥 Get job (retry queue has priority)
        const job = await queueService.popJob();

        if (!job) {
          // avoid CPU overuse
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        await processJob(job);
      } catch (error) {
        console.error("❌ Worker loop error:", error);

        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  } catch (error) {
    console.error("❌ Worker startup failed:", error);
    process.exit(1);
  }
};

/* ============================= */
/*        START WORKER           */
/* ============================= */


startWorker();