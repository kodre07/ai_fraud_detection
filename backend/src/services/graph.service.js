
// import { getNeo4jDriver } from "../config/neo4j.js";

// /* ============================= */
// /* 1️⃣ CREATE TRANSACTION GRAPH  */
// /* ============================= */

// const createTransactionGraph = async (transaction) => {
//   const driver = getNeo4jDriver();
//   const session = driver.session();

//   try {
//     /* ============================= */
//     /* 🔥 30-DAY FILTER (IMPORTANT)  */
//     /* ============================= */

//     const now = Date.now();
//     const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

//     const txTime = new Date(
//       transaction.timestamp ?? new Date()
//     ).getTime();

//     if (now - txTime > THIRTY_DAYS) {
//       console.log("⏳ Skipping old transaction (>30 days)");
//       return;
//     }

//     /* ============================= */
//     /* GRAPH CREATION QUERY          */
//     /* ============================= */

//     const query = `
//       MERGE (s:Account {id: $senderId})
//       MERGE (r:Account {id: $receiverId})
//       MERGE (t:Transaction {id: $transactionId})

//       SET t.amount = $amount,
//           t.timestamp = $timestamp

//       MERGE (s)-[:SENT]->(r)
//       MERGE (s)-[:MADE]->(t)
//       MERGE (t)-[:TO]->(r)
//     `;

//     await session.run(query, {
//       senderId: transaction.senderId,
//       receiverId: transaction.receiverId,
//       transactionId: transaction._id.toString(),
//       amount: transaction.amount,
//       timestamp:
//         transaction.timestamp?.toISOString() ??
//         new Date().toISOString(),
//     });

//     /* ============================= */
//     /* OPTIONAL NODES (SAFE CHECK)   */
//     /* ============================= */

//     if (transaction.deviceId) {
//       await session.run(
//         `
//         MERGE (s:Account {id: $senderId})
//         MERGE (d:Device {id: $deviceId})
//         MERGE (s)-[:USES_DEVICE]->(d)
//         `,
//         {
//           senderId: transaction.senderId,
//           deviceId: transaction.deviceId,
//         }
//       );
//     }

//     if (transaction.ipAddress) {
//       await session.run(
//         `
//         MERGE (s:Account {id: $senderId})
//         MERGE (ip:IP {address: $ipAddress})
//         MERGE (s)-[:USES_IP]->(ip)
//         `,
//         {
//           senderId: transaction.senderId,
//           ipAddress: transaction.ipAddress,
//         }
//       );
//     }

//     console.log("🧠 Neo4j transaction graph updated");
//   } catch (error) {
//     console.error("❌ Neo4j error:", error);
//     throw error;
//   } finally {
//     await session.close();
//   }
// };

// /* ============================= */
// /* 2️⃣ UPDATE ACCOUNT RISK PROFILE */
// /* ============================= */

// const updateAccountRiskProfile = async (accountId, stats) => {
//   const driver = getNeo4jDriver();
//   const session = driver.session();

//   try {
//     const query = `
//       MERGE (a:Account {id: $accountId})
//       SET 
//         a.avg_score_7d = $avg7,
//         a.avg_score_30d = $avg30,
//         a.peak_score = $peak,
//         a.risk_velocity = $riskVelocity,
//         a.last_5_scores = $last5Scores
//     `;

//     await session.run(query, {
//       accountId,
//       avg7: stats.avg7,
//       avg30: stats.avg30,
//       peak: stats.peak,
//       riskVelocity: stats.riskVelocity,
//       last5Scores: stats.last5Scores,
//     });

//     console.log("📊 Neo4j risk profile updated");
//   } catch (error) {
//     console.error("❌ Neo4j profile update error:", error);
//     // ❗ Do not throw (ML should not break)
//   } finally {
//     await session.close();
//   }
// };

// /* ============================= */
// /* 3️⃣ ENTITY RELATIONSHIPS       */
// /* ============================= */

// const updateEntityRelationships = async (transaction) => {
//   const driver = getNeo4jDriver();
//   const session = driver.session();

