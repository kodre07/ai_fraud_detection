// import dotenv from "dotenv";
// import app from "./app.js";

// import { connectMongo } from "./config/mongo.js";
// import { connectRedis } from "./config/redis.js";
// import { connectNeo4j } from "./config/neo4j.js";

// dotenv.config();

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     // Connect Databases
//     await connectMongo();
//     await connectRedis();
//     await connectNeo4j();

//     console.log("✅ All databases connected");

//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error("❌ Failed to start server:", error);
//     process.exit(1);
//   }
// };

import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be first

import app from "./app.js";
import logger from "./config/logger.js";
import connectMongo from "./config/mongo.js";
import connectNeo4j from "./config/neo4j.js";
import {connectRedis} from "./config/redis.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectMongo();
    await connectNeo4j();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();