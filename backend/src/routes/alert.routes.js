import express from "express";
import {
  getAllAlerts,
  updateAlertStatus,
} from "../controllers/alert.controller.js";

const router = express.Router();

// Get all alerts
router.get("/", getAllAlerts);

// Update alert (review / close / assign)
router.patch("/:id", updateAlertStatus);

export default router;