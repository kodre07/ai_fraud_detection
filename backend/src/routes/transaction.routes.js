import express from "express";
import transactionController from "../controllers/transaction.controller.js";
import { createTransactionValidation } from "../middlewares/transactionValidation.middleware.js";
import validateMiddleware from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
  "/",
  createTransactionValidation,
  validateMiddleware,
  transactionController.createTransaction
);

export default router;