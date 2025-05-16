import io from "socket.io-client";
import { API_URL } from "../config/constants";

// Create singleton instance
const socketService = new (class SocketService {
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
    this.heartbeatDelay = 15000; // Changed to 15 seconds for more frequent updates
    this.currentPage = "other"; // Default to 'other' instead of marketplace
    this.lastStatsUpdate = 0; // Track when we last updated stats
    this.visibilityTimeout = null;
  }

  init() {
    console.log("[SocketService] Initializing service");

    // Setup tab visibility listener
    if (typeof document !== "undefined") {
      // Use arrow function instead of bind
      document.addEventListener("visibilitychange", () =>
        this.handleVisibilityChange()
      );
    }

    // Start periodic connection checking
    this.startConnectionCheck();

    return this;
  }

  // Request fresh statistics from the server
  requestStatsUpdate() {
    if (this.isConnected()) {
      console.log("[SocketService] Requesting fresh stats update");
      this.emit("request_stats_update");
      this.lastStatsUpdate = Date.now();
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      console.log("[SocketService] Tab became visible, checking connection");
      this.isBrowserTabActive = true;

      // When tab becomes visible, always notify server about user activity
      if (this.isConnected()) {
        console.log(
          "[SocketService] Sending active status after tab visibility change"
        );
        this.socket.emit("user_active");

        // Request fresh stats
        this.requestStatsUpdate();
      } else {
        // Try to reconnect if not connected
        this.reconnect();
      }
    } else {
      console.log(
        "[SocketService] Tab became hidden, but still maintaining connection"
      );

      // We're setting this to false for internal tracking
      this.isBrowserTabActive = false;

      // But we still want to maintain the connection with a final activity ping
      // This ensures the server knows the tab is still open, just not visible
      if (this.isConnected()) {
        console.log(
          "[SocketService] Sending final activity ping before background"
        );
        this.socket.emit("user_active");
        // We still want to maintain the heartbeat - don't stop it
      }
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
          } else {
            // Check if it's been more than 60 seconds since our last stats update
            const timeSinceLastUpdate = Date.now() - this.lastStatsUpdate;
            if (timeSinceLastUpdate > 60000) {
              // 60 seconds
              this.requestStatsUpdate();
            }
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

  /**
   * Connect to the socket server
   * @param {string} token Auth token (optional)
   * @returns {Socket} The socket instance
   */
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

      // Request fresh stats
      this.requestStatsUpdate();

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
        reconnectionDelayMax: 5000, // Reduced from 10000
        timeout: 10000, // Reduced from 20000
        autoConnect: true,
        forceNew: true, // Force a new connection
      });

      // Setup connection event handlers using arrow functions instead of bind
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

        // Request fresh stats update immediately
        this.requestStatsUpdate();

        // Send current page information
        this.emit("page_view", { page: this.currentPage });

        // Start sending heartbeats to maintain the connection
        this.startHeartbeat();

        // Send an immediate heartbeat
        this.sendHeartbeatNow();
      });

      // Add a reconnect success handler
      this.socket.on("reconnect", (attemptNumber) => {
        console.log(
          `[SocketService] Successfully reconnected after ${attemptNumber} attempts`
        );
        this.connected = true;

        if (this.connectedCallback) {
          this.connectedCallback();
        }

        // Re-register all event listeners
        this.rebindEvents();
      });

      // Add a disconnect handler
      this.socket.on("disconnect", (reason) => {
        console.log(`[SocketService] Disconnected: ${reason}`);
        this.connected = false;

        if (this.disconnectedCallback) {
          this.disconnectedCallback();
        }

        // Stop heartbeats if disconnected
        this.stopHeartbeat();

        // If not user-initiated, try to reconnect
        if (reason !== "io client disconnect") {
          this.scheduleReconnect();
        }
      });

      // Handle connection error
      this.socket.on("connect_error", (error) => {
        console.error("[SocketService] Connection error:", error.message);
        this.handleConnectionFailure();
      });

      // Handle connection timeout
      this.socket.on("connect_timeout", (timeout) => {
        console.error("[SocketService] Connection timeout:", timeout);
        this.handleConnectionFailure();
      });

      // Handle error events
      this.socket.on("error", (error) => {
        console.error("[SocketService] Socket error:", error);
      });

      return this.socket;
    } catch (error) {
      console.error("[SocketService] Error creating socket:", error);
      this.handleConnectionFailure();
      return null;
    }
  }

  // Disconnect from the socket server
  disconnect() {
    if (this.socket) {
      console.log("[SocketService] Disconnecting socket");

      // Stop heartbeat
      this.stopHeartbeat();

      // Clear all event listeners
      this.connectionEvents.clear();
      this.events.clear();

      try {
        // Disconnect the socket
        this.socket.disconnect();
      } catch (error) {
        console.error("[SocketService] Error disconnecting socket:", error);
      }

      this.socket = null;
      this.connected = false;
    }

    return this;
  }

  // Reconnect to the socket server
  reconnect() {
    console.log("[SocketService] Attempting to reconnect");

    // Don't try to reconnect too frequently
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 2000) {
      console.log("[SocketService] Reconnection throttled");
      return;
    }

    // Check if we have a token
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("token");

    // Increment reconnect counter
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log(
        `[SocketService] Max reconnection attempts (${this.maxReconnectAttempts}) reached, stopping`
      );
      return;
    }

    // Just try to connect again
    this.connect(token);
  }

  // Schedule a delayed reconnection attempt
  scheduleReconnect() {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`[SocketService] Scheduling reconnect in ${delay}ms`);

    // Set new timer
    this.reconnectTimer = setTimeout(() => this.reconnect(), delay);
  }

  // Handle connection failures
  handleConnectionFailure() {
    this.connected = false;
    if (this.disconnectedCallback) {
      this.disconnectedCallback();
    }

    // Schedule reconnect after a short delay
    this.scheduleReconnect();
  }

  // Register a callback for connection establishment
  onConnected(callback) {
    this.connectedCallback = callback;

    // If already connected, call the callback immediately
    if (this.isConnected()) {
      setTimeout(() => {
        if (callback && this.isConnected()) {
          callback();
        }
      }, 0);
    }

    return this;
  }

  // Register a callback for disconnection
  onDisconnected(callback) {
    this.disconnectedCallback = callback;
    return this;
  }

  // Register a socket event handler
  on(event, callback) {
    if (!event || typeof callback !== "function") {
      console.warn("[SocketService] Invalid event registration", {
        event,
        callback,
      });
      return this;
    }

    // Store the callback in our events map
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    // Attach the handler if socket exists
    if (this.socket) {
      this.socket.on(event, callback);
    }

    return this;
  }

  // Remove a socket event handler
  off(event, callback) {
    if (!event) {
      console.warn("[SocketService] Invalid event deregistration", {
        event,
        callback,
      });
      return this;
    }

    // Remove from our events map
    if (this.events.has(event) && callback) {
      this.events.get(event).delete(callback);
    } else if (this.events.has(event)) {
      // If no callback provided, clear all handlers for this event
      this.events.delete(event);
    }

    // Remove from socket if it exists
    if (this.socket && this.socket.off) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }

    return this;
  }

  // Emit a socket event
  emit(event, data, callback) {
    if (this.socket && this.isConnected()) {
      this.socket.emit(event, data, callback);
      return true;
    }
    console.warn(
      `[SocketService] Cannot emit '${event}': socket not connected`
    );
    return false;
  }

  // Re-bind all event handlers after reconnection
  rebindEvents() {
    if (!this.socket) return;

    // Re-attach all event handlers from our maps
    this.events.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    });
  }

  // Check if socket is connected
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Subscribe to user status updates for all users in your subscribed list
  subscribeToUserStatuses() {
    if (!this.isConnected()) return false;

    console.log("[SocketService] Subscribing to user statuses");

    // Get user IDs from localStorage or an API call
    let userIds = [];
    try {
      const savedUserIds = localStorage.getItem("watched_user_ids");
      if (savedUserIds) {
        userIds = JSON.parse(savedUserIds);
      }
    } catch (error) {
      console.error(
        "[SocketService] Error parsing watched user IDs from localStorage:",
        error
      );
    }

    // If no stored IDs, just fetch relevant ones from server
    if (!userIds || userIds.length === 0) {
      // Just request all relevant statuses
      this.emit("get_user_statuses", {});
    } else {
      // Subscribe to each user ID
      userIds.forEach((userId) => {
        this.subscribeToUserStatus(userId);
      });
    }

    // Request current status for all users
    this.emit("get_user_statuses", {
      userIds,
    });

    return true;
  }

  // Subscribe to updates for a specific user's status
  subscribeToUserStatus(userId) {
    if (!userId) {
      console.error(
        "[SocketService] Cannot subscribe to user status: userId is required"
      );
      return false;
    }

    if (!this.isConnected()) {
      console.warn(
        "[SocketService] Cannot subscribe to user status: not connected"
      );
      return false;
    }

    console.log(`[SocketService] Subscribing to user status: ${userId}`);

    // Emit subscription request
    this.emit("watch_user_status", {
      userId,
    });

    // Also store this ID in localStorage for reconnection
    try {
      const savedUserIds = localStorage.getItem("watched_user_ids");
      let userIds = savedUserIds ? JSON.parse(savedUserIds) : [];

      // Add if not already present
      if (!userIds.includes(userId)) {
        userIds.push(userId);
        localStorage.setItem("watched_user_ids", JSON.stringify(userIds));
      }
    } catch (error) {
      console.error(
        "[SocketService] Error updating watched user IDs in localStorage:",
        error
      );
    }

    return true;
  }

  // Start sending heartbeat messages
  startHeartbeat() {
    // Clear existing interval if any
    this.stopHeartbeat();

    // Set up heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeatNow();
    }, this.heartbeatDelay);
  }

  // Send a heartbeat immediately
  sendHeartbeatNow() {
    if (!this.isConnected()) return;

    // Send heartbeat with current tab visibility and page
    this.emit("heartbeat", {
      timestamp: Date.now(),
      visible: this.isBrowserTabActive,
      page: this.currentPage,
    });
  }

  // Stop sending heartbeats
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Set current page for analytics
  setCurrentPage(page) {
    this.currentPage = page || "other";

    // Notify server about page change if connected
    if (this.isConnected()) {
      this.emit("page_view", { page: this.currentPage });
    }

    return this;
  }

  // Get current page
  getCurrentPage() {
    return this.currentPage;
  }

  // Subscribe to trade updates for a specific trade ID
  subscribeToTradeUpdates(tradeId) {
    if (!tradeId || !this.isConnected()) return false;

    console.log(`[SocketService] Subscribing to trade updates: ${tradeId}`);

    // Subscribe to trade-specific events
    this.emit("subscribe_trade", { tradeId });

    return true;
  }

  // Unsubscribe from trade updates
  unsubscribeFromTradeUpdates(tradeId) {
    if (!tradeId || !this.isConnected()) return false;

    console.log(`[SocketService] Unsubscribing from trade updates: ${tradeId}`);

    // Unsubscribe from trade-specific events
    this.emit("unsubscribe_trade", { tradeId });

    return true;
  }

  // Request a refresh of trade data
  requestTradeRefresh(tradeId) {
    if (!tradeId || !this.isConnected()) return false;

    console.log(`[SocketService] Requesting trade refresh: ${tradeId}`);

    // Ask server to send fresh trade data
    this.emit("refresh_trade", { tradeId });

    return true;
  }

  // Send a trade update to the server
  sendTradeUpdate(tradeId, action, data = {}) {
    if (!tradeId || !action || !this.isConnected()) return false;

    console.log(
      `[SocketService] Sending trade update: ${tradeId}, action: ${action}`
    );

    // Send update to server
    this.emit("trade_update", {
      tradeId,
      action,
      ...data,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  // Join a trade room for real-time updates
  joinTradeRoom(tradeId) {
    if (!tradeId || !this.isConnected()) return false;

    console.log(`[SocketService] Joining trade room: ${tradeId}`);

    // Join the room for this trade
    this.emit("join_trade_room", { tradeId });

    return true;
  }

  // Leave a trade room
  leaveTradeRoom(tradeId) {
    if (!tradeId || !this.isConnected()) return false;

    console.log(`[SocketService] Leaving trade room: ${tradeId}`);

    // Leave the room for this trade
    this.emit("leave_trade_room", { tradeId });

    return true;
  }

  // Request trade statistics
  requestTradeStats() {
    if (!this.isConnected()) return false;

    console.log(`[SocketService] Requesting trade stats`);

    // Request trade statistics
    this.emit("get_trade_stats");

    return true;
  }
})();

// Helper function to watch a user's status
const watchUserStatus = function (userId) {
  if (!userId) {
    console.error(
      "[socketService] Cannot watch user status: userId is required"
    );
    return false;
  }

  if (!socketService.isConnected()) {
    console.warn(
      "[socketService] Cannot watch user status: socket not connected"
    );
    return false;
  }

  // Subscribe to this user's status updates
  socketService.subscribeToUserStatus(userId);

  return true;
};

// Helper function to request a user's status immediately
const requestUserStatus = function (userId) {
  if (!userId) {
    console.error(
      "[socketService] Cannot request user status: userId is required"
    );
    return false;
  }

  if (!socketService.isConnected()) {
    console.warn(
      "[socketService] Cannot request user status: socket not connected"
    );
    return false;
  }

  console.log(`[socketService] Requesting user status: ${userId}`);

  // Request immediate status
  socketService.emit("get_user_status", { userId });

  return true;
};

// Register a callback for user status updates
const onUserStatusUpdate = function (callback) {
  if (!callback || typeof callback !== "function") {
    console.error("[socketService] Invalid callback for user status updates");
    return () => {};
  }

  // Register event handler
  const handler = (data) => {
    callback(data);
  };

  socketService.on("user_status_update", handler);

  // Return cleanup function
  return () => {
    socketService.off("user_status_update", handler);
  };
};

// Reconnect and resubscribe to all status tracking
const reconnectStatusTracking = function () {
  if (!socketService.isConnected()) {
    console.log("[socketService] Reconnecting for status tracking");
    socketService.reconnect();
  }

  // Resubscribe to all user statuses
  socketService.subscribeToUserStatuses();

  return true;
};

// Function to notify sellers about new offers
const notifySellerNewOffer = function (tradeData) {
  if (!socketService.isConnected()) {
    console.log("[socketService] Cannot notify seller: socket not connected");
    return false;
  }

  if (!tradeData || !tradeData.tradeId) {
    console.error("[socketService] Invalid trade data for seller notification");
    return false;
  }

  console.log(
    "[socketService] Notifying seller of new trade offer:",
    tradeData.tradeId
  );

  socketService.socket.emit("seller_trade_offer", {
    tradeId: tradeData.tradeId,
    sellerId: tradeData.sellerId || tradeData.seller?._id,
    itemId: tradeData.itemId || tradeData.item?._id,
    itemName: tradeData.item?.name || "an item",
    price: tradeData.price,
    buyerId: tradeData.buyerId || tradeData.buyer?._id,
    buyerName: tradeData.buyer?.username || "a buyer",
    createdAt: tradeData.createdAt || new Date().toISOString(),
  });

  return true;
};

// Register callback for seller trade offers
const onSellerTradeOffer = function (callback) {
  if (!socketService.isConnected()) {
    console.log(
      "[socketService] Cannot register seller offer callback: socket not initialized"
    );
    return () => {};
  }

  const handler = (data) => {
    console.log("[socketService] Received seller trade offer:", data);
    if (callback) {
      callback(data);
    }
  };

  socketService.on("seller_trade_offer", handler);

  // Return cleanup function
  return () => {
    socketService.off("seller_trade_offer", handler);
  };
};

// Export service with all methods
export default {
  init: () => socketService.init(),
  // Properly expose socket as a getter property to ensure it's always current
  get socket() {
    return socketService.socket;
  },
  connect: (token) => socketService.connect(token),
  disconnect: () => socketService.disconnect(),
  isConnected: () => socketService.isConnected(),
  onConnected: (callback) => socketService.onConnected(callback),
  onDisconnected: (callback) => socketService.onDisconnected(callback),
  on: (event, callback) => socketService.on(event, callback),
  off: (event, callback) => socketService.off(event, callback),
  emit: (event, data, callback) => socketService.emit(event, data, callback),
  setCurrentPage: (page) => socketService.setCurrentPage(page),
  getCurrentPage: () => socketService.getCurrentPage(),
  requestStatsUpdate: () => socketService.requestStatsUpdate(),
  reconnect: () => socketService.reconnect(),

  // Trade-related methods
  subscribeToTradeUpdates: (tradeId) =>
    socketService.subscribeToTradeUpdates(tradeId),
  unsubscribeFromTradeUpdates: (tradeId) =>
    socketService.unsubscribeFromTradeUpdates(tradeId),
  requestTradeRefresh: (tradeId) => socketService.requestTradeRefresh(tradeId),
  sendTradeUpdate: (tradeId, action, data) =>
    socketService.sendTradeUpdate(tradeId, action, data),
  joinTradeRoom: (tradeId) => socketService.joinTradeRoom(tradeId),
  leaveTradeRoom: (tradeId) => socketService.leaveTradeRoom(tradeId),
  requestTradeStats: () => socketService.requestTradeStats(),

  // Helper functions
  notifySellerNewOffer,
  onSellerTradeOffer,
  watchUserStatus,
  requestUserStatus,
  onUserStatusUpdate,
  reconnectStatusTracking,
};
