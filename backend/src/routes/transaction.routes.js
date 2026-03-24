// import express from "express";
// import transactionController from "../controllers/transaction.controller.js";
// import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// import validateMiddleware from "../middlewares/validate.middleware.js";

// const router = express.Router();

// router.post(
//   "/",
//   createTransactionValidation,
//   validateMiddleware,
//   transactionController.createTransaction
// );

// export default router;

// import express from "express";
// import transactionController from "../controllers/transaction.controller.js";
// import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
// import validateMiddleware from "../middlewares/validate.middleware.js";

// const router = express.Router();

// /* ============================= */
// /*     TRANSACTION ROUTES        */
// /* ============================= */

// // Create transaction
// router.post(
//   "/",
//   createTransactionValidation,
//   validateMiddleware,
//   transactionController.createTransaction
// );

// // (Future) Get all transactions
// // router.get("/", transactionController.getTransactions);

// export default router;
// backend/src/routes/transaction.routes.js

import express from "express";
import transactionController from "../controllers/transaction.controller.js";
import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ============================= */
/*     TRANSACTION ROUTES        */
/* ============================= */

// 🔐 Protect transaction creation
router.post(
  "/",
  authMiddleware,
  createTransactionValidation,
  validateMiddleware,
  transactionController.createTransaction
);

// (Future) Get all transactions
// router.get("/", authMiddleware, transactionController.getTransactions);

export default router;