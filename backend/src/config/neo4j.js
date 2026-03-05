import neo4j from "neo4j-driver";
import logger from "./logger.js";

let driver;

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
    logger.info("Neo4j connected");
  } catch (error) {
    logger.error("Neo4j connection failed");
    process.exit(1);
  }
};

export const getNeo4jDriver = () => driver;

export default connectNeo4j;