// import redisClient from "../config/redis.js";

// /**
//  * Push transaction ID to fraud scoring queue
//  */
// const enqueueFraudCheck = async (transactionId) => {
//   try {
//     await redisClient.lPush(
//       "fraud_scoring_queue",
//       transactionId.toString()
//     );

//     console.log(`📩 Transaction ${transactionId} added to ML queue`);
//   } catch (error) {
//     console.error("❌ Redis queue error:", error);
//     throw error;
//   }
// };

// export default {
//   enqueueFraudCheck,
// };

import redisClient from "../config/redis.js";

const QUEUE_NAME = "fraud_scoring_queue";

/**
 * Push transaction to fraud scoring queue
 */
const enqueueFraudCheck = async (transactionId) => {
  try {
    const payload = JSON.stringify({
      transactionId: transactionId.toString(),
      timestamp: Date.now(),
    });

    await redisClient.lPush(QUEUE_NAME, payload);

    console.log(`📩 Transaction ${transactionId} added to ML queue`);
  } catch (error) {
    console.error("❌ Redis queue error:", error);
    throw error;
  }
};

export default {
  enqueueFraudCheck,
};