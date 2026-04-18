// // backend/src/middlewares/auth.middleware.js

// import jwt from "jsonwebtoken";
// import Analyst from "../models/Analyst.js";

// const authMiddleware = async (req, res, next) => {
//   try {
//     let token;

//     /* ============================= */
//     /*   GET TOKEN FROM HEADER       */
//     /* ============================= */
//     const authHeader = req.headers.authorization;

//     if (authHeader && authHeader.startsWith("Bearer ")) {
//       token = authHeader.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Not authorized. No token provided.",
//       });
//     }

//     /* ============================= */
//     /*      VERIFY TOKEN             */
//     /* ============================= */
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     /* ============================= */
//     /*   FIND ANALYST (ATTACH USER)  */
//     /* ============================= */
//     const analyst = await Analyst.findById(decoded.id).select("-password");

//     if (!analyst || !analyst.isActive) {
//       return res.status(401).json({
//         success: false,
//         message: "User not found or inactive",
//       });
//     }

//     // attach to request (VERY IMPORTANT)
//     req.analyst = analyst;

//     next();
//   } catch (error) {
//     return res.status(401).json({
//       success: false,
//       message: "Invalid or expired token",
//     });
//   }
// };

// export default authMiddleware;
// backend/src/middlewares/auth.middleware.js

import jwt from "jsonwebtoken";
import Analyst from "../models/Analyst.js";

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    /* ============================= */
    /*   CHECK JWT SECRET            */
    /* ============================= */
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    /* ============================= */
    /*   GET TOKEN FROM HEADER       */
    /* ============================= */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.split(" ")[0] === "Bearer") {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    /* ============================= */
    /*      VERIFY TOKEN             */
    /* ============================= */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* ============================= */
    /*   OPTIONAL ROLE CHECK         */
    /* ============================= */
    if (decoded.role && decoded.role !== "analyst") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /* ============================= */
    /*   FIND ANALYST (ATTACH USER)  */
    /* ============================= */
    const analyst = await Analyst.findById(decoded.id).select(
      "_id name email role isActive"
    );

    if (!analyst || !analyst.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    /* ============================= */
    /*   ATTACH USER TO REQUEST      */
    /* ============================= */
    req.analyst = analyst;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;