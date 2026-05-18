import Message from "../models/Message.js";
import Poll from "../models/Poll.js";

const roomUsers = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", async ({ roomId, user }) => {
      socket.join(roomId);
      socket.data.user = user;
      socket.data.roomId = roomId;

      if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
      roomUsers.get(roomId).set(socket.id, user);

      socket.to(roomId).emit("user-joined", { socketId: socket.id, user });
      io.to(roomId).emit("room-users", Array.from(roomUsers.get(roomId).entries()));
    });

    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        io.to(roomId).emit("user-left", { socketId: socket.id });
      }
    });

    socket.on("offer", ({ roomId, targetSocketId, offer, from }) => {
      io.to(targetSocketId).emit("offer", { offer, from, roomId });
    });

    socket.on("answer", ({ targetSocketId, answer, from }) => {
      io.to(targetSocketId).emit("answer", { answer, from });
    });

    socket.on("ice-candidate", ({ targetSocketId, candidate, from }) => {
      io.to(targetSocketId).emit("ice-candidate", { candidate, from });
    });

    socket.on("send-message", async ({ roomId, senderId, senderName, text }, ack) => {
      const fail = (message) => {
        socket.emit("socket-error", { message });
        if (typeof ack === "function") ack({ ok: false, message });
      };

      try {
        const trimmedText = text?.trim();
        if (!roomId || !senderId || !trimmedText) {
          fail("Invalid message. Please try again.");
          return;
        }

        if (!socket.rooms.has(roomId)) {
          await socket.join(roomId);
          socket.data.roomId = roomId;
        }

        const message = await Message.create({ roomId, sender: senderId, text: trimmedText });
        const payload = {
          _id: message._id,
          roomId,
          sender: { _id: senderId, name: senderName || "User" },
          text: trimmedText,
          timestamp: message.timestamp
        };
        io.to(roomId).emit("receive-message", payload);
        if (typeof ack === "function") ack({ ok: true });
      } catch (error) {
        fail("Failed to send message");
      }
    });

    socket.on("whiteboard-draw", ({ roomId, payload }) => {
      socket.to(roomId).emit("whiteboard-draw", payload);
    });

    socket.on("whiteboard-clear", ({ roomId }) => {
      io.to(roomId).emit("whiteboard-clear");
    });

    socket.on("send-reaction", ({ roomId, reaction, sender }) => {
      io.to(roomId).emit("receive-reaction", { reaction, sender, at: Date.now() });
    });

    socket.on("create-poll", async ({ roomId, question, options, createdBy }) => {
      try {
        await Poll.updateMany({ roomId, isActive: true }, { isActive: false });
        const poll = await Poll.create({
          roomId,
          question,
          options: options.map((text) => ({ text, votes: 0 })),
          createdBy,
          isActive: true
        });
        io.to(roomId).emit("poll-update", poll);
      } catch (error) {
        socket.emit("socket-error", { message: "Failed to create poll" });
      }
    });

    socket.on("vote-poll", async ({ pollId, optionIndex, userId, roomId }) => {
      try {
        const poll = await Poll.findById(pollId);
        if (!poll || !poll.isActive) return;

        const alreadyVoted = poll.votedUsers.some((id) => String(id) === String(userId));
        if (alreadyVoted) return;

        if (poll.options[optionIndex]) poll.options[optionIndex].votes += 1;
        poll.votedUsers.push(userId);
        await poll.save();

        io.to(roomId).emit("poll-update", poll);
      } catch (error) {
        socket.emit("socket-error", { message: "Failed to vote poll" });
      }
    });

    socket.on("screen-share-start", ({ roomId, user }) => {
      io.to(roomId).emit("screen-share-start", { user });
    });

    socket.on("screen-share-stop", ({ roomId, user }) => {
      io.to(roomId).emit("screen-share-stop", { user });
    });

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (roomId && roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
    });
  });
};

export default socketHandler;
