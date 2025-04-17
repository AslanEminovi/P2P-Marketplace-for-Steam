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
    this.forceReconnectInterval = 30000; // 30 seconds
    this.lastSuccessfulConnection = null;
    this.connectionCheckTimer = null;
    this.isBrowserTabActive = true;
    this.heartbeatInterval = null;
    this.heartbeatDelay = 60000; // Increasing from 15 seconds to 60 seconds (1 minute)
    this.currentPage = "other"; // Default to 'other' instead of marketplace
    this.visibilityHandler = null; // For handling visibility changes
  }

  init() {
    console.log("[SocketService] Initializing service");

    // Setup tab visibility listener
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange.bind(this)
      );
    }

    // Start periodic connection checking
    this.startConnectionCheck();

    // Start the reliable heartbeat system
    this.setupReliableHeartbeat();

    return this;
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      console.log("[SocketService] Tab became visible, checking connection");
      this.isBrowserTabActive = true;

      // When tab becomes visible, check if we need to reconnect
      if (!this.isConnected()) {
        this.reconnect();
      }
    } else {
      console.log("[SocketService] Tab became hidden");
      this.isBrowserTabActive = false;
    }
  }

  startConnectionCheck() {
    // Clear existing timer if any
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
    }

    // Check connection periodically
    this.connectionCheckTimer = setInterval(() => {
      // Only check if the tab is active to avoid unnecessary reconnections
      if (this.isBrowserTabActive) {
        if (this.socket) {
          if (!this.socket.connected) {
            console.log(
              "[SocketService] Detected disconnected socket during periodic check"
            );
            this.reconnect();
          }
        } else if (localStorage.getItem("auth_token")) {
          // We have an auth token but no socket, try to connect
          console.log(
            "[SocketService] No socket but auth token exists, attempting connection"
          );
          this.connect();
        }
      }
    }, this.forceReconnectInterval);
  }

  connect(token = null) {
    const now = Date.now();
    // Prevent rapid connection attempts (throttle to once per second)
    if (now - this.lastConnectionAttempt < 1000) {
      console.log("[SocketService] Connection attempt throttled");
      return this.socket;
    }

    this.lastConnectionAttempt = now;

    console.log(
      "[SocketService] Attempting to connect to socket server:",
      API_URL
    );

    // If we already have a socket, don't create a new one
    if (this.socket && this.socket.connected) {
      console.log(
        "[SocketService] Socket already connected, skipping connection"
      );
      this.connected = true;

      // Still ensure subscriptions are active
      this.subscribeToUserStatuses();

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
      token =
        localStorage.getItem("auth_token") || localStorage.getItem("token");
      console.log(
        "[SocketService] Using token from localStorage:",
        token ? "Token exists" : "No token"
      );
    }

    if (!token) {
      console.warn(
        "[SocketService] No auth token found, will connect as anonymous"
      );
    }

    // Initialize socket connection with auth token
    try {
      // Log the API URL for debugging
      console.log(`[SocketService] Connecting to: ${API_URL}`);

      // Log token format without exposing contents
      if (token) {
        const tokenStart = token.substring(0, 5);
        const tokenEnd = token.substring(token.length - 5);
        console.log(
          `[SocketService] Token format check: ${tokenStart}...${tokenEnd}, length: ${token.length}`
        );
      }

      this.socket = io(API_URL, {
        auth: token ? { token } : {},
        query: token ? { token } : {}, // Add token to query params too for fallback
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
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

        // If connection is successful, update the last successful connection time
        this.lastSuccessfulConnection = Date.now();

        // Notify the server about our user status subscription needs
        this.subscribeToUserStatuses();

        // Send current page information
        this.emit("page_view", { page: this.currentPage });

        // Start sending heartbeats to maintain the connection
        this.startHeartbeat();
      });

      this.socket.on("connect_error", (error) => {
        console.error("[SocketService] Connection error:", error.message);
        console.error("[SocketService] Connection error details:", error);
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
        if (reason === "io server disconnect" || reason === "transport close") {
          // Server disconnected the client, need to reconnect manually
          this.scheduleReconnect();
        }
      });

      this.socket.on("error", (error) => {
        console.error("[SocketService] Socket error:", error);
        this.connected = false;
      });

      this.socket.on("reconnect_attempt", (attemptNumber) => {
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

  disconnect() {
    if (this.socket) {
      console.log("[SocketService] Disconnecting socket");

      // Stop the heartbeat system first
      this.stopHeartbeat();

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

    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
      this.connectionCheckTimer = null;
    }

    // Clean up resubscription intervals
    Object.keys(this).forEach((key) => {
      if (key.startsWith("resubscribe_") && this[key]) {
        clearInterval(this[key]);
        delete this[key];
      }
    });
  }

  reconnect() {
    console.log("[SocketService] Manual reconnect requested");

    // Throttle reconnection attempts to prevent excessive requests
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 3000) {
      // 3 seconds throttle
      console.log(
        "[SocketService] Reconnect throttled - attempting too frequently"
      );
      return;
    }

    // Always disconnect existing socket first to ensure a clean reconnection
    if (this.socket) {
      try {
        console.log(
          "[SocketService] Cleaning up existing socket connection before reconnect"
        );
        this.socket.disconnect();
        this.socket = null;
      } catch (error) {
        console.error(
          "[SocketService] Error during disconnect before reconnect:",
          error
        );
      }
    }

    // Reset connection state
    this.connected = false;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reset reconnection parameters
    this.reconnectAttempts = 0;
    this.lastConnectionAttempt = now;

    // Attempt to connect with current auth token
    console.log(
      "[SocketService] Attempting reconnection with fresh connection"
    );
    this.connect();

    // Start heartbeat to maintain connection
    this.startHeartbeat();
  }

  scheduleReconnect() {
    // Don't schedule another reconnect if one is already pending
    if (this.reconnectTimer) {
      console.log("[SocketService] Reconnect already scheduled, skipping");
      return;
    }

    // Calculate delay with exponential backoff up to 30 seconds
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(
      `[SocketService] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      console.log("[SocketService] Executing scheduled reconnect");
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  handleConnectionFailure() {
    console.log("[SocketService] Handling connection failure");
    this.connected = false;

    // If we've exceeded max attempts, notify the user
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[SocketService] Max reconnection attempts reached, giving up"
      );
      return;
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
        setTimeout(() => {
          if (this.connectedCallback === callback) {
            callback();
          }
        }, 100);
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

        // If unsubscribing from userStatusUpdate, clear any resubscription intervals
        if (event === "userStatusUpdate") {
          // Clean up all resubscription intervals
          Object.keys(this).forEach((key) => {
            if (key.startsWith("resubscribe_") && this[key]) {
              clearInterval(this[key]);
              delete this[key];
            }
          });
        }
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

  // Subscribe to all stored user statuses
  subscribeToUserStatuses() {
    if (!this.isConnected()) return;

    try {
      // Get subscribed user IDs from local storage if any
      const subscribedUsers = JSON.parse(
        localStorage.getItem("subscribed_user_statuses") || "[]"
      );

      if (subscribedUsers.length > 0) {
        console.log(
          `[SocketService] Resubscribing to ${subscribedUsers.length} user statuses`
        );

        // Re-subscribe to each user status
        subscribedUsers.forEach((userId) => {
          this.emit("subscribeToUserStatus", { userId });
        });
      }
    } catch (error) {
      console.error(
        "[SocketService] Error resubscribing to user statuses:",
        error
      );
    }
  }

  // Enhanced subscription method for user status
  subscribeToUserStatus(userId) {
    if (!userId) return;

    try {
      // Get current subscriptions
      const subscribedUsers = JSON.parse(
        localStorage.getItem("subscribed_user_statuses") || "[]"
      );

      // Add if not already there
      if (!subscribedUsers.includes(userId)) {
        subscribedUsers.push(userId);
        localStorage.setItem(
          "subscribed_user_statuses",
          JSON.stringify(subscribedUsers)
        );
      }

      // Always try to reconnect if not connected
      if (!this.isConnected()) {
        console.log(
          `[SocketService] Not connected, trying to reconnect to subscribe to user ${userId}`
        );
        this.reconnect();

        // Schedule a retry after connection attempt
        setTimeout(() => {
          if (this.isConnected()) {
            console.log(
              `[SocketService] Reconnected, now subscribing to user ${userId}`
            );
            this.emit("subscribeToUserStatus", { userId });
          } else {
            console.warn(
              `[SocketService] Failed to reconnect for user ${userId} status subscription`
            );
          }
        }, 1000);

        return;
      }

      // Send subscription message if connected
      console.log(
        `[SocketService] Subscribing to status updates for user ${userId}`
      );
      this.emit("subscribeToUserStatus", { userId });

      // Setup periodic resubscription to ensure we keep getting updates
      const resubscribeKey = `resubscribe_${userId}`;
      if (!this[resubscribeKey]) {
        this[resubscribeKey] = setInterval(() => {
          if (this.isConnected()) {
            console.log(
              `[SocketService] Periodic resubscription to user ${userId}`
            );
            this.emit("subscribeToUserStatus", { userId });
          }
        }, 60000); // Resubscribe every minute
      }
    } catch (error) {
      console.error("[SocketService] Error subscribing to user status:", error);
    }
  }

  startHeartbeat() {
    // Clear any existing heartbeat interval
    this.stopHeartbeat();

    // Set up new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      // Only send heartbeat if socket is connected and tab is active
      if (this.isConnected() && this.isBrowserTabActive) {
        console.log("[SocketService] Sending heartbeat");
        this.socket.emit("heartbeat");

        // Also manually notify server about user activity
        this.socket.emit("user_active");

        // Resend current page info in case it was missed
        this.emit("page_view", { page: this.currentPage });

        // For debugging purposes, log the current socket ID
        console.log("[SocketService] Current socket ID:", this.socket.id);
      }
    }, this.heartbeatDelay);
  }

  // Manually trigger a heartbeat
  sendHeartbeatNow() {
    if (this.isConnected()) {
      console.log("[SocketService] Sending manual heartbeat");
      this.socket.emit("heartbeat");
      this.socket.emit("user_active");
    } else {
      console.log("[SocketService] Cannot send heartbeat - not connected");
      this.reconnect();
    }
  }

  stopHeartbeat() {
    console.log("[SocketService] Stopping heartbeat system");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  // Method to update the current page and notify the server
  setCurrentPage(page) {
    if (page !== this.currentPage) {
      console.log(`[SocketService] User navigated to page: ${page}`);
      this.currentPage = page;

      // Notify server if connected
      if (this.isConnected()) {
        this.emit("page_view", { page });
      }
    }
    return this;
  }

  // Method to get the current page
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Set up a reliable heartbeat system to ensure the user stays online
   * even when the tab is inactive
   */
  setupReliableHeartbeat() {
    console.log("[SocketService] Setting up reliable heartbeat system");

    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Shorter interval for more reliable presence (15 seconds)
    this.heartbeatInterval = setInterval(() => {
      // Send heartbeat regardless of tab visibility
      if (this.isConnected()) {
        console.log("[SocketService] Sending automatic heartbeat");
        this.socket.emit("heartbeat", { timestamp: Date.now() });
        this.socket.emit("user_active", { timestamp: Date.now() });
      } else {
        console.log(
          "[SocketService] Socket disconnected, attempting reconnect for heartbeat"
        );
        this.reconnect();

        // Try to send heartbeat after reconnection attempt
        setTimeout(() => {
          if (this.isConnected()) {
            this.socket.emit("heartbeat", { timestamp: Date.now() });
            this.socket.emit("user_active", { timestamp: Date.now() });
          }
        }, 1000);
      }
    }, 15000); // Every 15 seconds

    // Handle page visibility changes specifically for heartbeat
    const heartbeatVisibilityHandler = () => {
      if (document.visibilityState === "visible") {
        // Tab just became visible, send immediate heartbeat
        if (this.isConnected()) {
          console.log(
            "[SocketService] Tab visible, sending immediate heartbeat"
          );
          this.socket.emit("heartbeat", { timestamp: Date.now() });
          this.socket.emit("user_active", { timestamp: Date.now() });
        } else {
          // Try to reconnect if not connected
          console.log(
            "[SocketService] Tab visible but disconnected, reconnecting"
          );
          this.reconnect();
        }
      } else {
        // Tab hidden, send one last heartbeat to ensure we're still considered online
        if (this.isConnected()) {
          console.log("[SocketService] Tab hidden, sending final heartbeat");
          this.socket.emit("heartbeat", { timestamp: Date.now() });
          this.socket.emit("user_active", {
            timestamp: Date.now(),
            isTabHidden: true,
          });
        }
      }
    };

    // Register visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.visibilityHandler = heartbeatVisibilityHandler;
    document.addEventListener("visibilitychange", this.visibilityHandler);

    // Ensure heartbeat is immediately started
    if (this.isConnected()) {
      this.socket.emit("heartbeat", { timestamp: Date.now() });
      this.socket.emit("user_active", { timestamp: Date.now() });
    }

    return this;
  }
}

// Create a singleton instance
const socketService = new SocketService();

// Initialize at import time
socketService.init();

// Export the singleton
export default socketService;

// Add handlers for user status updates and browser close events

// Configure beforeunload event to notify server when browser is closing
window.addEventListener("beforeunload", () => {
  if (socketService.socket && socketService.socket.connected) {
    // Send browser closing event to server
    socketService.socket.emit("browser_closing");
  }
});

// Handle close events using the page visibility API as a fallback
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "hidden" &&
    socketService.socket &&
    socketService.socket.connected
  ) {
    // User is navigating away or switching tabs, send a ping
    socketService.socket.emit("user_active");
  }
});

// Handle pings from server
if (socketService.socket) {
  socketService.socket.on("ping", (data) => {
    // Respond with a pong to keep the connection alive
    socketService.socket.emit("pong", { timestamp: Date.now() });
  });
}

/**
 * Request status updates for a specific user
 * @param {string} userId - The user ID to watch
 */
socketService.watchUserStatus = (userId) => {
  if (!userId) {
    console.error(
      "[socketService] Cannot watch user status: userId is required"
    );
    return false;
  }

  // Attempt to reconnect if not connected
  if (!socketService.isConnected()) {
    console.log(
      `[socketService] Socket not connected, attempting to reconnect for watching ${userId}`
    );
    socketService.reconnect();

    // Schedule a retry after the reconnection attempt
    setTimeout(() => {
      if (socketService.isConnected()) {
        console.log(
          `[socketService] Successfully reconnected, now watching user ${userId}`
        );
        socketService.socket.emit("watch_user_status", userId);
      } else {
        console.warn(
          `[socketService] Failed to reconnect for watching user ${userId}`
        );
      }
    }, 1000);

    return false;
  }

  console.log(`[socketService] Watching status updates for user ${userId}`);
  socketService.socket.emit("watch_user_status", userId);

  // Add to tracked users in local storage
  try {
    const watchedUsers = JSON.parse(
      localStorage.getItem("watched_users") || "[]"
    );
    if (!watchedUsers.includes(userId)) {
      watchedUsers.push(userId);
      localStorage.setItem("watched_users", JSON.stringify(watchedUsers));
    }
  } catch (error) {
    console.error("[socketService] Error tracking watched user:", error);
  }

  return true;
};

/**
 * Request a one-time status update for a user
 * @param {string} userId - The user ID to get status for
 */
socketService.requestUserStatus = (userId) => {
  if (!userId) {
    console.error(
      "[socketService] Cannot request user status: userId is required"
    );
    return false;
  }

  if (!socketService.isConnected()) {
    console.warn(
      `[socketService] Socket not connected, cannot request status for user ${userId}`
    );
    socketService.reconnect();
    return false;
  }

  console.log(
    `[socketService] Requesting one-time status update for user ${userId}`
  );
  socketService.socket.emit("request_user_status", userId);
  return true;
};

/**
 * Add a listener for user status updates
 * @param {Function} callback - Function to call when a status update is received
 */
socketService.onUserStatusUpdate = (callback) => {
  if (!callback || typeof callback !== "function") {
    console.error("[socketService] Invalid callback for user status updates");
    return false;
  }

  // Add this listener to the socket
  socketService.on("user_status_update", callback);

  // If socket is connected, resubscribe to all watched users to ensure updates
  if (socketService.isConnected()) {
    try {
      const watchedUsers = JSON.parse(
        localStorage.getItem("watched_users") || "[]"
      );
      watchedUsers.forEach((userId) => {
        socketService.socket.emit("watch_user_status", userId);
      });
    } catch (error) {
      console.error(
        "[socketService] Error resubscribing to watched users:",
        error
      );
    }
  }

  return true;
};

// Add a method to handle socket reconnections specifically for status tracking
socketService.reconnectStatusTracking = () => {
  if (!socketService.isConnected()) {
    socketService.reconnect();
  }

  // Resubscribe to all tracked users
  setTimeout(() => {
    if (socketService.isConnected()) {
      try {
        const watchedUsers = JSON.parse(
          localStorage.getItem("watched_users") || "[]"
        );
        console.log(
          `[socketService] Resubscribing to ${watchedUsers.length} watched users after reconnect`
        );

        watchedUsers.forEach((userId) => {
          socketService.socket.emit("watch_user_status", userId);
        });
      } catch (error) {
        console.error(
          "[socketService] Error resubscribing to watched users:",
          error
        );
      }
    }
  }, 1000);
};
