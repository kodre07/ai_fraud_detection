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
router.post("/result", mlController.handleMLResult);

export default router;