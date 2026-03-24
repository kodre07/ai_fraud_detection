// // backend/src/middlewares/validate.middleware.js
// import { validationResult } from "express-validator";

// const validateMiddleware = (req, res, next) => {
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: errors.array(),
//     });
//   }

//   next();
// };

// export default validateMiddleware;

// backend/src/middlewares/validate.middleware.js

import { validationResult } from "express-validator";

const validateMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }

  next();
};

export default validateMiddleware;