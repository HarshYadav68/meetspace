import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
