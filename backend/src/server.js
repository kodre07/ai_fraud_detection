// // // import dotenv from "dotenv";
// // // import app from "./app.js";

// // // import { connectMongo } from "./config/mongo.js";
// // // import { connectRedis } from "./config/redis.js";
// // // import { connectNeo4j } from "./config/neo4j.js";

// // // dotenv.config();

// // // const PORT = process.env.PORT || 5000;

// // // const startServer = async () => {
// // //   try {
// // //     // Connect Databases
// // //     await connectMongo();
// // //     await connectRedis();
// // //     await connectNeo4j();

// // //     console.log("✅ All databases connected");

// // //     app.listen(PORT, () => {
// // //       console.log(`🚀 Server running on port ${PORT}`);
// // //     });
// // //   } catch (error) {
// // //     console.error("❌ Failed to start server:", error);
// // //     process.exit(1);
// // //   }
// // // };

// // // import dotenv from "dotenv";
// // // dotenv.config(); // ✅ MUST be first

// // // import app from "./app.js";
// // // import logger from "./config/logger.js";
// // // import connectMongo from "./config/mongo.js";
// // // import connectNeo4j from "./config/neo4j.js";
// // // import {connectRedis} from "./config/redis.js";

// // // const PORT = process.env.PORT || 5000;

// // // const startServer = async () => {
// // //   try {
// // //     await connectMongo();
// // //     await connectNeo4j();
// // //     await connectRedis();

// // //     app.listen(PORT, () => {
// // //       logger.info(`Server running on port ${PORT}`);
// // //     });
// // //   } catch (error) {
// // //     logger.error("Failed to start server", error);
// // //     process.exit(1);
// // //   }
// // // };

// // // startServer();

// // // import dotenv from "dotenv";
// // // dotenv.config(); // MUST be first

// // // import http from "http";
// // // import { Server } from "socket.io";

// // // import app from "./app.js";
// // // import logger from "./config/logger.js";
// // // import connectMongo from "./config/mongo.js";
// // // import connectNeo4j from "./config/neo4j.js";
// // // import { connectRedis } from "./config/redis.js";

// // // const PORT = process.env.PORT || 5000;

// // // const startServer = async () => {
// // //   try {
// // //     // ✅ Connect Databases
// // //     await connectMongo();
// // //     await connectNeo4j();
// // //     await connectRedis();

// // //     // ✅ Create HTTP server
// // //     const server = http.createServer(app);

// // //     // ✅ Initialize Socket.IO
// // //     const io = new Server(server, {
// // //       cors: {
// // //         origin: "*", // change to frontend URL later
// // //         methods: ["GET", "POST"]
// // //       }
// // //     });

// // //     // ✅ Socket Connection Handling
// // //     io.on("connection", (socket) => {
// // //       logger.info(`Client connected: ${socket.id}`);

// // //       socket.on("disconnect", () => {
// // //         logger.info(`Client disconnected: ${socket.id}`);
// // //       });
// // //     });

// // //     // ✅ Make io globally accessible (important)
// // //     app.set("io", io);

// // //     // ✅ Start Server
// // //     server.listen(PORT, () => {
// // //       logger.info(`Server running on port ${PORT}`);
// // //     });

// // //   } catch (error) {
// // //     logger.error("Failed to start server", error);
// // //     process.exit(1);
// // //   }
// // // };

// // // startServer();

// // import dotenv from "dotenv";
// // dotenv.config(); // MUST be first

// // import http from "http";
// // import { Server } from "socket.io";

// // import app from "./app.js";
// // import logger from "./config/logger.js";
// // import connectMongo from "./config/mongo.js";
// // import connectNeo4j from "./config/neo4j.js";
// // import { connectRedis } from "./config/redis.js";

// // const PORT = process.env.PORT || 5000;

// // const startServer = async () => {
// //   try {
// //     /* ============================= */
// //     /*     CONNECT DATABASES         */
// //     /* ============================= */

// //     await connectMongo();
// //     await connectNeo4j();
// //     await connectRedis();

// //     logger.info("✅ All databases connected");

// //     /* ============================= */
// //     /*      CREATE HTTP SERVER       */
// //     /* ============================= */

// //     const server = http.createServer(app);

// //     /* ============================= */
// //     /*        SOCKET.IO SETUP        */
// //     /* ============================= */

// //     const io = new Server(server, {
// //       cors: {
// //         origin: "*", // 🔥 restrict in production
// //         methods: ["GET", "POST"],
// //       },
// //     });

// //     io.on("connection", (socket) => {
// //       logger.info(`🔌 Client connected: ${socket.id}`);

// //       socket.on("disconnect", () => {
// //         logger.info(`❌ Client disconnected: ${socket.id}`);
// //       });
// //     });

// //     // ✅ Make io globally accessible (used in ML controller)
// //     app.set("io", io);

// //     /* ============================= */
// //     /*        START SERVER           */
// //     /* ============================= */

