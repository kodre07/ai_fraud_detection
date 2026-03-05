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
import { getNeo4jDriver } from "../config/neo4j.js";

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
      timestamp: transaction.timestamp.toISOString(),
      deviceId: transaction.deviceId,
      ipAddress: transaction.ipAddress,
    });

    console.log("🧠 Neo4j graph updated");
  } catch (error) {
    console.error("❌ Neo4j error:", error);
    throw error;
  } finally {
    await session.close();
  }
};

export default {
  createTransactionGraph,
};