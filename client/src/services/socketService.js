import io from "socket.io-client";
import { API_URL } from "../config/constants";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connectionEvents = new Map();
    this.events = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.connectedCallback = null;
    this.disconnectedCallback = null;
  }

  connect(token = null) {
    console.log(
      "[SocketService] Attempting to connect to socket server:",
      API_URL
    );

    // If we already have a socket, don't create a new one
    if (this.socket && this.socket.connected) {
      console.log(
        "[SocketService] Socket already connected, skipping connection"
      );
      return this.socket;
    }

    // If we have a socket but it's not connected, disconnect it first
    if (this.socket) {
      console.log(
        "[SocketService] Socket exists but not connected, disconnecting first"
      );
      this.disconnect();
    }

    // Get token from localStorage if not provided
    if (!token) {
      token = localStorage.getItem("auth_token");
      console.log(
        "[SocketService] Using token from localStorage:",
        token ? "Token exists" : "No token"
      );
    }

    // Initialize socket connection with auth token
    this.socket = io(API_URL, {
      query: token ? { token } : {},
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true, // Force a new connection
    });

    // Setup connection event handlers
    this.socket.on("connect", () => {
      console.log("[SocketService] Connected to socket server!");
      this.connected = true;
      this.reconnectAttempts = 0;

      if (this.connectedCallback) {
        this.connectedCallback();
      }

      // Re-register all event listeners after reconnection
      this.rebindEvents();
    });

    this.socket.on("connect_error", (error) => {
      console.error("[SocketService] Connection error:", error);
      this.handleConnectionFailure();
    });

    this.socket.on("disconnect", (reason) => {
      console.log(
        "[SocketService] Disconnected from socket server, reason:",
        reason
      );
      this.connected = false;

      if (this.disconnectedCallback) {
        this.disconnectedCallback();
      }

      // Handle disconnect reason
      if (reason === "io server disconnect") {
        // Server disconnected the client, need to reconnect manually
        this.scheduleReconnect();
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[SocketService] Reconnection attempt #${attemptNumber}`);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("[SocketService] Failed to reconnect after max attempts");
      this.handleConnectionFailure();
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log("[SocketService] Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  reconnect() {
    console.log("[SocketService] Manual reconnect requested");

    // If we already have a connected socket, don't reconnect
    if (this.socket && this.socket.connected) {
      console.log(
        "[SocketService] Socket already connected, skipping reconnect"
      );
      return;
    }

    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Get the latest token in case it was updated
    const token = localStorage.getItem("auth_token");
    this.connect(token);
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[SocketService] Max reconnect attempts reached");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    console.log(
      `[SocketService] Scheduling reconnect in ${delay}ms (attempt ${
        this.reconnectAttempts + 1
      }/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, delay);
  }

  handleConnectionFailure() {
    this.connected = false;

    if (this.disconnectedCallback) {
      this.disconnectedCallback();
    }

    this.scheduleReconnect();
  }

  onConnected(callback) {
    this.connectedCallback = callback;
    return this;
  }

  onDisconnected(callback) {
    this.disconnectedCallback = callback;
    return this;
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);

    // If socket exists, bind immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }

    return this;
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);

      if (index !== -1) {
        callbacks.splice(index, 1);

        if (this.socket) {
          this.socket.off(event, callback);
        }
      }

      if (callbacks.length === 0) {
        this.events.delete(event);
      }
    }

    return this;
  }

  emit(event, data, callback) {
    if (!this.socket || !this.connected) {
      console.warn(
        `[SocketService] Cannot emit '${event}' - socket not connected`
      );
      return false;
    }

    console.log(`[SocketService] Emitting event: ${event}`, data);
    this.socket.emit(event, data, callback);
    return true;
  }

  rebindEvents() {
    // Re-attach all event listeners
    this.events.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        console.log(`[SocketService] Rebinding event: ${event}`);
        this.socket.on(event, callback);
      });
    });
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
