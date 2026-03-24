// import { body } from "express-validator";

// export const createTransactionValidation = [
//   body("senderId")
//     .notEmpty()
//     .withMessage("Sender ID is required")
//     .isString()
//     .withMessage("Sender ID must be a string"),

//   body("receiverId")
//     .notEmpty()
//     .withMessage("Receiver ID is required")
//     .isString()
//     .withMessage("Receiver ID must be a string"),

//   body("amount")
//     .notEmpty()
//     .withMessage("Amount is required")
//     .isFloat({ gt: 0 })
//     .withMessage("Amount must be greater than 0"),

//   body("deviceId")
//     .notEmpty()
//     .withMessage("Device ID is required")
//     .isString()
//     .withMessage("Device ID must be a string"),

//   body("ipAddress")
//     .notEmpty()
//     .withMessage("IP Address is required")
//     .isString()
//     .withMessage("IP Address must be a string"),

//   // ❌ No timestamp validation
// ];


import { body, validationResult } from "express-validator";

/* ============================= */
/*   TRANSACTION VALIDATION      */
/* ============================= */

export const createTransactionValidation = [
  body("senderId")
    .trim()
    .notEmpty()
    .withMessage("Sender ID is required")
    .isString()
    .withMessage("Sender ID must be a string"),

  body("receiverId")
    .trim()
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
    .trim()
    .notEmpty()
    .withMessage("Device ID is required")
    .isString()
    .withMessage("Device ID must be a string"),

  body("ipAddress")
    .notEmpty()
    .withMessage("IP Address is required")
    .isIP()
    .withMessage("Invalid IP address format"),

  // OPTIONAL: timestamp (useful for fraud detection)
  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid date"),

  /* ============================= */
  /*  VALIDATION ERROR HANDLER     */
  /* ============================= */

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    next();
  },
];