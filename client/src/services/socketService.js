import { io } from "socket.io-client";
import { API_URL } from "../config/constants";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.autoReconnect = true;
  }

  /**
   * Initialize the socket connection to the server
   */
  init() {
    if (this.socket && this.socket.connected) {
      console.log("Socket already connected");
      this._triggerListeners("connection_status", { connected: true });
      return;
    }

    // Clean up existing socket if it exists but isn't connected
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log("Initializing socket connection to:", API_URL);

    // Get authentication token if available
    const authToken = localStorage.getItem("auth_token");
    console.log("Socket auth token available:", !!authToken);

    // Connect to the WebSocket server (use the same URL as the API)
    this.socket = io(API_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      transports: ["websocket", "polling"],
      auth: {
        token: authToken,
      },
      query: {
        token: authToken,
      },
      extraHeaders: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
    });

    console.log("Socket options configured:", {
      withCredentials: true,
      url: API_URL,
      reconnection: true,
      transports: ["websocket", "polling"],
      authAvailable: !!authToken,
    });

    // Setup event listeners
    this.socket.on("connect", () => {
      console.log("WebSocket connected successfully");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._triggerListeners("connection_status", { connected: true });

      // Clear any reconnect timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
      this.isConnected = false;
      this._triggerListeners("connection_status", { connected: false, error });

      // Attempt reconnection with a slight delay if not already reconnecting
      if (this.autoReconnect && !this.reconnectTimer) {
        this.scheduleReconnect();
      }
    });

    this.socket.on("connect_timeout", (timeout) => {
      console.error("WebSocket connection timeout:", timeout);
      this.isConnected = false;
      this._triggerListeners("connection_status", {
        connected: false,
        reason: "timeout",
      });
    });

    this.socket.on("connect_success", (data) => {
      console.log("WebSocket connect success:", data);
      this._triggerListeners("connect_success", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      this.isConnected = false;
      this._triggerListeners("connection_status", { connected: false, reason });

      // Attempt to reconnect for certain disconnection reasons
      if (
        this.autoReconnect &&
        !this.reconnectTimer &&
        reason !== "io client disconnect" &&
        reason !== "io server disconnect"
      ) {
        console.log("Scheduling reconnection after disconnect...");
        this.scheduleReconnect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this._triggerListeners("connection_status", { connected: true });
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      // Final connection status update
      this._triggerListeners("connection_status", {
        connected: false,
        error: "Maximum reconnection attempts reached",
      });
    });

    this.socket.on("auth_error", (data) => {
      console.error("WebSocket authentication error:", data);
      this._triggerListeners("auth_error", data);
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      this._triggerListeners("error", error);
    });

    // Setup event listeners for application-specific events
    this.socket.on("notification", (data) => {
      console.log("Notification received:", data);
      this._triggerListeners("notification", data);
    });

    this.socket.on("trade_update", (data) => {
      console.log("Trade update received:", data);
      this._triggerListeners("trade_update", data);
    });

    this.socket.on("market_update", (data) => {
      console.log("Market update received:", data);
      this._triggerListeners("market_update", data);
    });

    this.socket.on("inventory_update", (data) => {
      console.log("Inventory update received:", data);
      this._triggerListeners("inventory_update", data);
    });

    this.socket.on("wallet_update", (data) => {
      console.log("Wallet update received:", data);
      this._triggerListeners("wallet_update", data);
    });

    // Initial connection status (pre-connection)
    this._triggerListeners("connection_status", {
      connected: false,
      connecting: true,
    });
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached");
      this._triggerListeners("connection_status", {
        connected: false,
        error: "Maximum reconnection attempts reached",
      });
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    console.log(
      `Scheduling reconnect in ${delay}ms (attempt ${
        this.reconnectAttempts + 1
      }/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      if (this.socket) {
        this.socket.connect();
      } else {
        this.init();
      }
      this.reconnectTimer = null;
    }, delay);
  }

  /**
   * Reconnect to the WebSocket server
   */
  reconnect() {
    // Force a reconnection
    this.disconnect();

    // Reset reconnect attempts to ensure we get a full set of retries
    this.reconnectAttempts = 0;

    // Schedule an immediate reconnect
    setTimeout(() => {
      console.log("Manual reconnection initiated");
      this.init();
    }, 100);
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    // Cancel any pending reconnects
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disable auto reconnect temporarily
    this.autoReconnect = false;

    if (this.socket) {
      console.log("Disconnecting socket");
      this.socket.disconnect();
      this.isConnected = false;
      // Update connection status immediately
      this._triggerListeners("connection_status", {
        connected: false,
        reason: "manual disconnect",
      });
    }

    // Re-enable auto reconnect after a short delay
    setTimeout(() => {
      this.autoReconnect = true;
    }, 1000);
  }

  /**
   * Add an event listener for a specific event
   * @param {string} event - The event name to listen for
   * @param {Function} callback - The callback function when event is triggered
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Check if the socket is currently connected
   * @returns {boolean} Connection status
   */
  isSocketConnected() {
    return this.isConnected;
  }

  /**
   * Trigger all registered callbacks for an event
   * @param {string} event - The event name
   * @param {any} data - The data to pass to the callbacks
   * @private
   */
  _triggerListeners(event, data) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
