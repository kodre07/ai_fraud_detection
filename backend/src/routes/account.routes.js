import express from "express";
import accountController from "../controllers/account.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/:id", authMiddleware, accountController.getAccountProfile);

export default router;