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
    this.lastConnectionAttempt = 0;
    this.lastForcedRefresh = null;
    this.socketDebug = true; // Enable debug logging
  }

  init() {
    if (this.socketDebug) console.log("[SocketService] Initializing service");
    // Just initialize the service, don't connect yet
    return this;
  }

  connect(token = null) {
    const now = Date.now();
    // Prevent rapid connection attempts (throttle to once per second)
    if (now - this.lastConnectionAttempt < 1000) {
      if (this.socketDebug)
        console.log("[SocketService] Connection attempt throttled");
      return this.socket;
    }

    this.lastConnectionAttempt = now;

    if (this.socketDebug)
      console.log(
        "[SocketService] Attempting to connect to socket server:",
        API_URL
      );

    // If we already have a socket, don't create a new one
    if (this.socket && this.socket.connected) {
      if (this.socketDebug)
        console.log(
          "[SocketService] Socket already connected, skipping connection"
        );
      this.connected = true;
      return this.socket;
    }

    // If we have a socket but it's not connected, disconnect it first
    if (this.socket) {
      if (this.socketDebug)
        console.log(
          "[SocketService] Socket exists but not connected, disconnecting first"
        );
      this.disconnect();
    }

    // Get token from localStorage if not provided
    if (!token) {
      token = localStorage.getItem("auth_token");
      if (this.socketDebug)
        console.log(
          "[SocketService] Using token from localStorage:",
          token ? "Token exists" : "No token"
        );
    }

    // Initialize socket connection with auth token
    try {
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
        if (this.socketDebug)
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
        if (this.socketDebug)
          console.log(
            "[SocketService] Disconnected from socket server, reason:",
            reason
          );
        this.connected = false;

        if (this.disconnectedCallback) {
          this.disconnectedCallback();
        }

        // Handle disconnect reason
        if (reason === "io server disconnect" || reason === "transport close") {
          // Server disconnected the client, need to reconnect manually
          this.scheduleReconnect();
        }
      });

      this.socket.on("reconnect_attempt", (attemptNumber) => {
        if (this.socketDebug)
          console.log(`[SocketService] Reconnection attempt #${attemptNumber}`);
      });

      this.socket.on("reconnect_failed", () => {
        console.error("[SocketService] Failed to reconnect after max attempts");
        this.handleConnectionFailure();
      });

      return this.socket;
    } catch (error) {
      console.error("[SocketService] Error during socket creation:", error);
      this.connected = false;
      this.socket = null;
      this.scheduleReconnect();
      return null;
    }
  }

  rebindEvents() {
    if (this.socketDebug)
      console.log("[SocketService] Rebinding events after reconnection");

    // First make sure the map exists and has events
    if (!this.events || this.events.size === 0) {
      if (this.socketDebug) console.log("[SocketService] No events to rebind");
      return;
    }

    // For each event, rebind all handlers
    for (const [event, handlers] of this.events.entries()) {
      if (handlers && handlers.length > 0) {
        if (this.socketDebug)
          console.log(
            `[SocketService] Rebinding ${handlers.length} handlers for event: ${event}`
          );

        for (const handler of handlers) {
          this.socket.on(event, handler);
        }
      }
    }
  }

  // Register an event handler
  on(event, callback) {
    if (!this.socket) {
      if (this.socketDebug)
        console.log(
          `[SocketService] Queuing ${event} event for when socket connects`
        );

      // Initialize the array for this event if it doesn't exist
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }

      // Add callback to the queue
      this.events.get(event).push(callback);

      // Connect to ensure we're listening
      this.connect();
      return;
    }

    // If we already have the socket, add the event directly
    if (this.socketDebug)
      console.log(`[SocketService] Adding handler for ${event} event`);

    // Initialize the array for this event if it doesn't exist
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    // Add to our tracking array
    this.events.get(event).push(callback);

    // Add to socket
    this.socket.on(event, callback);
  }

  // Remove an event handler
  off(event, callback = null) {
    if (!this.socket) {
      if (this.socketDebug)
        console.log(
          `[SocketService] No socket to remove ${event} handler from`
        );

      // But still clean up our queued events
      if (callback && this.events.has(event)) {
        const handlers = this.events.get(event);
        const index = handlers.indexOf(callback);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      } else if (!callback) {
        this.events.delete(event);
      }

      return;
    }

    if (this.socketDebug)
      console.log(`[SocketService] Removing handler for ${event} event`);

    // If a specific callback was provided, remove just that one
    if (callback && this.events.has(event)) {
      const handlers = this.events.get(event);
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.socket.off(event, callback);
      }
    } else {
      // Remove all handlers for this event
      this.events.delete(event);
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (!this.socket || !this.connected) {
      if (this.socketDebug)
        console.log(
          `[SocketService] Cannot emit ${event}, socket not connected`
        );
      return false;
    }

    if (this.socketDebug)
      console.log(`[SocketService] Emitting ${event} event:`, data);
    this.socket.emit(event, data);
    return true;
  }

  disconnect() {
    if (this.socket) {
      if (this.socketDebug) console.log("[SocketService] Disconnecting socket");
      try {
        this.socket.disconnect();
      } catch (err) {
        console.error("[SocketService] Error during disconnect:", err);
      }
      this.socket = null;
      this.connected = false;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  reconnect() {
    if (this.socketDebug)
      console.log("[SocketService] Manual reconnect requested");

    // Throttle reconnection attempts to prevent excessive requests
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 3000) {
      // 3 seconds throttle
      if (this.socketDebug)
        console.log(
          "[SocketService] Reconnect throttled - attempting too frequently"
        );
      return;
    }

    // If we already have a connected socket, don't reconnect
    if (this.socket && this.socket.connected) {
      if (this.socketDebug)
        console.log(
          "[SocketService] Socket already connected, skipping reconnect"
        );
      this.connected = true;
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
      // Even at max attempts, we should try one more time after a longer delay
      const finalAttemptDelay = 10000; // 10 seconds
      if (this.socketDebug)
        console.log(
          `[SocketService] Scheduling final reconnect attempt in ${finalAttemptDelay}ms`
        );

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts = 0; // Reset counter for the final attempt
        this.reconnect();
      }, finalAttemptDelay);

      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Progressive backoff for reconnection
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    if (this.socketDebug)
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
    // Allow removing the callback by passing null
    if (callback === null) {
      this.connectedCallback = null;
      return this;
    }

    // Only set the callback if it's not already set to avoid duplicates
    if (!this.connectedCallback || this.connectedCallback !== callback) {
      this.connectedCallback = callback;

      // If already connected, call the callback immediately but only do it once
      if (this.connected && this.socket && this.socket.connected) {
        // Use a delay to ensure we don't create infinite loops
        setTimeout(callback, 0);
      }
    }

    return this;
  }

  onDisconnected(callback) {
    // Allow removing the callback by passing null
    if (callback === null) {
      this.disconnectedCallback = null;
      return this;
    }

    // Only set the callback if it's not already set to avoid duplicates
    if (!this.disconnectedCallback || this.disconnectedCallback !== callback) {
      this.disconnectedCallback = callback;
    }

    return this;
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  // For testing purposes - emit a market activity
  emitTestActivity() {
    if (this.socket && this.isConnected()) {
      if (this.socketDebug) console.log("Emitting test activity request");
      this.emit("request_test_activity", {});
    } else {
      console.warn("Socket not connected, cannot emit test activity");
    }
  }
}

// Create singleton instance
const socketService = new SocketService().init();

export default socketService;
