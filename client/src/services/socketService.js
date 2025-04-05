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
    this.apiUrl = null;
  }

  connect() {
    try {
      if (this.socket) {
        console.log("[SocketService] Socket already exists, reconnecting...");
        this.socket.connect();
        return;
      }

      console.log(
        "[SocketService] Attempting to connect to socket server:",
        this.apiUrl
      );

      // Get token from localStorage (check both formats for backward compatibility)
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("auth_token");

      // Set up connection options
      const options = {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      };

      // Add auth query parameters if token exists
      if (token) {
        console.log(
          "[SocketService] Using token from localStorage:",
          "Token exists"
        );
        options.query = { token };
      }

      // Connect to the socket server
      this.socket = io(this.apiUrl, options);

      // Set up event handlers
      this.setupEventHandlers();
    } catch (error) {
      console.error("[SocketService] Connection error:", error);
    }
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

  setupEventHandlers() {
    if (!this.socket) return;

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

      // Emit connection status update
      this.emit("connection_status", {
        connected: true,
        connecting: false,
        error: null,
      });
    });

    this.socket.on("connect_error", (error) => {
      console.error("[SocketService] Connection error:", error);
      this.handleConnectionFailure(error);

      // Emit connection status update
      this.emit("connection_status", {
        connected: false,
        connecting: false,
        error: error.message || "Connection error",
      });
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

      // Emit connection status update
      this.emit("connection_status", {
        connected: false,
        connecting: reason !== "io client disconnect",
        error: null,
      });

      // Handle disconnect reason
      if (reason === "io server disconnect") {
        // Server disconnected the client, need to reconnect manually
        this.scheduleReconnect();
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[SocketService] Reconnection attempt #${attemptNumber}`);

      // Emit connection status update
      this.emit("connection_status", {
        connected: false,
        connecting: true,
        error: null,
        attemptNumber,
      });
    });

    this.socket.on("reconnect_failed", () => {
      console.error("[SocketService] Failed to reconnect after max attempts");
      this.handleConnectionFailure({ message: "Reconnection failed" });

      // Emit connection status update
      this.emit("connection_status", {
        connected: false,
        connecting: false,
        error: "Failed to reconnect after max attempts",
      });
    });
  }

  initializeSocket(token = null) {
    // If we haven't initialized yet, save the API URL
    if (!this.apiUrl) {
      this.apiUrl = API_URL;
    }

    // Get token from parameter, localStorage.authToken, or localStorage.auth_token
    const authToken =
      token ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("auth_token");

    if (authToken) {
      console.log("[SocketService] Initializing socket with auth token");

      // Store token for reconnections
      if (token) {
        localStorage.setItem("authToken", token);
      }

      // If already connected, disconnect first to reconnect with token
      if (this.isConnected()) {
        console.log(
          "[SocketService] Already connected, disconnecting to reconnect with token"
        );
        this.disconnect();
      }

      // Then connect with the token
      this.connect();
    } else {
      console.log("[SocketService] Initializing socket without auth token");
      this.connect();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
