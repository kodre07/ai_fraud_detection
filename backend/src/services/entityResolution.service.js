// import Transaction from "../models/Transaction.js";

// /* ============================= */
// /* 🔥 HELPER: GOLDEN ID GENERATOR */
// /* ============================= */

// const generateGoldenId = (transaction, links) => {
//   const identifiers = [
//     transaction.deviceId,
//     transaction.ipAddress,
//     transaction.email?.toLowerCase(),
//     transaction.phone,
//   ]
//     .filter(Boolean)
//     .map((x) => x.toString())
//     .sort();

//   const linkedIds = links
//     .map((l) => l.linkedAccountId?.toString())
//     .filter(Boolean)
//     .sort();

//   const base = [...identifiers, ...linkedIds].join("_");

//   return base || `account_${transaction.senderId}`;
// };

// /**
//  * Entity Resolution Service
//  * Detect shared device/IP/email/phone usage + return structured links
//  */
// const resolve = async (transaction) => {
//   console.log("🧠 Entity Resolution Triggered");

//   try {
//     let {
//       senderId,
//       deviceId,
//       ipAddress,
//       email,
//       phone,
//     } = transaction;

//     // ✅ Normalize (VERY IMPORTANT)
//     if (email) email = email.toLowerCase();
//     if (ipAddress) ipAddress = ipAddress.trim();

//     let ruleScore = 0;
//     let links = [];
//     const seen = new Set();

//     /* ============================= */
//     /* 1️⃣ Shared Device Detection   */
//     /* ============================= */

//     if (deviceId) {
//       const deviceLinkedAccounts = await Transaction.find({
//         deviceId,
//         senderId: { $ne: senderId },
//       })
//         .limit(10)
//         .distinct("senderId");

//       if (deviceLinkedAccounts.length > 0) {
//         ruleScore += 0.4;

//         deviceLinkedAccounts.forEach((acc) => {
//           const key = `DEVICE_${acc}`;
//           if (!seen.has(key) && acc !== senderId) {
//             seen.add(key);

//             links.push({
//               type: "SHARED_DEVICE",
//               linkedAccountId: acc,
//               confidence: Math.min(
//                 0.9,
//                 0.3 + deviceLinkedAccounts.length * 0.1
//               ),
//               linkValue: deviceId,
//             });
//           }
//         });
//       }
//     }

//     /* ============================= */
//     /* 2️⃣ Shared IP Detection       */
//     /* ============================= */

//     if (ipAddress) {
//       const ipLinkedAccounts = await Transaction.find({
//         ipAddress,
//         senderId: { $ne: senderId },
//       })
//         .limit(10)
//         .distinct("senderId");

//       if (ipLinkedAccounts.length > 0) {
//         ruleScore += 0.3;

//         ipLinkedAccounts.forEach((acc) => {
//           const key = `IP_${acc}`;
//           if (!seen.has(key) && acc !== senderId) {
//             seen.add(key);

//             links.push({
//               type: "SHARED_IP",
//               linkedAccountId: acc,
//               confidence: Math.min(
//                 0.8,
//                 0.2 + ipLinkedAccounts.length * 0.1
//               ),
//               linkValue: ipAddress,
//             });
//           }
//         });
//       }
//     }

//     /* ============================= */
//     /* 3️⃣ Shared Email Detection 🔥 */
//     /* ============================= */

//     if (email) {
//       const emailLinkedAccounts = await Transaction.find({
//         email,
//         senderId: { $ne: senderId },
//       })
//         .limit(10)
//         .distinct("senderId");

//       if (emailLinkedAccounts.length > 0) {
//         ruleScore += 0.3;

//         emailLinkedAccounts.forEach((acc) => {
//           const key = `EMAIL_${acc}`;
//           if (!seen.has(key) && acc !== senderId) {
//             seen.add(key);

//             links.push({
//               type: "SHARED_EMAIL",
//               linkedAccountId: acc,
//               confidence: Math.min(
//                 0.85,
//                 0.3 + emailLinkedAccounts.length * 0.1
//               ),
//               linkValue: email,
//             });
//           }
//         });
//       }
//     }

//     /* ============================= */
//     /* 4️⃣ Shared Phone Detection 🔥 */
//     /* ============================= */

//     if (phone) {
//       const phoneLinkedAccounts = await Transaction.find({
//         phone,
//         senderId: { $ne: senderId },
//       })
//         .limit(10)
//         .distinct("senderId");

//       if (phoneLinkedAccounts.length > 0) {
//         ruleScore += 0.3;

//         phoneLinkedAccounts.forEach((acc) => {
//           const key = `PHONE_${acc}`;
//           if (!seen.has(key) && acc !== senderId) {
//             seen.add(key);

//             links.push({
//               type: "SHARED_PHONE",
//               linkedAccountId: acc,
//               confidence: Math.min(
//                 0.85,
//                 0.3 + phoneLinkedAccounts.length * 0.1
//               ),
//               linkValue: phone,
//             });
//           }
//         });
//       }
//     }

//     /* ============================= */
//     /* 🔥 FINAL: NORMALIZE SCORE     */
//     /* ============================= */

//     ruleScore = Math.min(1, Number(ruleScore.toFixed(4)));

//     /* ============================= */
//     /* 🔥 GOLDEN RECORD             */
//     /* ============================= */

