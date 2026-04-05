// import Transaction from "../models/Transaction.js";

// /**
//  * Detect shared device/IP usage
//  * This exposes synthetic identity rings
//  */
// const resolve = async (transaction) => {
//      console.log("🧠 Entity Resolution Triggered");

//   try {
//     const { senderId, deviceId, ipAddress } = transaction;

//     /* ============================= */
//     /* 1️⃣ Shared Device Detection   */
//     /* ============================= */

//     const deviceLinkedAccounts = await Transaction.find({
//       deviceId,
//       senderId: { $ne: senderId },
//     }).distinct("senderId");

//     if (deviceLinkedAccounts.length > 0) {
//       console.log(
//         `⚠️ Shared Device Detected for ${senderId}:`,
//         deviceLinkedAccounts
//       );
//     }

//     /* ============================= */
//     /* 2️⃣ Shared IP Detection       */
//     /* ============================= */

//     const ipLinkedAccounts = await Transaction.find({
//       ipAddress,
//       senderId: { $ne: senderId },
//     }).distinct("senderId");

//     if (ipLinkedAccounts.length > 0) {
//       console.log(
//         `⚠️ Shared IP Detected for ${senderId}:`,
//         ipLinkedAccounts
//       );
//     }

//     return true;
//   } catch (error) {
//     console.error("❌ Entity resolution error:", error);
//     throw error;
//   }
// };

// export default {
//   resolve,
// };


// import Transaction from "../models/Transaction.js";

// /**
//  * Detect shared device/IP usage
//  * Returns structured result for rule-based fraud scoring
//  */
// const resolve = async (transaction) => {
//   console.log("🧠 Entity Resolution Triggered");

//   try {
//     const { senderId, deviceId, ipAddress } = transaction;

//     let ruleScore = 0;

//     /* ============================= */
//     /* 1️⃣ Shared Device Detection   */
//     /* ============================= */

//     const deviceLinkedAccounts = await Transaction.find({
//       deviceId,
//       senderId: { $ne: senderId },
//     }).distinct("senderId");

//     if (deviceLinkedAccounts.length > 0) {
//       console.log(
//         `⚠️ Shared Device Detected for ${senderId}:`,
//         deviceLinkedAccounts
//       );

//       ruleScore += 0.4;
//     }

//     /* ============================= */
//     /* 2️⃣ Shared IP Detection       */
//     /* ============================= */

//     const ipLinkedAccounts = await Transaction.find({
//       ipAddress,
//       senderId: { $ne: senderId },
//     }).distinct("senderId");

//     if (ipLinkedAccounts.length > 0) {
//       console.log(
//         `⚠️ Shared IP Detected for ${senderId}:`,
//         ipLinkedAccounts
//       );

//       ruleScore += 0.4;
//     }

//     /* ============================= */
//     /* 3️⃣ Normalize Score           */
//     /* ============================= */

//     if (ruleScore > 1) ruleScore = 1;

//     /* ============================= */
//     /* 4️⃣ Final Response            */
//     /* ============================= */

//     return {
//       ruleScore,
//       deviceLinkedAccounts,
//       ipLinkedAccounts,
//     };
//   } catch (error) {
//     console.error("❌ Entity resolution error:", error);
//     throw error;
//   }
// };

// export default {
//   resolve,
// };

import Transaction from "../models/Transaction.js";

/**
 * Entity Resolution Service
 * Detect shared device/IP usage + return structured links
 */
const resolve = async (transaction) => {
  console.log("🧠 Entity Resolution Triggered");

  try {
    const { senderId, deviceId, ipAddress } = transaction;

    let ruleScore = 0;
    let links = [];

    /* ============================= */
    /* 1️⃣ Shared Device Detection   */
    /* ============================= */

    const deviceLinkedAccounts = await Transaction.find({
      deviceId,
      senderId: { $ne: senderId },
    }).distinct("senderId");

    if (deviceLinkedAccounts.length > 0) {
      ruleScore += 0.4;

      deviceLinkedAccounts.forEach((acc) => {
        links.push({
          type: "SHARED_DEVICE",
          linkedAccountId: acc,
          confidence: Math.min(0.9, 0.3 + deviceLinkedAccounts.length * 0.1),
          linkValue: deviceId,
        });
      });
    }

    /* ============================= */
    /* 2️⃣ Shared IP Detection       */
    /* ============================= */

    const ipLinkedAccounts = await Transaction.find({
      ipAddress,
      senderId: { $ne: senderId },
    }).distinct("senderId");

    if (ipLinkedAccounts.length > 0) {
      ruleScore += 0.4;

      ipLinkedAccounts.forEach((acc) => {
        links.push({
          type: "SHARED_IP",
          linkedAccountId: acc,
          confidence: Math.min(0.8, 0.2 + ipLinkedAccounts.length * 0.1),
          linkValue: ipAddress,
        });
      });
    }
    if (transaction.email) {
      const emailLinkedAccounts = await Transaction.find({
        email: transaction.email,
        senderId: { $ne: senderId },
      }).distinct("senderId");
      if (emailLinkedAccounts.length > 0) {
        ruleScore = Math.min(1, ruleScore + 0.3);
        emailLinkedAccounts.forEach((acc) => {
          links.push({
            type: "SHARED_EMAIL",
            linkedAccountId: acc,
            confidence: Math.min(0.95, 0.5 + emailLinkedAccounts.length * 0.1),
            linkValue: transaction.email,
          });
        });
      }
    }

    if (ruleScore > 1) ruleScore = 1;

    return {
      ruleScore,
      links, // 🔥 IMPORTANT
    };
  } catch (error) {
    console.error("❌ Entity resolution error:", error);
    throw error;
  }
};

export default {
  resolve,
};