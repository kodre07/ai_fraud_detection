// import neo4jDriver from "../config/neo4j.js";

// /**
//  * Create or update graph structure for transaction
//  */
// const createTransactionGraph = async (transaction) => {
//   const session = neo4jDriver.session();

//   try {
//     const query = `
//       MERGE (s:Account {id: $senderId})
//       MERGE (r:Account {id: $receiverId})
//       MERGE (t:Transaction {id: $transactionId})

//       MERGE (s)-[:SENT {
//         amount: $amount,
//         timestamp: $timestamp
//       }]->(r)

//       MERGE (s)-[:MADE]->(t)
//       MERGE (t)-[:TO]->(r)

//       MERGE (d:Device {id: $deviceId})
//       MERGE (ip:IP {address: $ipAddress})

//       MERGE (s)-[:USES_DEVICE]->(d)
//       MERGE (s)-[:USES_IP]->(ip)
//     `;

//     await session.run(query, {
//       senderId: transaction.senderId,
//       receiverId: transaction.receiverId,
//       transactionId: transaction._id.toString(),
//       amount: transaction.amount,
//       timestamp: transaction.timestamp.toISOString(),
//       deviceId: transaction.deviceId,
//       ipAddress: transaction.ipAddress,
//     });

//     console.log("🧠 Neo4j graph updated");
//   } catch (error) {
//     console.error("❌ Neo4j error:", error);
//     throw error;
//   } finally {
//     await session.close();
//   }
// };

// export default {
//   createTransactionGraph,
// };

// import { getNeo4jDriver } from "../config/neo4j.js";

// const createTransactionGraph = async (transaction) => {
//   const driver = getNeo4jDriver();
//   const session = driver.session();

//   try {
//     const query = `
//       MERGE (s:Account {id: $senderId})
//       MERGE (r:Account {id: $receiverId})
//       MERGE (t:Transaction {id: $transactionId})

//       MERGE (s)-[:SENT {
//         amount: $amount,
//         timestamp: $timestamp
//       }]->(r)

//       MERGE (s)-[:MADE]->(t)
//       MERGE (t)-[:TO]->(r)

//       MERGE (d:Device {id: $deviceId})
//       MERGE (ip:IP {address: $ipAddress})

//       MERGE (s)-[:USES_DEVICE]->(d)
//       MERGE (s)-[:USES_IP]->(ip)
//     `;

//     await session.run(query, {
//       senderId: transaction.senderId,
//       receiverId: transaction.receiverId,
//       transactionId: transaction._id.toString(),
//       amount: transaction.amount,
//       timestamp: transaction.timestamp.toISOString(),
//       deviceId: transaction.deviceId,
//       ipAddress: transaction.ipAddress,
//     });

//     console.log("🧠 Neo4j graph updated");
//   } catch (error) {
//     console.error("❌ Neo4j error:", error);
//     throw error;
//   } finally {
//     await session.close();
//   }
// };

// export default {
//   createTransactionGraph,
// };

// import { getNeo4jDriver } from "../config/neo4j.js";

// /* ============================= */
// /* 1️⃣ CREATE TRANSACTION GRAPH  */
// /* ============================= */

// const createTransactionGraph = async (transaction) => {
//   const driver = getNeo4jDriver();
//   const session = driver.session();

//   try {
//     const query = `
//       MERGE (s:Account {id: $senderId})
//       MERGE (r:Account {id: $receiverId})
//       MERGE (t:Transaction {id: $transactionId})

//       MERGE (s)-[:SENT {
//         amount: $amount,
//         timestamp: $timestamp
//       }]->(r)

//       MERGE (s)-[:MADE]->(t)
//       MERGE (t)-[:TO]->(r)

//       MERGE (d:Device {id: $deviceId})
//       MERGE (ip:IP {address: $ipAddress})

//       MERGE (s)-[:USES_DEVICE]->(d)
//       MERGE (s)-[:USES_IP]->(ip)
//     `;

//     await session.run(query, {
//       senderId: transaction.senderId,
//       receiverId: transaction.receiverId,
//       transactionId: transaction._id.toString(),
//       amount: transaction.amount,
//       timestamp: transaction.timestamp.toISOString(),
//       deviceId: transaction.deviceId,
//       ipAddress: transaction.ipAddress,
//     });

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
//     console.error(" Neo4j profile update error:", error);
//     // ❗ DO NOT throw → avoid breaking ML pipeline
//   } finally {
//     await session.close();
//   }
// };

// export default {
//   createTransactionGraph,
//   updateAccountRiskProfile,
// };

import { getNeo4jDriver } from "../config/neo4j.js";

/* ============================= */
/* 1️⃣ CREATE TRANSACTION GRAPH  */
/* ============================= */

const createTransactionGraph = async (transaction) => {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = `
      MERGE (s:Account {id: $senderId})
      MERGE (r:Account {id: $receiverId})
      MERGE (t:Transaction {id: $transactionId})

      MERGE (s)-[:SENT {
        amount: $amount,
        timestamp: $timestamp
      }]->(r)

      MERGE (s)-[:MADE]->(t)
      MERGE (t)-[:TO]->(r)

      MERGE (d:Device {id: $deviceId})
      MERGE (ip:IP {address: $ipAddress})

      MERGE (s)-[:USES_DEVICE]->(d)
      MERGE (s)-[:USES_IP]->(ip)
    `;

    await session.run(query, {
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      transactionId: transaction._id.toString(),
      amount: transaction.amount,
      timestamp: transaction.timestamp?.toISOString() ?? new Date().toISOString(),   // ✅

      deviceId: transaction.deviceId,
      ipAddress: transaction.ipAddress,
    });

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
    // ❗ Don't throw (ML pipeline should not break)
  } finally {
    await session.close();
  }
};

/* ============================= */
/* 3️⃣ ENTITY RELATIONSHIPS (🔥 NEW) */
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

    console.log("🔗 Entity relationships updated with confidence");
  } catch (error) {
    console.error("❌ Entity resolution graph error:", error);
    // ❗ Don't throw → keep system resilient
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
  updateEntityRelationships, // ✅ NEW
};