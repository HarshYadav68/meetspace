import Poll from "../models/Poll.js";

export const getActivePoll = async (req, res) => {
  try {
    const { roomId } = req.params;
    const poll = await Poll.findOne({ roomId, isActive: true });
    return res.status(200).json(poll);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch poll", error: error.message });
  }
};
