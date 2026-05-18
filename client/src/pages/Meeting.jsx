import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import PollWidget from "../components/PollWidget";
import ReactionBar from "../components/ReactionBar";
import VideoGrid from "../components/VideoGrid";
import Whiteboard from "../components/Whiteboard";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import useWebRTC from "../hooks/useWebRTC";
import api from "../utils/api";

const Meeting = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected: isSocketConnected } = useSocket(Boolean(user));
  const localVideoRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [showBoard, setShowBoard] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [poll, setPoll] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [screenSharingBy, setScreenSharingBy] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [media, setMedia] = useState({ mic: true, cam: true });

  const isHost = useMemo(() => {
    if (!user || !meetingInfo?.host?._id) return false;
    return String(meetingInfo.host._id) === String(user._id);
  }, [meetingInfo, user]);
  const { localStream, remoteStreams, startLocalStream, createPeerConnection, handleRoomUsers, replaceVideoTrack, peerConnections } =
    useWebRTC(socket, roomId, user);

  const pushToast = useCallback((message, type = "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    if (!user || !socket || !roomId) return;

    const joinRoom = () => {
      socket.emit("join-room", { roomId, user: { _id: user._id, name: user.name, email: user.email } });
    };

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    return () => {
      socket.off("connect", joinRoom);
      socket.emit("leave-room", { roomId });
    };
  }, [roomId, socket, user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const initMedia = async () => {
      const stream = await startLocalStream();
      if (mounted && localVideoRef.current) localVideoRef.current.srcObject = stream;
    };
    initMedia();
    return () => {
      mounted = false;
    };
  }, [startLocalStream, user]);

  useEffect(() => {
    const loadMeeting = async () => {
      try {
        const [meetingRes, messagesRes, pollRes] = await Promise.all([
          api.get(`/meetings/${roomId}`),
          api.get(`/chat/${roomId}`),
          api.get(`/polls/${roomId}`)
        ]);
        setMeetingInfo(meetingRes.data);
        setMessages(messagesRes.data || []);
        setPoll(pollRes.data || null);
      } catch (error) {
        setMeetingInfo(null);
        setMessages([]);
        setPoll(null);
        pushToast("Could not load meeting details. Please refresh.");
      }
    };
    if (user) loadMeeting();
  }, [pushToast, roomId, user]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg) =>
      setMessages((prev) => {
        if (msg._id && prev.some((m) => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    socket.on("receive-message", onMessage);
    return () => socket.off("receive-message", onMessage);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const onSocketError = ({ message }) => pushToast(message || "Something went wrong");
    const onConnectError = () => pushToast("Realtime connection failed. Please refresh the page.");
    socket.on("socket-error", onSocketError);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("socket-error", onSocketError);
      socket.off("connect_error", onConnectError);
    };
  }, [pushToast, socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on("room-users", handleRoomUsers);
    socket.on("offer", async ({ offer, from }) => {
      const existingPc = peerConnections.current[from];
      if (existingPc?.signalingState === "stable" && existingPc.currentRemoteDescription) return;
      const stream = localStream || (await startLocalStream());
      const pc = createPeerConnection(from, stream);
      if (pc.signalingState === "have-local-offer" && socket.id > from) {
        await pc.setLocalDescription({ type: "rollback" });
      }
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { targetSocketId: from, answer, from: socket.id });
    });
    socket.on("answer", async ({ answer, from }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.setRemoteDescription(answer);
    });
    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.addIceCandidate(candidate);
    });
    socket.on("poll-update", setPoll);
    socket.on("receive-reaction", (data) => {
      setFloatingReactions((prev) => [...prev, { ...data, id: crypto.randomUUID() }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.slice(1));
      }, 1600);
    });
    socket.on("screen-share-start", ({ user: u }) => setScreenSharingBy(u?.name || "Someone"));
    socket.on("screen-share-stop", () => setScreenSharingBy(null));
    return () => {
      socket.off("room-users");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("poll-update");
      socket.off("receive-reaction");
      socket.off("screen-share-start");
      socket.off("screen-share-stop");
    };
  }, [createPeerConnection, handleRoomUsers, localStream, peerConnections, socket, startLocalStream]);

  const toggleMic = () => {
    const stream = localStream;
    if (!stream) return;
    const enabled = !media.mic;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;
    audioTracks.forEach((t) => {
      t.enabled = enabled;
    });
    setMedia((p) => ({ ...p, mic: enabled }));
  };

  const toggleCam = () => {
    if (!localStream) return;
    const enabled = !media.cam;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    setMedia((p) => ({ ...p, cam: enabled }));
  };

  const startScreenShare = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      replaceVideoTrack(track);
      socket.emit("screen-share-start", { roomId, user });
      track.onended = async () => {
        const cameraTrack = localStream?.getVideoTracks()[0];
        if (cameraTrack) replaceVideoTrack(cameraTrack);
        socket.emit("screen-share-stop", { roomId, user });
      };
    } catch (error) {
      pushToast("Screen sharing could not start.");
    }
  };

  if (!user) return <div className="p-6">Please login to join meeting.</div>;

  return (
    <div className="relative flex h-[calc(100vh-57px)] flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm text-slate-300">Room: {roomId}</p>
            <button onClick={() => setShowPoll((p) => !p)} className="rounded bg-slate-800 px-3 py-1 text-xs">Poll</button>
          </div>
          {screenSharingBy && <p className="px-3 text-xs text-cyan-300">{screenSharingBy} is sharing screen</p>}
          <VideoGrid localVideoRef={localVideoRef} remoteStreams={remoteStreams} />
        </div>
        <div className="h-72 w-full lg:h-full lg:w-80 lg:min-w-80">
          <ChatPanel
            messages={messages}
            onSend={(text) => {
              const trimmed = text.trim();
              if (!trimmed || !roomId) return Promise.resolve(false);
              if (!socket) {
                pushToast("Message not sent. Realtime connection is not ready.");
                return Promise.resolve(false);
              }
              if (!isSocketConnected) {
                pushToast("Message not sent. Realtime connection is not ready.");
                socket.connect();
                return Promise.resolve(false);
              }

              return new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                  pushToast("Message not sent. No response from server.");
                  resolve(false);
                }, 8000);

                socket.emit(
                  "send-message",
                  {
                    roomId,
                    text: trimmed,
                    senderId: user._id,
                    senderName: user.name
                  },
                  (res) => {
                    clearTimeout(timeoutId);
                    if (res?.ok) {
                      resolve(true);
                      return;
                    }
                    pushToast(res?.message || "Failed to send message");
                    resolve(false);
                  }
                );
              });
            }}
          />
        </div>
      </div>

      {showPoll && (
        <div className="absolute right-3 top-14 z-40 w-80">
          <PollWidget
            poll={poll}
            isHost={isHost}
            onCreatePoll={(question, options) => {
              if (!socket) {
                pushToast("Poll could not be created. Realtime connection is not ready.");
                return;
              }
              if (!isSocketConnected) socket.connect();
              socket.emit("create-poll", { roomId, question, options, createdBy: user._id });
            }}
            onVote={(optionIndex) => {
              if (!poll) {
                pushToast("No active poll to vote on.");
                return;
              }
              if (!socket) {
                pushToast("Vote not submitted. Realtime connection is not ready.");
                return;
              }
              if (!isSocketConnected) socket.connect();
              socket.emit("vote-poll", { pollId: poll._id, optionIndex, userId: user._id, roomId });
            }}
          />
        </div>
      )}

      <div className="mx-auto mb-3 flex w-[95%] flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/95 p-3">
        <div className="flex gap-2">
          <button onClick={toggleMic} className="rounded bg-slate-800 px-3 py-2 text-sm">{media.mic ? "Mic On" : "Mic Off"}</button>
          <button onClick={toggleCam} className="rounded bg-slate-800 px-3 py-2 text-sm">{media.cam ? "Cam On" : "Cam Off"}</button>
          <button onClick={startScreenShare} className="rounded bg-slate-800 px-3 py-2 text-sm">Share Screen</button>
          <button onClick={() => setShowBoard((b) => !b)} className="rounded bg-slate-800 px-3 py-2 text-sm">Whiteboard</button>
        </div>
        <ReactionBar onSend={(reaction) => socket.emit("send-reaction", { roomId, reaction, sender: user.name })} />
        <button onClick={() => navigate("/")} className="rounded bg-red-600 px-3 py-2 text-sm">
          End Call
        </button>
      </div>

      <Whiteboard socket={socket} roomId={roomId} open={showBoard} onClose={() => setShowBoard(false)} />

      <div className="pointer-events-none absolute inset-0">
        {floatingReactions.map((r, idx) => (
          <span
            key={r.id}
            className="absolute text-3xl"
            style={{
              left: `${20 + (idx % 6) * 12}%`,
              bottom: `${10 + idx * 2}%`,
              animation: "floatUp 1.6s ease-out forwards"
            }}
          >
            {r.reaction}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-xs rounded border px-3 py-2 text-sm shadow-lg ${
              toast.type === "error"
                ? "border-red-500/40 bg-red-900/80 text-red-100"
                : "border-cyan-500/40 bg-cyan-900/80 text-cyan-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>
        {`@keyframes floatUp { from { transform: translateY(0); opacity:1; } to { transform: translateY(-120px); opacity:0; } }`}
      </style>
    </div>
  );
};

export default Meeting;
