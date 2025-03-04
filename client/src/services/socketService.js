import { io } from "socket.io-client";
import { API_URL } from "../config/constants";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize the socket connection to the server
   */
  init() {
    if (this.socket) {
      console.log("Socket already initialized");
      return;
    }

    // Connect to the WebSocket server (use the same URL as the API)
    this.socket = io(API_URL, {
      withCredentials: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Setup event listeners
    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._triggerListeners("connection_status", { connected: true });
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this._triggerListeners("connection_status", { connected: false, error });
    });

    this.socket.on("connect_success", (data) => {
      console.log("WebSocket connect success:", data);
      this._triggerListeners("connect_success", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      this.isConnected = false;
      this._triggerListeners("connection_status", { connected: false, reason });
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
  }

  /**
   * Reconnect to the WebSocket server
   */
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      if (this.socket) {
        this.socket.connect();
      } else {
        this.init();
      }
    } else {
      console.error("Maximum reconnection attempts reached");
      this._triggerListeners("connection_status", {
        connected: false,
        error: "Maximum reconnection attempts reached",
      });
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
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
