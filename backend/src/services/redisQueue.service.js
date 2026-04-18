// // import redisClient from "../config/redis.js";

// // /**
// //  * Push transaction ID to fraud scoring queue
// //  */
// // const enqueueFraudCheck = async (transactionId) => {
// //   try {
// //     await redisClient.lPush(
// //       "fraud_scoring_queue",
// //       transactionId.toString()
// //     );

// //     console.log(`📩 Transaction ${transactionId} added to ML queue`);
// //   } catch (error) {
// //     console.error("❌ Redis queue error:", error);
// //     throw error;
// //   }
// // };

// // export default {
// //   enqueueFraudCheck,
// // };

// // import redisClient from "../config/redis.js";

// // const QUEUE_NAME = "fraud_scoring_queue";

// // /**
// //  * Push transaction to fraud scoring queue
// //  */
// // const enqueueFraudCheck = async (transactionId) => {
// //   try {
// //     const payload = JSON.stringify({
// //       transactionId: transactionId.toString(),
// //       timestamp: Date.now(),
// //     });

// //     await redisClient.lPush(QUEUE_NAME, payload);

// //     console.log(`📩 Transaction ${transactionId} added to ML queue`);
// //   } catch (error) {
// //     console.error("❌ Redis queue error:", error);
// //     throw error;
// //   }
// // };

// // export default {
// //   enqueueFraudCheck,
// // };

// import redisClient from "../config/redis.js";

// /* ============================= */
// /*         QUEUE NAMES           */
// /* ============================= */

// const QUEUES = {
//   MAIN: "fraud_scoring_queue",
//   RETRY: "fraud_scoring_retry_queue",
//   DLQ: "fraud_scoring_dlq",
// };

// /* ============================= */
// /*   ENQUEUE MAIN JOB (ENTRY)    */
// /* ============================= */

// /**
//  * Push transaction to fraud scoring queue
//  */
// const enqueueFraudCheck = async (transactionId) => {
//   try {
//     const job = {
//       transactionId: transactionId.toString(),
//       attempt: 0, // 🔥 important for retry logic
//       createdAt: Date.now(),
//     };

//     await redisClient.lPush(
//       QUEUES.MAIN,
//       JSON.stringify(job)
//     );

//     console.log(`📩 Transaction ${transactionId} added to MAIN queue`);
//   } catch (error) {
//     console.error("❌ Redis enqueue error:", error);
//     throw error;
//   }
// };

// /* ============================= */
// /*      RETRY QUEUE PUSH         */
// /* ============================= */

// const pushToRetryQueue = async (job) => {
//   try {
//     await redisClient.lPush(
//       QUEUES.RETRY,
//       JSON.stringify(job)
//     );

//     console.log(`🔁 Job requeued (attempt ${job.attempt})`);
//   } catch (error) {
//     console.error("❌ Retry queue error:", error);
//     throw error;
//   }
// };

// /* ============================= */
// /*      DEAD LETTER QUEUE        */
// /* ============================= */

// const pushToDLQ = async (job) => {
//   try {
//     await redisClient.lPush(
//       QUEUES.DLQ,
//       JSON.stringify(job)
//     );

//     console.log(`🚨 Job moved to DLQ: ${job.transactionId}`);
//   } catch (error) {
//     console.error("❌ DLQ error:", error);
//     throw error;
//   }
// };

// /* ============================= */
// /*       POP JOB (WORKER)        */
// /* ============================= */

// const popJob = async () => {
//   try {
//     // 🔥 Priority: retry queue first
//     let jobData = await redisClient.rPop(QUEUES.RETRY);

//     if (!jobData) {
//       jobData = await redisClient.rPop(QUEUES.MAIN);
//     }

//     if (!jobData) return null;

//     return JSON.parse(jobData);
//   } catch (error) {
//     console.error("❌ Pop job error:", error);
//     return null;
//   }
// };

// /* ============================= */
// /*         EXPORTS               */
// /* ============================= */

// export default {
//   QUEUES,
//   enqueueFraudCheck,
//   pushToRetryQueue,
//   pushToDLQ,
//   popJob,
// };

// backend/src/services/redisQueue.service.js

import redisClient from "../config/redis.js";

/* ============================= */
/*         QUEUE NAMES           */
/* ============================= */

const QUEUES = {
  MAIN: "fraud_scoring_queue",
  RETRY: "fraud_scoring_retry_queue",
  DLQ: "fraud_scoring_dlq",
};

/* ============================= */
/*   GENERATE JOB ID             */
/* ============================= */

const generateJobId = () => {
  return `job_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

/* ============================= */
/*   ENQUEUE MAIN JOB (ENTRY)    */
/* ============================= */

const enqueueFraudCheck = async (transactionId) => {
  try {
    const job = {
      id: generateJobId(), // ✅ NEW
      transactionId: transactionId.toString(),
      attempt: 0,
      createdAt: Date.now(),
    };

    await redisClient.lPush(
      QUEUES.MAIN,
      JSON.stringify(job)
    );

    console.log(`📩 Job ${job.id} added to MAIN queue`);

    return job; // ✅ CRITICAL FIX
  } catch (error) {
    console.error("❌ Redis enqueue error:", error);
    throw error;
  }
};

/* ============================= */
/*      RETRY QUEUE PUSH         */
/* ============================= */

const pushToRetryQueue = async (job) => {
  try {
    job.attempt += 1;
    job.lastRetryAt = Date.now();

    await redisClient.lPush(
      QUEUES.RETRY,
      JSON.stringify(job)
    );

    console.log(`🔁 Job ${job.id} requeued (attempt ${job.attempt})`);
  } catch (error) {
    console.error("❌ Retry queue error:", error);
    throw error;
  }
};

/* ============================= */
/*      DEAD LETTER QUEUE        */
/* ============================= */

const pushToDLQ = async (job) => {
  try {
    job.failedAt = Date.now();

    await redisClient.lPush(
      QUEUES.DLQ,
      JSON.stringify(job)
    );

    console.log(`🚨 Job ${job.id} moved to DLQ`);
  } catch (error) {
    console.error("❌ DLQ error:", error);
    throw error;
  }
};

/* ============================= */
/*       POP JOB (WORKER)        */
/* ============================= */

const popJob = async () => {
  try {
    // Priority: retry queue first
    let jobData = await redisClient.rPop(QUEUES.RETRY);

    if (!jobData) {
      jobData = await redisClient.rPop(QUEUES.MAIN);
    }

    if (!jobData) return null;

    const job = JSON.parse(jobData);

    return job;
  } catch (error) {
    console.error("❌ Pop job error:", error);
    return null;
  }
};

/* ============================= */
/*         EXPORTS               */
/* ============================= */

export default {
  QUEUES,
  enqueueFraudCheck,
  pushToRetryQueue,
  pushToDLQ,
  popJob,
};