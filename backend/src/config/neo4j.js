import neo4j from "neo4j-driver";
import logger from "./logger.js";

let driver;
let _connected = false;

const connectNeo4j = async () => {
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(
        process.env.NEO4J_USER,
        process.env.NEO4J_PASSWORD
      )
    );

    await driver.verifyConnectivity();
    _connected = true;
    logger.info("✅ Neo4j connected");
  } catch (error) {
    _connected = false;
    // ⚠️ Non-fatal: backend starts without Neo4j.
    // Graph writes are skipped; Python scorer falls back to rule_based (neighbor_count = -1).
    logger.warn(
      `⚠️  Neo4j unavailable — backend will start without graph support. ` +
      `Reason: ${error.message}`
    );
  }
};

export const getNeo4jDriver = () => driver;

/**
 * Returns true only if Neo4j connected successfully at startup.
 * Use this guard in graph.service.js before running Cypher queries.
 */
export const isNeo4jAvailable = () => _connected;

export default connectNeo4j;