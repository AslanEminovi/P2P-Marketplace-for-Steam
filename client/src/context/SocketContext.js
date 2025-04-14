import React, { createContext } from "react";
import socketService from "../services/socketService";

// Export the socket instance
export const socket = socketService.socket;

// Create a Socket Context
export const SocketContext = createContext({
  socket,
  connected: false,
  setConnected: () => {},
});

export default SocketContext;
