// backend/src/middlewares/auth.middleware.js

import jwt from "jsonwebtoken";
import Analyst from "../models/Analyst.js";

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    /* ============================= */
    /*   GET TOKEN FROM HEADER       */
    /* ============================= */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
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
    /*   FIND ANALYST (ATTACH USER)  */
    /* ============================= */
    const analyst = await Analyst.findById(decoded.id).select("-password");

    if (!analyst || !analyst.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    // attach to request (VERY IMPORTANT)
    req.analyst = analyst;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;