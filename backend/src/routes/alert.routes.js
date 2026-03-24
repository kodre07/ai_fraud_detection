// import express from "express";
// import {
//   getAllAlerts,
//   updateAlertStatus,
// } from "../controllers/alert.controller.js";

// const router = express.Router();

// // Get all alerts
// router.get("/", getAllAlerts);

// // Update alert (review / close / assign)
// router.patch("/:id", updateAlertStatus);

// export default router;

// import express from "express";
// import {
//   getAllAlerts,
//   updateAlertStatus,
// } from "../controllers/alert.controller.js";

// const router = express.Router();

// /* ============================= */
// /*         ALERT ROUTES          */
// /* ============================= */

// // Get all alerts (optionally filter by status)
// router.get("/", getAllAlerts);

// // Update alert status (review / resolved / assigned)
// router.patch("/:id", updateAlertStatus);

// export default router;

// backend/src/routes/alert.routes.js

import express from "express";
import {
  getAllAlerts,
  updateAlertStatus,
} from "../controllers/alert.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ============================= */
/*         ALERT ROUTES          */
/* ============================= */

// 🔐 Apply auth to ALL alert routes
router.use(authMiddleware);

// Get all alerts (optionally filter by status)
router.get("/", getAllAlerts);

// Update alert status (review / resolved / assigned)
router.patch("/:id", updateAlertStatus);

export default router;