//     const goldenId = generateGoldenId(transaction, links);

//     /* ============================= */
//     /* FINAL RETURN                 */
//     /* ============================= */

//     return {
//       ruleScore,
//       links,
//       goldenId, // ✅ NEW (VERY IMPORTANT)
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

/* ============================= */
/* 🔥 HELPER: GOLDEN ID GENERATOR */
/* ============================= */

const generateGoldenId = (transaction, links) => {
  const identifiers = [
    transaction.deviceId,
    transaction.ipAddress,
    transaction.email?.toLowerCase(),
    transaction.phone,
  ]
    .filter(Boolean)
    .map((x) => x.toString().trim())
    .sort();

  const linkedIds = links
    .map((l) => l.linkedAccountId?.toString())
    .filter(Boolean)
    .sort();

  const base = [...identifiers, ...linkedIds].join("_");

  // ✅ Stable fallback
  return base || `account_${transaction.senderId}`;
};

/* ============================= */
/* 🔥 HELPER: FETCH LINKED IDS   */
/* ============================= */

const getLinkedAccounts = async (field, value, senderId) => {
  if (!value) return [];

  return Transaction.find({
    [field]: value,
    senderId: { $ne: senderId },
  })
    .limit(10)
    .distinct("senderId");
};

/**
 * Entity Resolution Service
 */
const resolve = async (transaction) => {
  console.log("🧠 Entity Resolution Triggered");

  try {
    let {
      senderId,
      deviceId,
      ipAddress,
      email,
      phone,
    } = transaction;

    /* ============================= */
    /* 🔥 NORMALIZATION              */
    /* ============================= */

    if (email) email = email.toLowerCase().trim();
    if (ipAddress) ipAddress = ipAddress.trim();
    if (phone) phone = phone.toString().trim();

    let ruleScore = 0;
    let links = [];
    const seen = new Set();

    /* ============================= */
    /* 1️⃣ DEVICE                   */
    /* ============================= */

    const deviceAccounts = await getLinkedAccounts(
      "deviceId",
      deviceId,
      senderId
    );

    if (deviceAccounts.length > 0) {
      ruleScore += 0.4;

      deviceAccounts.forEach((acc) => {
        if (!acc || acc === senderId) return;

        const key = `DEVICE_${acc}`;
        if (seen.has(key)) return;

        seen.add(key);

        links.push({
          type: "SHARED_DEVICE",
          linkedAccountId: acc,
          confidence: Math.min(
            0.9,
            0.3 + deviceAccounts.length * 0.1
          ),
          linkValue: deviceId,
        });
      });
    }

    /* ============================= */
    /* 2️⃣ IP                       */
    /* ============================= */

    const ipAccounts = await getLinkedAccounts(
      "ipAddress",
      ipAddress,
      senderId
    );

    if (ipAccounts.length > 0) {
      ruleScore += 0.3;

      ipAccounts.forEach((acc) => {
        if (!acc || acc === senderId) return;

        const key = `IP_${acc}`;
        if (seen.has(key)) return;

        seen.add(key);

        links.push({
          type: "SHARED_IP",
          linkedAccountId: acc,
          confidence: Math.min(
            0.8,
            0.2 + ipAccounts.length * 0.1
          ),
          linkValue: ipAddress,
        });
      });
    }

    /* ============================= */
    /* 3️⃣ EMAIL                    */
    /* ============================= */

    const emailAccounts = await getLinkedAccounts(
      "email",
      email,
      senderId
    );

    if (emailAccounts.length > 0) {
      ruleScore += 0.3;

      emailAccounts.forEach((acc) => {
        if (!acc || acc === senderId) return;

        const key = `EMAIL_${acc}`;
        if (seen.has(key)) return;

        seen.add(key);

        links.push({
          type: "SHARED_EMAIL",
          linkedAccountId: acc,
          confidence: Math.min(
            0.85,
            0.3 + emailAccounts.length * 0.1
          ),
          linkValue: email,
        });
      });
    }

    /* ============================= */
    /* 4️⃣ PHONE                    */
    /* ============================= */

    const phoneAccounts = await getLinkedAccounts(
      "phone",
      phone,
      senderId
    );

    if (phoneAccounts.length > 0) {
      ruleScore += 0.3;

      phoneAccounts.forEach((acc) => {
        if (!acc || acc === senderId) return;

        const key = `PHONE_${acc}`;
        if (seen.has(key)) return;

        seen.add(key);

        links.push({
          type: "SHARED_PHONE",
          linkedAccountId: acc,
          confidence: Math.min(
            0.85,
            0.3 + phoneAccounts.length * 0.1
          ),
          linkValue: phone,
        });
      });
    }

    /* ============================= */
    /* 🔥 FINAL SCORE               */
    /* ============================= */

    ruleScore = Math.min(1, Number(ruleScore.toFixed(4)));

    /* ============================= */
    /* 🔥 GOLDEN RECORD             */
    /* ============================= */

    const goldenId = generateGoldenId(
      {
        deviceId,
        ipAddress,
        email,
        phone,
        senderId,
      },
      links
    );

    /* ============================= */
    /* FINAL RETURN                 */
    /* ============================= */

    return {
      ruleScore,
      links,
      goldenId,
    };
  } catch (error) {
    console.error("❌ Entity resolution error:", error);
    throw error;
  }
};

export default {
  resolve,
};