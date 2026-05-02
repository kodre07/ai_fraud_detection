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

// GET alerts is intentionally public (read-only monitoring data)
// so the dashboard can poll without a JWT token.
router.get("/", getAllAlerts);

// Update alert status (review / resolved / assigned) — protected
router.patch("/:id", authMiddleware, updateAlertStatus);

export default router;