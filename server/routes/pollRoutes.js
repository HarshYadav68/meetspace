import express from "express";
import { getActivePoll } from "../controllers/pollController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:roomId", protect, getActivePoll);

export default router;
