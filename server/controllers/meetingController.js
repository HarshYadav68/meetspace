import { v4 as uuidv4 } from "uuid";
import Meeting from "../models/Meeting.js";

export const createMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.create({
      roomId: uuidv4(),
      host: req.user._id,
      participants: [req.user._id],
      isActive: true
    });
    return res.status(201).json(meeting);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create meeting", error: error.message });
  }
};

export const getMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;
    const meeting = await Meeting.findOne({ roomId })
      .populate("host", "name email")
      .populate("participants", "name email");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.status(200).json(meeting);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch meeting", error: error.message });
  }
};
