import io from "socket.io-client";
import { API_URL } from "../config/constants";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.events = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.handlers = {
      onConnect: new Set(),
      onDisconnect: new Set(),
      onReconnect: new Set(),
      onError: new Set(),
    };
  }

  init() {
    if (this.socket) {
      console.log("[SocketService] Socket already initialized");
      return;
    }

    const token = localStorage.getItem("auth_token");
    console.log(
      "[SocketService] Initializing with token:",
      token ? "Present" : "None"
    );

    this.socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      query: token ? { token } : {},
      auth: {
        token,
      },
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Connection events
    this.socket.on("connect", () => {
      console.log("[SocketService] Connected to server");
      this.connected = true;
      this.reconnectAttempts = 0;
      this.handlers.onConnect.forEach((handler) => handler());

      // Authenticate after connection
      const token = localStorage.getItem("auth_token");
      if (token) {
        this.socket.emit("authenticate", { token });
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[SocketService] Disconnected:", reason);
      this.connected = false;
      this.handlers.onDisconnect.forEach((handler) => handler(reason));
    });

    this.socket.on("connect_error", (error) => {
      console.error("[SocketService] Connection error:", error);
      this.handlers.onError.forEach((handler) => handler(error));
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "[SocketService] Reconnected after",
        attemptNumber,
        "attempts"
      );
      this.handlers.onReconnect.forEach((handler) => handler(attemptNumber));
    });

    // Authentication events
    this.socket.on("auth_error", (error) => {
      console.error("[SocketService] Authentication error:", error);
      this.handlers.onError.forEach((handler) => handler(error));
    });

    this.socket.on("connection_established", (data) => {
      console.log("[SocketService] Connection established:", data);
    });

    // Trade events
    this.socket.on("trade_update", (data) => {
      console.log("[SocketService] Trade update received:", data);
      this.emit("trade_update", data);
    });

    // Marketplace events
    this.socket.on("marketplace_update", (data) => {
      console.log("[SocketService] Marketplace update received:", data);
      this.emit("marketplace_update", data);
    });

    // User status events
    this.socket.on("user_status", (data) => {
      console.log("[SocketService] User status update:", data);
      this.emit("user_status", data);
    });

    // Notification events
    this.socket.on("notification", (data) => {
      console.log("[SocketService] Notification received:", data);
      this.emit("notification", data);
    });
  }

  // Room management
  joinTradeRoom(tradeId) {
    if (this.isConnected()) {
      console.log("[SocketService] Joining trade room:", tradeId);
      this.socket.emit("join_trade", tradeId);
    }
  }

  leaveTradeRoom(tradeId) {
    if (this.isConnected()) {
      console.log("[SocketService] Leaving trade room:", tradeId);
      this.socket.emit("leave_trade", tradeId);
    }
  }

  joinMarketplace() {
    if (this.isConnected()) {
      console.log("[SocketService] Joining marketplace room");
      this.socket.emit("join_marketplace");
    }
  }

  // Event handling
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => callback(data));
    }
  }

  // Connection management
  addConnectionHandler(type, handler) {
    if (this.handlers[type]) {
      this.handlers[type].add(handler);
      return () => this.handlers[type].delete(handler);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  reconnect() {
    this.disconnect();
    this.init();
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
