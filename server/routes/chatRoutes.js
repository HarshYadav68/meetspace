import express from "express";
import { getRoomMessages } from "../controllers/chatController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:roomId", protect, getRoomMessages);

export default router;
