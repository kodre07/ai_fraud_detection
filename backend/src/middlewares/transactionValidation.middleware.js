import { body } from "express-validator";

export const createTransactionValidation = [
  body("senderId")
    .notEmpty()
    .withMessage("Sender ID is required")
    .isString()
    .withMessage("Sender ID must be a string"),

  body("receiverId")
    .notEmpty()
    .withMessage("Receiver ID is required")
    .isString()
    .withMessage("Receiver ID must be a string"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),

  body("deviceId")
    .notEmpty()
    .withMessage("Device ID is required")
    .isString()
    .withMessage("Device ID must be a string"),

  body("ipAddress")
    .notEmpty()
    .withMessage("IP Address is required")
    .isString()
    .withMessage("IP Address must be a string"),

  // ❌ No timestamp validation
];