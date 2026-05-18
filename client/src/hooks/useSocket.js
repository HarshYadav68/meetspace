import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.DEV) return window.location.origin;
  return import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
};

const useSocket = (enabled = true) => {
  const [connected, setConnected] = useState(false);

  const socket = useMemo(() => {
    if (!enabled) return null;
    return io(getSocketUrl(), {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
  }, [enabled]);

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return;
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    setConnected(socket.connected);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  return { socket, connected };
};

export default useSocket;
