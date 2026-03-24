// backend/src/routes/auth.routes.js

import express from "express";
import {
  registerAnalyst,
  loginAnalyst,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerAnalyst);
router.post("/login", loginAnalyst);

export default router;