// import express from "express";
// import mlController from "../controllers/ml.controller.js";

// const router = express.Router();

// /**
//  * ML Result Callback
//  * Python FastAPI will call this endpoint
//  */
// router.post("/result", mlController.handleMLResult);

// export default router;
import express from "express";
import mlController from "../controllers/ml.controller.js";

const router = express.Router();

/* ============================= */
/*        ML CALLBACK ROUTES     */
/* ============================= */

// Python FastAPI will call this endpoint
const mlAuthMiddleware = (req, res, next) => {
  const secret = req.headers["x-service-secret"];
  if (secret !== process.env.ML_SERVICE_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};
router.post("/result", mlAuthMiddleware, mlController.handleMLResult);


export default router;