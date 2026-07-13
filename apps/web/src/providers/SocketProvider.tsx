"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { type Socket, io } from "socket.io-client";

import { useAuth } from "@/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Sockets server matches API server origin
    const socketUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "")
      : "http://localhost:4000";

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
    });

    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.disconnect();
    };
  }, []);

  // Connect only when user is authenticated
  useEffect(() => {
    if (socket) {
      if (user && accessToken) {
        socket.auth = { token: accessToken };
        socket.connect();
        socket.emit("join-user", user.id);
      } else {
        socket.disconnect();
      }
    }
  }, [socket, user, accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}
