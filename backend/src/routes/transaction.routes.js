// // import express from "express";
// // import transactionController from "../controllers/transaction.controller.js";
// // import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// // import validateMiddleware from "../middlewares/validate.middleware.js";

// // const router = express.Router();

// // router.post(
// //   "/",
// //   createTransactionValidation,
// //   validateMiddleware,
// //   transactionController.createTransaction
// // );

// // export default router;

// // import express from "express";
// // import transactionController from "../controllers/transaction.controller.js";
// // import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// // import validateMiddleware from "../middlewares/validate.middleware.js";

// // const router = express.Router();

// // /* ============================= */
// // /*     TRANSACTION ROUTES        */
// // /* ============================= */

// // // Create transaction
// // router.post(
// //   "/",
// //   createTransactionValidation,
// //   validateMiddleware,
// //   transactionController.createTransaction
// // );

// // // (Future) Get all transactions
// // // router.get("/", transactionController.getTransactions);

// // export default router;
// // // backend/src/routes/transaction.routes.js

// // import express from "express";
// // import transactionController from "../controllers/transaction.controller.js";
// // import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// // import validateMiddleware from "../middlewares/validate.middleware.js";
// // import authMiddleware from "../middlewares/auth.middleware.js";

// // const router = express.Router();

// // /* ============================= */
// // /*     TRANSACTION ROUTES        */
// // /* ============================= */

// // // 🔐 Protect transaction creation
// // router.post(
// //   "/",
// //   authMiddleware,
// //   createTransactionValidation,
// //   validateMiddleware,
// //   transactionController.createTransaction
// // );
// // router.get(
// //   "/account/:id",
// //   authMiddleware,
// //   transactionController.getTransactionsByAccount
// // );

// // // (Future) Get all transactions
// // // router.get("/", authMiddleware, transactionController.getTransactions);

// // export default router;
// // backend/src/routes/transaction.routes.js

// import express from "express";
// import transactionController from "../controllers/transaction.controller.js";
// import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// import validateMiddleware from "../middlewares/validate.middleware.js";
// import authMiddleware from "../middlewares/auth.middleware.js";
// import rateLimitMiddleware from "../middlewares/rateLimit.middleware.js";

// const router = express.Router();

// /* ============================= */
// /*     TRANSACTION ROUTES        */
// /* ============================= */

// // 🔐 Protected transaction creation
// router.post(
//   "/",
//   rateLimitMiddleware,        // ✅ added protection
//   authMiddleware,             // ✅ keep this
//   createTransactionValidation,
//   validateMiddleware,
//   transactionController.createTransaction
// );

// // 🔐 Get transactions by account
// router.get(
//   "/account/:id",
//   authMiddleware,
//   transactionController.getTransactionsByAccount
// );

// export default router;

// backend/src/routes/transaction.routes.js

import express from "express";
import multer from "multer";
import transactionController from "../controllers/transaction.controller.js";
import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import rateLimitMiddleware from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

/* ── Multer: store uploads to disk ──────────────────────────── */
const upload = multer({ dest: "uploads/" });

/* ============================= */
/*     TRANSACTION ROUTES        */
/* ============================= */

// 🔐 Protected transaction creation
router.post(
  "/",
  rateLimitMiddleware,              // ✅ rate limit first
  createTransactionValidation,      // ✅ validate input
  validateMiddleware,               // ✅ check validation errors
  authMiddleware,                   // ✅ then authenticate
  transactionController.createTransaction
);

// 🔐 Get transactions by account
router.get(
  "/account/:id",
  authMiddleware,
  transactionController.getTransactionsByAccount
);

/* ============================= */
/*   CSV BATCH UPLOAD ROUTE      */
/* ============================= */

// 📂 POST /api/transactions/upload
// Accepts a multipart/form-data file field named "file".
// Processes each CSV row through the full fraud pipeline.
// Note: auth is intentionally omitted here so batch imports
//       (e.g. from internal scripts) can run without a token.
//       Add authMiddleware before upload.single() if you want protection.
router.post(
  "/upload",
  upload.single("file"),
  transactionController.uploadTransactions
);

export default router;