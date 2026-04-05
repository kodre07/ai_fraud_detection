import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import caseController from "../controllers/case.controller.js";

const router = express.Router();

/* ============================= */
/* GET CASES                     */
/* ============================= */
router.use(authMiddleware);

router.get("/", caseController.getCases);

export default router;