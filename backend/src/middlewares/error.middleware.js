// import logger from "../config/logger.js";

// const errorMiddleware = (err, req, res, next) => {
//   logger.error(err.stack);

//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// };

// export default errorMiddleware;

import logger from "../config/logger.js";

const errorMiddleware = (err, req, res, next) => {
  // Log full error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
};

export default errorMiddleware;