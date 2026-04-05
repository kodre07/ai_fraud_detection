
// // import express from "express";
// // import cors from "cors";
// // import helmet from "helmet";

// // import rateLimitMiddleware from "./middlewares/rateLimit.middleware.js";
// // import errorMiddleware from "./middlewares/error.middleware.js";

// // import healthRoutes from "./routes/health.routes.js";
// // import transactionRoutes from "./routes/transaction.routes.js"; // ✅ IMPORT THIS

// // const app = express();

// // /* ============================= */
// // /*         CORE MIDDLEWARE       */
// // /* ============================= */

// // app.use(helmet());
// // app.use(cors());
// // app.use(express.json());
// // app.use(rateLimitMiddleware);

// // /* ============================= */
// // /*            ROUTES             */
// // /* ============================= */

// // app.use("/api/health", healthRoutes);
// // app.use("/api/transactions", transactionRoutes); // ✅ UNCOMMENT THIS

// // /* ============================= */
// // /*          404 HANDLER          */
// // /* ============================= */

// // app.use((req, res) => {
// //   res.status(404).json({
// //     success: false,
// //     message: "Route not found",
// //   });
// // });

// // /* ============================= */
// // /*      CENTRAL ERROR HANDLER    */
// // /* ============================= */

// // app.use(errorMiddleware);

// // export default app;
// // import express from "express";
// // import cors from "cors";
// // import helmet from "helmet";

// // import rateLimitMiddleware from "./middlewares/rateLimit.middleware.js";
// // import errorMiddleware from "./middlewares/error.middleware.js";

// // import healthRoutes from "./routes/health.routes.js";
// // import transactionRoutes from "./routes/transaction.routes.js";
// // import mlRoutes from "./routes/ml.routes.js"; // ✅ NEW

// // const app = express();

// // /* ============================= */
// // /*         CORE MIDDLEWARE       */
// // /* ============================= */

// // app.use(helmet());
// // app.use(cors());
// // app.use(express.json());
// // app.use(rateLimitMiddleware);

// // /* ============================= */
// // /*            ROUTES             */
// // /* ============================= */

// // app.use("/api/health", healthRoutes);
// // app.use("/api/transactions", transactionRoutes);
// // app.use("/api/ml", mlRoutes); // ✅ REGISTER ML ROUTE

// // /* ============================= */
// // /*          404 HANDLER          */
// // /* ============================= */

// // app.use((req, res) => {
// //   res.status(404).json({
// //     success: false,
// //     message: "Route not found",
// //   });
// // });

// // /* ============================= */
// // /*      CENTRAL ERROR HANDLER    */
// // /* ============================= */

// // app.use(errorMiddleware);

// // export default app;
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";

// import rateLimitMiddleware from "./middlewares/rateLimit.middleware.js";
// import errorMiddleware from "./middlewares/error.middleware.js";

// import healthRoutes from "./routes/health.routes.js";
// import transactionRoutes from "./routes/transaction.routes.js";
// import mlRoutes from "./routes/ml.routes.js";
// import alertRoutes from "./routes/alert.routes.js"; // ✅ NEW ALERT ROUTE

// const app = express();

// /* ============================= */
// /*         CORE MIDDLEWARE       */
// /* ============================= */

// app.use(helmet());
// app.use(cors());
// app.use(express.json());
// app.use(rateLimitMiddleware);

// /* ============================= */
// /*            ROUTES             */
// /* ============================= */

// app.use("/api/health", healthRoutes);
// app.use("/api/transactions", transactionRoutes);
// app.use("/api/ml", mlRoutes);
// app.use("/api/alerts", alertRoutes); // ✅ REGISTER ALERT ROUTE

// /* ============================= */
// /*          404 HANDLER          */
// /* ============================= */

// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//   });
// });

// /* ============================= */
// /*      CENTRAL ERROR HANDLER    */
// /* ============================= */

// app.use(errorMiddleware);

// export default app;


import express from "express";
import cors from "cors";
import helmet from "helmet";

import rateLimitMiddleware from "./middlewares/rateLimit.middleware.js";
import errorMiddleware from "./middlewares/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import caseRoutes from "./routes/case.routes.js";
import accountRoutes from "./routes/account.routes.js";
// ✅ (OPTIONAL but recommended if you add cases soon)
// import caseRoutes from "./routes/case.routes.js";

const app = express();

/* ============================= */
/*         CORE MIDDLEWARE       */
/* ============================= */

// ✅ Security headers
app.use(helmet());

// ✅ CORS (tighten later for prod)
app.use(
  cors({
    origin: "*", // 🔥 change to frontend URL in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Body parser
app.use(express.json());

// ✅ Rate limiting
app.use(rateLimitMiddleware);

/* ============================= */
/*            ROUTES             */
/* ============================= */

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/accounts", accountRoutes);

// ✅ (future)
// app.use("/api/cases", caseRoutes);

/* ============================= */
/*          404 HANDLER          */
/* ============================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ============================= */
/*      CENTRAL ERROR HANDLER    */
/* ============================= */

app.use(errorMiddleware);

export default app;