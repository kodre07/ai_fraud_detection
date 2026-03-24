// import rateLimit from "express-rate-limit";

// const rateLimitMiddleware = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 100, // 100 requests per IP
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: "Too many requests, please try again later.",
//   },
// });

// export default rateLimitMiddleware;


import rateLimit from "express-rate-limit";

const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
    });
  },
});

export default rateLimitMiddleware;