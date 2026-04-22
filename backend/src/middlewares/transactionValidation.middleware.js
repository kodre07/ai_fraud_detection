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

// export const createTransactionValidation = [
//   body("senderId")
//     .trim()
//     .notEmpty()
//     .withMessage("Sender ID is required")
//     .isString()
//     .withMessage("Sender ID must be a string"),

//   body("receiverId")
//     .trim()
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
//     .trim()
//     .notEmpty()
//     .withMessage("Device ID is required")
//     .isString()
//     .withMessage("Device ID must be a string"),

//   body("ipAddress")
//     .notEmpty()
//     .withMessage("IP Address is required")
//     .isIP()
//     .withMessage("Invalid IP address format"),

//   // OPTIONAL: timestamp (useful for fraud detection)
//   body("timestamp")
//     .optional()
//     .isISO8601()
//     .withMessage("Timestamp must be a valid date"),

//   /* ============================= */
//   /*  VALIDATION ERROR HANDLER     */
//   /* ============================= */

//   (req, res, next) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array().map((err) => ({
//           field: err.path,
//           message: err.msg,
//         })),
//       });
//     }

//     next();
//   },
// ];

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
    .optional({ nullable: true })
    .isString()
    .withMessage("Device ID must be a string")
    .trim(),

  body("ipAddress")
    .optional({ nullable: true })
    .isIP()
    .withMessage("Invalid IP address format"),

  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid date"),

  /* ───── Optional enrichment fields ───── */
  /* All optional — existing clients that omit them continue to work */

  body("email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("email must be a valid email address")
    .normalizeEmail(),

  body("phone")
    .optional({ nullable: true })
    .isString()
    .withMessage("phone must be a string"),

  body("isVpn")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("isVpn must be a boolean")
    .toBoolean(),

  body("isProxy")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("isProxy must be a boolean")
    .toBoolean(),

  body("ipCountry")
    .optional({ nullable: true })
    .isString()
    .withMessage("ipCountry must be a string")
    .isLength({ max: 10 })
    .withMessage("ipCountry must be a 2-letter country code")
    .trim()
    .toUpperCase(),

  body("accountCountry")
    .optional({ nullable: true })
    .isString()
    .withMessage("accountCountry must be a string")
    .isLength({ max: 10 })
    .withMessage("accountCountry must be a 2-letter country code")
    .trim()
    .toUpperCase(),
];