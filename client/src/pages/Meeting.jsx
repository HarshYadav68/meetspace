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
import { getDisplaySurface, getLoopPreventionTip, requestScreenShare } from "../utils/screenShare";

const Meeting = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected: isSocketConnected } = useSocket(Boolean(user));
  const localVideoRef = useRef(null);
  const stoppingShareRef = useRef(false);
  const screenSharingSocketIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [showBoard, setShowBoard] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [poll, setPoll] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [screenSharingBy, setScreenSharingBy] = useState(null);
  const [screenSharingSocketId, setScreenSharingSocketId] = useState(null);
  const [participants, setParticipants] = useState({});
  const [participantMedia, setParticipantMedia] = useState({});
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [media, setMedia] = useState({ mic: true, cam: true });

  const isHost = useMemo(() => {
    if (!user || !meetingInfo?.host?._id) return false;
    return String(meetingInfo.host._id) === String(user._id);
  }, [meetingInfo, user]);
  const {
    localStream,
    remoteStreams,
    startLocalStream,
    getLocalStream,
    createPeerConnection,
    handleRoomUsers,
    beginScreenShare,
    endScreenShare,
    removeRemotePeer,
    peerConnections,
  } = useWebRTC(socket, roomId, user);

  const isLocalScreenSharing = screenSharingSocketId === socket?.id;

  useEffect(() => {
    screenSharingSocketIdRef.current = screenSharingSocketId;
  }, [screenSharingSocketId]);

  const pushToast = useCallback((message, type = "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const broadcastMediaState = useCallback(
    (nextMedia) => {
      if (!socket?.connected || !roomId) return;
      socket.emit("media-state-changed", { roomId, cam: nextMedia.cam, mic: nextMedia.mic });
    },
    [roomId, socket]
  );

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
    const el = localVideoRef.current;
    if (!el || !localStream) return;
    if (isLocalScreenSharing) {
      el.srcObject = null;
      return;
    }
    if (el.srcObject !== localStream) el.srcObject = localStream;
    el.play().catch(() => {});
  }, [isLocalScreenSharing, localStream, media.cam, screenSharingSocketId]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = media.mic;
    });
  }, [localStream, media.mic]);

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
    const onRoomUsers = (entries) => {
      const next = {};
      entries.forEach(([socketId, participant]) => {
        next[socketId] = participant;
      });
      setParticipants(next);
      handleRoomUsers(entries);
    };

    socket.on("room-users", onRoomUsers);
    socket.on("user-joined", ({ socketId, user: joinedUser }) => {
      setParticipants((prev) => ({ ...prev, [socketId]: joinedUser }));
    });
    socket.on("user-left", ({ socketId: leftId }) => {
      removeRemotePeer(leftId);
      setParticipants((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
      setParticipantMedia((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
      setScreenSharingSocketId((current) => {
        if (current === leftId) setScreenSharingBy(null);
        return current === leftId ? null : current;
      });
    });
    socket.on("media-state-changed", ({ socketId: fromId, cam, mic }) => {
      setParticipantMedia((prev) => ({ ...prev, [fromId]: { cam, mic } }));
    });
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
    socket.on("screen-share-start", ({ user: u, socketId: sharerId }) => {
      if (!sharerId) return;
      setScreenSharingSocketId(sharerId);
      setScreenSharingBy(u?.name || "Someone");
    });
    socket.on("screen-share-stop", ({ socketId: sharerId }) => {
      if (!sharerId) return;
      setScreenSharingSocketId((current) => {
        if (current === sharerId) {
          setScreenSharingBy(null);
          return null;
        }
        return current;
      });
    });
    socket.on("room-media-states", (states) => {
      if (states && typeof states === "object") {
        setParticipantMedia((prev) => ({ ...prev, ...states }));
      }
    });
    return () => {
      socket.off("room-users", onRoomUsers);
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("media-state-changed");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("poll-update");
      socket.off("receive-reaction");
      socket.off("screen-share-start");
      socket.off("screen-share-stop");
      socket.off("room-media-states");
    };
  }, [createPeerConnection, handleRoomUsers, localStream, peerConnections, removeRemotePeer, socket, startLocalStream]);

  useEffect(() => {
    if (!socket?.connected || !roomId) return;
    broadcastMediaState(media);
  }, [broadcastMediaState, media, roomId, socket?.connected]);

  const toggleMic = async () => {
    let stream = getLocalStream();
    if (!stream) {
      try {
        stream = await startLocalStream();
      } catch {
        pushToast("Microphone access is required to use the mic.");
        return;
      }
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      pushToast("No microphone found on this device.");
      return;
    }

    setMedia((prev) => {
      const enabled = !prev.mic;
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });
      return { ...prev, mic: enabled };
    });
  };

  const toggleCam = () => {
    if (!localStream || isLocalScreenSharing) return;
    const enabled = !media.cam;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    setMedia((p) => ({ ...p, cam: enabled }));
  };

  const stopScreenShare = useCallback(async () => {
    if (screenSharingSocketIdRef.current !== socket?.id || stoppingShareRef.current) return;
    stoppingShareRef.current = true;
    try {
      await endScreenShare(media.cam);
      setScreenSharingSocketId(null);
      setScreenSharingBy(null);
      socket?.emit("screen-share-stop", { roomId, user });
    } finally {
      stoppingShareRef.current = false;
    }
  }, [endScreenShare, media.cam, roomId, socket, user]);

  const startScreenShare = async () => {
    if (isLocalScreenSharing) {
      await stopScreenShare();
      return;
    }
    try {
      await startLocalStream();
      const display = await requestScreenShare();
      const track = display.getVideoTracks()[0];
      if (!track) {
        pushToast("No screen capture track available.");
        return;
      }

      const surface = getDisplaySurface(track);
      const tip = getLoopPreventionTip(surface);
      if (tip) pushToast(tip, "info");

      beginScreenShare(track);
      setScreenSharingSocketId(socket.id);
      setScreenSharingBy(user.name || "You");
      socket.emit("screen-share-start", { roomId, user });

      track.addEventListener("ended", () => {
        if (screenSharingSocketIdRef.current === socket.id) stopScreenShare();
      });
    } catch (error) {
      pushToast("Screen sharing could not start.");
    }
  };

  if (!user) return <div className="p-6">Please login to join meeting.</div>;

  return (
    <div className="relative flex h-[calc(100vh-57px)] flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <p className="text-sm text-slate-300">Room: {roomId}</p>
            <button onClick={() => setShowPoll((p) => !p)} className="rounded bg-slate-800 px-3 py-1 text-xs">Poll</button>
          </div>
          {screenSharingBy && !isLocalScreenSharing && (
            <p className="shrink-0 px-3 pb-1 text-xs text-cyan-300 transition-opacity duration-300">
              {screenSharingBy} is sharing screen
            </p>
          )}
          <div className="min-h-0 flex-1">
            <VideoGrid
              localVideoRef={localVideoRef}
              remoteStreams={remoteStreams}
              participants={participants}
              localUser={user}
              socketId={socket?.id}
              media={media}
              participantMedia={participantMedia}
              screenSharingSocketId={screenSharingSocketId}
              isLocalScreenSharing={isLocalScreenSharing}
            />
          </div>
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
          <button onClick={startScreenShare} className="rounded bg-slate-800 px-3 py-2 text-sm">
            {isLocalScreenSharing ? "Stop Share" : "Share Screen"}
          </button>
          <button onClick={() => setShowBoard((b) => !b)} className="rounded bg-slate-800 px-3 py-2 text-sm">Whiteboard</button>
        </div>
        <ReactionBar onSend={(reaction) => socket.emit("send-reaction", { roomId, reaction, sender: user.name })} />
        <button onClick={() => navigate("/")} className="rounded bg-red-600 px-3 py-2 text-sm">
          End Call
        </button>
      </div>

      <Whiteboard socket={socket} roomId={roomId} open={showBoard} onClose={() => setShowBoard(false)} />

      <div className="pointer-events-none absolute inset-0">
        {!isLocalScreenSharing &&
          floatingReactions.map((r, idx) => (
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