//   try {
//     const { senderId, entityResolution } = transaction;

//     if (!entityResolution?.links?.length) return;

//     for (const link of entityResolution.links) {
//       const {
//         type,
//         linkedAccountId,
//         confidence,
//         linkValue,
//       } = link;

//       let query = "";

//       if (type === "SHARED_DEVICE") {
//         query = `
//           MERGE (a:Account {id: $senderId})
//           MERGE (b:Account {id: $linkedAccountId})
//           MERGE (d:Device {id: $linkValue})

//           MERGE (a)-[r:SHARED_DEVICE]->(d)
//           SET r.confidence = $confidence

//           MERGE (b)-[:USES_DEVICE]->(d)
//         `;
//       } else if (type === "SHARED_IP") {
//         query = `
//           MERGE (a:Account {id: $senderId})
//           MERGE (b:Account {id: $linkedAccountId})
//           MERGE (ip:IP {address: $linkValue})

//           MERGE (a)-[r:SHARED_IP]->(ip)
//           SET r.confidence = $confidence

//           MERGE (b)-[:USES_IP]->(ip)
//         `;
//       } else if (type === "SHARED_EMAIL") {
//         query = `
//           MERGE (a:Account {id: $senderId})
//           MERGE (b:Account {id: $linkedAccountId})
//           MERGE (e:Email {value: $linkValue})

//           MERGE (a)-[r:SHARED_EMAIL]->(e)
//           SET r.confidence = $confidence

//           MERGE (b)-[:USES_EMAIL]->(e)
//         `;
//       } else if (type === "SHARED_PHONE") {
//         query = `
//           MERGE (a:Account {id: $senderId})
//           MERGE (b:Account {id: $linkedAccountId})
//           MERGE (p:Phone {number: $linkValue})

//           MERGE (a)-[r:SHARED_PHONE]->(p)
//           SET r.confidence = $confidence

//           MERGE (b)-[:USES_PHONE]->(p)
//         `;
//       }

//       if (query) {
//         await session.run(query, {
//           senderId,
//           linkedAccountId,
//           confidence,
//           linkValue,
//         });
//       }
//     }

//     console.log("🔗 Entity relationships updated");
//   } catch (error) {
//     console.error("❌ Entity resolution graph error:", error);
//   } finally {
//     await session.close();
//   }
// };

// /* ============================= */
// /* EXPORTS */
// /* ============================= */

// export default {
//   createTransactionGraph,
//   updateAccountRiskProfile,
//   updateEntityRelationships,
// };

import { getNeo4jDriver } from "../config/neo4j.js";

/* ============================= */
/* 1️⃣ CREATE TRANSACTION GRAPH  */
/* ============================= */

const createTransactionGraph = async (transaction) => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    /* ============================= */
    /* 🔥 30-DAY FILTER              */
    /* ============================= */

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const txTime = new Date(
      transaction.timestamp ?? new Date()
    ).getTime();

    if (now - txTime > THIRTY_DAYS) {
      console.log("⏳ Skipping old transaction (>30 days)");
      return;
    }

    /* ============================= */
    /* MAIN GRAPH QUERY              */
    /* ============================= */

    const query = `
      MERGE (s:Account {id: $senderId})
      MERGE (r:Account {id: $receiverId})
      MERGE (t:Transaction {id: $transactionId})

      SET t.amount = $amount,
          t.timestamp = $timestamp

      MERGE (s)-[:SENT]->(r)
      MERGE (s)-[:MADE]->(t)
      MERGE (t)-[:TO]->(r)
    `;

    await session.run(query, {
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      transactionId: transaction._id.toString(),
      amount: transaction.amount,
      timestamp:
        transaction.timestamp?.toISOString() ??
        new Date().toISOString(),
    });

    /* ============================= */
    /* OPTIONAL RELATIONSHIPS        */
    /* ============================= */

    if (transaction.deviceId) {
      await session.run(
        `
        MERGE (s:Account {id: $senderId})
        MERGE (d:Device {id: $deviceId})
        MERGE (s)-[:USES_DEVICE]->(d)
        `,
        {
          senderId: transaction.senderId,
          deviceId: transaction.deviceId,
        }
      );
    }

    if (transaction.ipAddress) {
      await session.run(
        `
        MERGE (s:Account {id: $senderId})
        MERGE (ip:IP {address: $ipAddress})
        MERGE (s)-[:USES_IP]->(ip)
        `,
        {
          senderId: transaction.senderId,
          ipAddress: transaction.ipAddress,
        }
      );
    }

    /* ============================= */
    /* 🔥 GOLDEN RECORD (NEW)        */
    /* ============================= */

    if (transaction.goldenId) {
      await session.run(
        `
        MERGE (g:GoldenEntity {id: $goldenId})
        MERGE (a:Account {id: $accountId})
        MERGE (a)-[:BELONGS_TO]->(g)
        `,
        {
          goldenId: transaction.goldenId,
          accountId: transaction.senderId,
        }
      );
    }

    console.log("🧠 Neo4j transaction graph updated");
  } catch (error) {
    console.error("❌ Neo4j error:", error);
    throw error;
  } finally {
    await session.close();
  }
};

