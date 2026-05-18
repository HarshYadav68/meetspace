import { useCallback, useRef, useState } from "react";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const useWebRTC = (socket, roomId, user) => {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});

  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    (targetSocketId, stream) => {
      if (peerConnections.current[targetSocketId]) return peerConnections.current[targetSocketId];
      const pc = new RTCPeerConnection(rtcConfig);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [targetSocketId]: event.streams[0] }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            targetSocketId,
            candidate: event.candidate,
            from: socket.id
          });
        }
      };

      peerConnections.current[targetSocketId] = pc;
      return pc;
    },
    [socket]
  );

  const handleRoomUsers = useCallback(
    async (entries) => {
      const stream = localStreamRef.current || localStream || (await startLocalStream());
      for (const [socketId] of entries) {
        if (socketId === socket.id) continue;
        if (socket.id > socketId) continue;
        const existingPc = peerConnections.current[socketId];
        if (existingPc?.currentLocalDescription) continue;
        const pc = createPeerConnection(socketId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, targetSocketId: socketId, offer, from: socket.id, user });
      }
    },
    [createPeerConnection, localStream, roomId, socket, startLocalStream, user]
  );

  const replaceVideoTrack = useCallback((newTrack) => {
    Object.values(peerConnections.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  return {
    localStream,
    remoteStreams,
    peerConnections,
    startLocalStream,
    createPeerConnection,
    handleRoomUsers,
    replaceVideoTrack
  };
};

export default useWebRTC;
