import express from "express";
import { createMeeting, getMeetingByRoomId } from "../controllers/meetingController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createMeeting);
router.get("/:roomId", protect, getMeetingByRoomId);

export default router;
