// // // backend/src/middlewares/validate.middleware.js
// // import { validationResult } from "express-validator";

// // const validateMiddleware = (req, res, next) => {
// //   const errors = validationResult(req);

// //   if (!errors.isEmpty()) {
// //     return res.status(400).json({
// //       success: false,
// //       message: "Validation failed",
// //       errors: errors.array(),
// //     });
// //   }

// //   next();
// // };

// // export default validateMiddleware;

// // backend/src/middlewares/validate.middleware.js

// import { validationResult } from "express-validator";

// const validateMiddleware = (req, res, next) => {
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: errors.array().map((err) => ({
//         field: err.path,
//         message: err.msg,
//       })),
//     });
//   }

//   next();
// };

// export default validateMiddleware;

// backend/src/middlewares/validate.middleware.js

import { validationResult } from "express-validator";

const validateMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  // ✅ If validation errors exist
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param, // fallback safety
      message: err.msg,
      value: err.value ?? null, // optional but useful
    }));

    // (Optional) Log errors for debugging
    console.error("Validation Errors:", formattedErrors);

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
    });
  }

  // ✅ No errors → continue
  next();
};

export default validateMiddleware;