// //     server.listen(PORT, () => {
// //       logger.info(`🚀 Server running on port ${PORT}`);
// //     });

// //     /* ============================= */
// //     /*   GRACEFUL SHUTDOWN (NEW)     */
// //     /* ============================= */

// //     process.on("SIGINT", async () => {
// //       logger.warn("⚠️ Shutting down server...");
// //       await new Promise((resolve) => server.close(resolve));
// //       process.exit(0);
// //     });

// //   } catch (error) {
// //     logger.error("❌ Failed to start server", error);
// //     process.exit(1);
// //   }
// // };

// // startServer();

// import dotenv from "dotenv";
// dotenv.config(); // MUST be first

// import http from "http";
// import { Server } from "socket.io";

// import app from "./app.js";
// import logger from "./config/logger.js";
// import connectMongo from "./config/mongo.js";
// import connectNeo4j from "./config/neo4j.js";
// import { connectRedis } from "./config/redis.js";

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     /* ============================= */
//     /*     CONNECT DATABASES         */
//     /* ============================= */

//     await connectMongo();
//     await connectNeo4j();
//     await connectRedis();

//     logger.info("✅ All databases connected");

//     /* ============================= */
//     /*      CREATE HTTP SERVER       */
//     /* ============================= */

//     const server = http.createServer(app);

//     /* ============================= */
//     /*        SOCKET.IO SETUP        */
//     /* ============================= */

//     const io = new Server(server, {
//       cors: {
//         origin: "*", // 🔥 restrict in production
//         methods: ["GET", "POST"],
//       },
//       pingTimeout: 60000,   // ✅ prevents unwanted disconnects
//       pingInterval: 25000,  // ✅ keeps connection alive
//     });

//     io.on("connection", (socket) => {
//       logger.info(`🔌 Client connected: ${socket.id}`);

//       // Optional: listen to custom events
//       socket.on("error", (err) => {
//         logger.error("❌ Socket error:", err);
//       });

//       socket.on("disconnect", (reason) => {
//         logger.warn(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
//       });
//     });

//     /* ============================= */
//     /*   MAKE IO AVAILABLE GLOBALLY  */
//     /* ============================= */

//     app.set("io", io);

//     /* ============================= */
//     /*        START SERVER           */
//     /* ============================= */

//     server.listen(PORT, () => {
//       logger.info(`🚀 Server running on port ${PORT}`);
//     });

//     /* ============================= */
//     /*   GRACEFUL SHUTDOWN           */
//     /* ============================= */

//     const shutdown = async () => {
//       logger.warn("⚠️ Shutting down server...");

//       io.close(() => {
//         logger.info("🔌 Socket.IO closed");
//       });

//       server.close(() => {
//         logger.info("🛑 HTTP server closed");
//         process.exit(0);
//       });
//     };

//     process.on("SIGINT", shutdown);
//     process.on("SIGTERM", shutdown);

//   } catch (error) {
//     logger.error("❌ Failed to start server", error);
//     process.exit(1);
//   }
// };

// // startServer();

import dotenv from "dotenv";
dotenv.config(); // MUST be first

import fs from "fs"; // ✅ ADD THIS

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import logger from "./config/logger.js";
import connectMongo from "./config/mongo.js";
import connectNeo4j from "./config/neo4j.js";
import { connectRedis } from "./config/redis.js";

const PORT = process.env.PORT || 5000;

/* ============================= */
/*   ENSURE uploads/ EXISTS      */
/* ============================= */

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("📁 uploads/ folder created");
} else {
  console.log("📁 uploads/ already exists");
}

const startServer = async () => {
  try {
    /* ============================= */
    /*     CONNECT DATABASES         */
    /* ============================= */

    await connectMongo();
    await connectNeo4j();
    await connectRedis();

    logger.info("✅ All databases connected");

    /* ============================= */
    /*      CREATE HTTP SERVER       */
    /* ============================= */

    const server = http.createServer(app);

    /* ============================= */
    /*        SOCKET.IO SETUP        */
    /* ============================= */

    const io = new Server(server, {
      cors: {
        origin: "*", // 🔥 restrict in production
        methods: ["GET", "POST"],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on("connection", (socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      socket.on("error", (err) => {
        logger.error("❌ Socket error:", err);
      });

      socket.on("disconnect", (reason) => {
        logger.warn(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
      });
    });

    /* ============================= */
    /*   MAKE IO AVAILABLE GLOBALLY  */
    /* ============================= */

    app.set("io", io);

    /* ============================= */
    /*        START SERVER           */
    /* ============================= */

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    /* ============================= */
    /*   GRACEFUL SHUTDOWN           */
    /* ============================= */

    const shutdown = async () => {
      logger.warn("⚠️ Shutting down server...");

      io.close(() => {
        logger.info("🔌 Socket.IO closed");
      });

      server.close(() => {
        logger.info("🛑 HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    logger.error("❌ Failed to start server", error);
    process.exit(1);
  }
};

startServer();