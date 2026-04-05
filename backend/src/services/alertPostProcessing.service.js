// import Case from "../models/Case.js";

// /* ============================= */
// /*     HELPER: PRIORITY SCORE    */
// /* ============================= */

// const computePriority = (alerts) => {
//   if (!alerts.length) return 0;

//   // average fraud score
//   const avg =
//     alerts.reduce((sum, a) => sum + a.fraudScore, 0) /
//     alerts.length;

//   // boost for high count
//   return Number((avg + alerts.length * 0.05).toFixed(4));
// };

// /* ============================= */
// /*     MAIN PROCESS FUNCTION     */
// /* ============================= */

// const processAlert = async (alert) => {
//   try {
//     const accountId = alert.accountId;

//     /* ============================= */
//     /* 1️⃣ Find existing case        */
//     /* ============================= */

//     let existingCase = await Case.findOne({
//       accountId,
//       status: "open",
//     }).populate("alerts");

//     /* ============================= */
//     /* 2️⃣ Create new case if none   */
//     /* ============================= */

//     if (!existingCase) {
//       const newCase = await Case.create({
//         accountId,
//         alerts: [alert._id],
//         priorityScore: alert.fraudScore,
//         riskLevel: alert.riskLevel,
//       });

//       return newCase;
//     }

//     /* ============================= */
//     /* 3️⃣ Deduplication             */
//     /* ============================= */

//     const alreadyExists = existingCase.alerts.some(
//       (a) => a._id.toString() === alert._id.toString()
//     );

//     if (!alreadyExists) {
//       existingCase.alerts.push(alert);
//     }

//     /* ============================= */
//     /* 4️⃣ Update priority           */
//     /* ============================= */

//     const updatedAlerts = [...existingCase.alerts, alert];

//     existingCase.priorityScore = computePriority(updatedAlerts);

//     /* ============================= */
//     /* 5️⃣ Update risk level         */
//     /* ============================= */

//     const riskLevels = updatedAlerts.map((a) => a.riskLevel);

//     if (riskLevels.includes("critical")) {
//       existingCase.riskLevel = "critical";
//     } else if (riskLevels.includes("high")) {
//       existingCase.riskLevel = "high";
//     }

//     await existingCase.save();

//     return existingCase;
//   } catch (error) {
//     console.error("❌ Alert Post-Processing Error:", error);
//     throw error;
//   }
// };

// export default {
//   processAlert,
// };


import Case from "../models/Case.js";

/* ============================= */
/*     HELPER: PRIORITY SCORE    */
/* ============================= */

const computePriority = (alerts) => {
  if (!alerts.length) return 0;

  const avg =
    alerts.reduce((sum, a) => sum + a.fraudScore, 0) /
    alerts.length;

  return Number((avg + alerts.length * 0.05).toFixed(4));
};

/* ============================= */
/*     MAIN PROCESS FUNCTION     */
/* ============================= */

const processAlert = async (alert) => {
  try {
    const accountId = alert.accountId;

    /* ============================= */
    /* 1️⃣ Find existing case        */
    /* ============================= */

    let existingCase = await Case.findOne({
      accountId,
      status: "open",
    }).populate("alerts");

    /* ============================= */
    /* 2️⃣ Create new case if none   */
    /* ============================= */

    if (!existingCase) {
      const newCase = await Case.create({
        accountId,
        alerts: [alert._id],
        priorityScore: alert.fraudScore,
        riskLevel: alert.riskLevel,
      });

      return newCase;
    }

    /* ============================= */
    /* 3️⃣ Deduplication             */
    /* ============================= */

    const alreadyExists = existingCase.alerts.some(
      (a) => a._id.toString() === alert._id.toString()
    );

    if (!alreadyExists) {
      // ✅ push ONLY ObjectId (correct way)
      existingCase.alerts.push(alert._id);
    }

    /* ============================= */
    /* 4️⃣ Re-fetch populated alerts */
    /* ============================= */

    await existingCase.populate("alerts");

    const updatedAlerts = existingCase.alerts; // ✅ FIXED (no duplication)

    /* ============================= */
    /* 5️⃣ Update priority           */
    /* ============================= */

    existingCase.priorityScore = computePriority(updatedAlerts);

    /* ============================= */
    /* 6️⃣ Update risk level         */
    /* ============================= */

    const riskLevels = updatedAlerts.map((a) => a.riskLevel);

    if (riskLevels.includes("critical")) {
      existingCase.riskLevel = "critical";
    } else if (riskLevels.includes("high")) {
      existingCase.riskLevel = "high";
    } else if (riskLevels.includes("medium")) {
      existingCase.riskLevel = "medium";
    } else {
      existingCase.riskLevel = "low";
    }

    /* ============================= */
    /* 7️⃣ Save case                 */
    /* ============================= */

    await existingCase.save();

    return existingCase;
  } catch (error) {
    console.error("❌ Alert Post-Processing Error:", error);
    throw error;
  }
};

export default {
  processAlert,
};