/* ============================= */
/* 2️⃣ UPDATE ACCOUNT RISK PROFILE */
/* ============================= */

const updateAccountRiskProfile = async (accountId, stats) => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `
      MERGE (a:Account {id: $accountId})
      SET 
        a.avg_score_7d = $avg7,
        a.avg_score_30d = $avg30,
        a.peak_score = $peak,
        a.risk_velocity = $riskVelocity,
        a.last_5_scores = $last5Scores
    `;

    await session.run(query, {
      accountId,
      avg7: stats.avg7,
      avg30: stats.avg30,
      peak: stats.peak,
      riskVelocity: stats.riskVelocity,
      last5Scores: stats.last5Scores,
    });

    console.log("📊 Neo4j risk profile updated");
  } catch (error) {
    console.error("❌ Neo4j profile update error:", error);
  } finally {
    await session.close();
  }
};

/* ============================= */
/* 3️⃣ ENTITY RELATIONSHIPS       */
/* ============================= */

const updateEntityRelationships = async (transaction) => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { senderId, entityResolution } = transaction;

    if (!entityResolution?.links?.length) return;

    for (const link of entityResolution.links) {
      const {
        type,
        linkedAccountId,
        confidence,
        linkValue,
      } = link;

      let query = "";

      if (type === "SHARED_DEVICE") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (d:Device {id: $linkValue})

          MERGE (a)-[r:SHARED_DEVICE]->(d)
          SET r.confidence = $confidence

          MERGE (b)-[:USES_DEVICE]->(d)
        `;
      }

      else if (type === "SHARED_IP") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (ip:IP {address: $linkValue})

          MERGE (a)-[r:SHARED_IP]->(ip)
          SET r.confidence = $confidence

          MERGE (b)-[:USES_IP]->(ip)
        `;
      }

      else if (type === "SHARED_EMAIL") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (e:Email {value: $linkValue})

          MERGE (a)-[r:SHARED_EMAIL]->(e)
          SET r.confidence = $confidence

          MERGE (b)-[:USES_EMAIL]->(e)
        `;
      }

      else if (type === "SHARED_PHONE") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (p:Phone {number: $linkValue})

          MERGE (a)-[r:SHARED_PHONE]->(p)
          SET r.confidence = $confidence

          MERGE (b)-[:USES_PHONE]->(p)
        `;
      }

      if (query) {
        await session.run(query, {
          senderId,
          linkedAccountId,
          confidence,
          linkValue,
        });
      }
    }

    console.log("🔗 Entity relationships updated");
  } catch (error) {
    console.error("❌ Entity resolution graph error:", error);
  } finally {
    await session.close();
  }
};

/* ============================= */
/* EXPORTS */
/* ============================= */

export default {
  createTransactionGraph,
  updateAccountRiskProfile,
  updateEntityRelationships,
};