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
    this.heartbeatDelay = 15000; // Changed to 15 seconds for more frequent updates
    this.currentPage = "other"; // Default to 'other' instead of marketplace
    this.lastStatsUpdate = 0; // Track when we last updated stats
    this.visibilityTimeout = null;
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

        // Re-establish all subscriptions
        this.subscribeToUserStatuses();

        // Request fresh data
        this.requestStatsUpdate();

        // Start heartbeat
        this.startHeartbeat();

        // Send immediate heartbeat
        this.sendHeartbeatNow();
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

        // Stop heartbeat
        this.stopHeartbeat();

        // If this is an unexpected disconnect, try to reconnect
        if (reason === "io server disconnect" || reason === "transport close") {
          // The server closed the connection, so we need to manually reconnect
          console.log(
            "[SocketService] Server-initiated disconnect, reconnecting manually"
          );
          this.reconnect();
        }

        if (this.disconnectedCallback) {
          this.disconnectedCallback(reason);
        }
      });

      return this.socket;
    } catch (error) {
      console.error("[SocketService] Error during socket connection:", error);
      this.handleConnectionFailure();
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      console.log("[SocketService] Disconnecting socket");
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

    this.stopHeartbeat();

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

  /**
   * Subscribe to user status updates for users we're interested in
   */
  subscribeToUserStatuses() {
    if (!this.isConnected()) {
      console.log(
        "[SocketService] Cannot subscribe to user statuses - not connected"
      );
      return;
    }

    // If we have specific users in localStorage, subscribe to them
    try {
      const watchingUserIds = localStorage.getItem("watching_user_ids");
      if (watchingUserIds) {
        const userIds = JSON.parse(watchingUserIds);
        console.log(
          `[SocketService] Subscribing to ${userIds.length} user statuses`
        );
        userIds.forEach((userId) => {
          this.subscribeToUserStatus(userId);
        });
      }

      // Additionally, if the user is authenticated, always check their own status and connections
      const authToken = localStorage.getItem("auth_token");
      if (authToken) {
        try {
          // Get user ID from token (if available)
          const tokenParts = authToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload && payload.userId) {
              console.log(
                `[SocketService] Automatically subscribing to own user status: ${payload.userId}`
              );
              this.subscribeToUserStatus(payload.userId);

              // Request an immediate stats update to refresh user counts
              this.requestStatsUpdate();
            }
          }
        } catch (tokenErr) {
          console.error("[SocketService] Error parsing auth token:", tokenErr);
        }
      }
    } catch (error) {
      console.error(
        "[SocketService] Error subscribing to user statuses:",
        error
      );
    }
  }

  /**
   * Subscribe to status updates for a specific user
   * @param {string} userId User ID to subscribe to
   * @returns {boolean} Success status
   */
  subscribeToUserStatus(userId) {
    if (!userId) {
      console.error(
        "[SocketService] Cannot subscribe to null/undefined userId"
      );
      return false;
    }

    if (!this.isConnected()) {
      console.log(
        `[SocketService] Cannot subscribe to user ${userId} - not connected`
      );
      return false;
    }

    console.log(
      `[SocketService] Subscribing to status updates for user ${userId}`
    );

    // Send the watch request to the server
    this.socket.emit("watch_user_status", userId);

    // Also request immediate status update
    this.socket.emit("request_user_status", userId);

    // Store this subscription in localStorage for reconnection
    try {
      const watchingUserIds = JSON.parse(
        localStorage.getItem("watching_user_ids") || "[]"
      );

      if (!watchingUserIds.includes(userId)) {
        watchingUserIds.push(userId);
        localStorage.setItem(
          "watching_user_ids",
          JSON.stringify(watchingUserIds)
        );
        console.log(
          `[SocketService] Added user ${userId} to watched users list`
        );
      }
    } catch (error) {
      console.error("[SocketService] Error storing user subscription:", error);
    }

    return true;
  }

  startHeartbeat() {
    // Clear any existing heartbeat interval
    this.stopHeartbeat();

    // Set up new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Always send heartbeat if connected, regardless of tab activity
        // This maintains the user's online status as long as the tab is open
        const isActive = this.isBrowserTabActive;
        console.log(
          `[SocketService] Sending heartbeat (tab active: ${isActive})`
        );
        this.socket.emit("heartbeat");

        // Always send user_active to maintain connection and update last activity time
        this.socket.emit("user_active");

        // Request updated stats every 3rd heartbeat
        if (Math.random() < 0.33) {
          // ~33% chance each heartbeat
          this.requestStatsUpdate();
        }

        // Only resend page info if tab is active to avoid polluting logs
        if (this.isBrowserTabActive) {
          this.emit("page_view", { page: this.currentPage });
        }

        // For debugging purposes, log the current socket ID
        console.log("[SocketService] Current socket ID:", this.socket.id);
      } else {
        console.log(
          "[SocketService] Socket disconnected, attempting to reconnect"
        );
        this.reconnect();
      }
    }, 15000); // Every 15 seconds regardless of tab state - more frequent heartbeat interval
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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
   * Subscribe to trade updates for a specific trade
   * This allows real-time updates when a trade status changes
   * @param {string} tradeId The ID of the trade to subscribe to
   */
  subscribeToTradeUpdates(tradeId) {
    if (!this.isConnected()) {
      console.warn(
        "[SocketService] Not connected, cannot subscribe to trade updates"
      );
      return;
    }

    console.log(`[SocketService] Subscribing to updates for trade ${tradeId}`);
    this.emit("subscribe_trade", { tradeId });
  }

  /**
   * Unsubscribe from trade updates
   * @param {string} tradeId The ID of the trade to unsubscribe from
   */
  unsubscribeFromTradeUpdates(tradeId) {
    if (!this.isConnected()) return;

    console.log(
      `[SocketService] Unsubscribing from updates for trade ${tradeId}`
    );
    this.emit("unsubscribe_trade", { tradeId });
  }

  /**
   * Request a refresh of cached trade data
   * Useful when we know there might be stale data in the Redis cache
   * @param {string} tradeId The trade ID to refresh
   */
  requestTradeRefresh(tradeId) {
    if (!this.isConnected()) return;

    console.log(`[SocketService] Requesting refresh for trade ${tradeId}`);
    this.emit("refresh_trade", { tradeId });
  }

  /**
   * Send a trade update event to the server
   * This will be broadcasted to all clients subscribed to this trade
   * @param {string} tradeId The ID of the trade being updated
   * @param {string} action The action being performed (e.g., 'accept', 'cancel')
   * @param {Object} data Additional data for the update
   */
  sendTradeUpdate(tradeId, action, data = {}) {
    if (!this.isConnected()) {
      console.warn("[SocketService] Not connected, cannot send trade update");
      return;
    }

    const updateData = {
      tradeId,
      action,
      ...data,
      timestamp: new Date().toISOString(),
    };

    console.log(`[SocketService] Sending trade update for ${tradeId}:`, action);
    this.emit("trade_update", updateData);
  }

  /**
   * Join a trade room to receive real-time updates about a specific trade
   * @param {string} tradeId The ID of the trade to join
   */
  joinTradeRoom(tradeId) {
    if (!this.isConnected()) {
      console.warn("[SocketService] Not connected, cannot join trade room");
      return;
    }

    console.log(`[SocketService] Joining trade room for ${tradeId}`);
    this.emit("join_trade_room", { tradeId });
  }

  /**
   * Leave a trade room when no longer interested in updates
   * @param {string} tradeId The ID of the trade room to leave
   */
  leaveTradeRoom(tradeId) {
    if (!this.isConnected()) return;

    console.log(`[SocketService] Leaving trade room for ${tradeId}`);
    this.emit("leave_trade_room", { tradeId });
  }

  /**
   * Request trade stats from the server
   * This will trigger a stats_update event with the latest trade statistics
   */
  requestTradeStats() {
    if (!this.isConnected()) {
      console.warn("[SocketService] Not connected, cannot request trade stats");
      return;
    }

    console.log("[SocketService] Requesting trade statistics");
    this.emit("request_trade_stats");
  }
}

// Create a singleton instance - pre-declare but don't initialize yet
let socketService;

// Now create and initialize the socketService instance
socketService = new SocketService();

// Initialize at import time
socketService.init();

/**
 * Request status updates for a specific user
 * @param {string} userId - The user ID to watch
 */
const watchUserStatus = function (userId) {
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
const requestUserStatus = function (userId) {
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
const onUserStatusUpdate = function (callback) {
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
const reconnectStatusTracking = function () {
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

/**
 * Emit an event to notify sellers about new trade offers
 */
const notifySellerNewOffer = function (tradeData) {
  if (!socketService || !socketService.isConnected()) {
    console.log("[SocketService] Cannot notify seller: not connected");
    return;
  }

  console.log(
    "[SocketService] Notifying seller about new trade offer:",
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
};

/**
 * Register a callback to handle seller trade offer events
 */
const onSellerTradeOffer = function (callback) {
  if (!socketService) {
    console.log(
      "[SocketService] Cannot register seller offer callback: socket not initialized"
    );
    return () => {};
  }

  const handler = (data) => {
    console.log("[SocketService] Received seller trade offer:", data);
    if (callback) {
      callback(data);
    }
  };

  socketService.socket.on("seller_trade_offer", handler);

  // Return cleanup function
  return () => {
    socketService.socket.off("seller_trade_offer", handler);
  };
};

// Export the singleton instance directly along with all necessary methods
export default {
  // Socket property directly exposed
  get socket() {
    return socketService.socket;
  },

  // Core methods
  connect: (...args) => socketService.connect(...args),
  disconnect: () => socketService.disconnect(),
  isConnected: () => socketService.isConnected(),
  onConnected: (...args) => socketService.onConnected(...args),
  onDisconnected: (...args) => socketService.onDisconnected(...args),
  on: (...args) => socketService.on(...args),
  off: (...args) => socketService.off(...args),
  emit: (...args) => socketService.emit(...args),
  setCurrentPage: (...args) => socketService.setCurrentPage(...args),
  requestStatsUpdate: () => socketService.requestStatsUpdate(),
  reconnect: () => socketService.reconnect(),

  // Additional functions
  notifySellerNewOffer,
  onSellerTradeOffer,
  watchUserStatus,
  requestUserStatus,
  onUserStatusUpdate,
  reconnectStatusTracking,

  // Add trade-related methods
  subscribeToTradeUpdates: (...args) =>
    socketService.subscribeToTradeUpdates(...args),
  unsubscribeFromTradeUpdates: (...args) =>
    socketService.unsubscribeFromTradeUpdates(...args),
  requestTradeRefresh: (...args) => socketService.requestTradeRefresh(...args),
  sendTradeUpdate: (...args) => socketService.sendTradeUpdate(...args),
  joinTradeRoom: (...args) => socketService.joinTradeRoom(...args),
  leaveTradeRoom: (...args) => socketService.leaveTradeRoom(...args),
  requestTradeStats: () => socketService.requestTradeStats(),
};

// Add handlers for user status updates and browser close events

// Configure both beforeunload and unload events for maximum reliability
// These events can be unreliable, so we implement multiple approaches
window.addEventListener("beforeunload", (event) => {
  if (socketService.isConnected()) {
    console.log(
      "[SocketService] Browser tab/window closing detected (beforeunload)"
    );

    try {
      // Try to send a synchronous message - this is more reliable for tab closure detection
      const closeNotification = {
        reason: "beforeunload",
        timestamp: Date.now(),
        socketId: socketService.socket.id,
      };

      // Use synchronous XHR as a backup - Socket.io might not have time to send
      // This is more reliable than socket when tab is closing
      if (navigator.sendBeacon) {
        const beaconUrl = `${API_URL}/api/user/closing`;
        const blob = new Blob([JSON.stringify(closeNotification)], {
          type: "application/json",
        });
        navigator.sendBeacon(beaconUrl, blob);
        console.log("[SocketService] Sent closing beacon");
      }

      // Also try via socket.io
      socketService.socket.emit("browser_closing", closeNotification);

      // Small delay to allow message to be sent
      const start = Date.now();
      while (Date.now() - start < 50) {
        // Small delay loop
      }
    } catch (error) {
      console.error(
        "[SocketService] Error during tab close notification:",
        error
      );
    }
  }
});

// Also listen for the unload event as a backup
window.addEventListener("unload", (event) => {
  if (socketService.isConnected()) {
    console.log("[SocketService] Browser tab/window closing detected (unload)");

    try {
      const closeNotification = {
        reason: "unload",
        timestamp: Date.now(),
        socketId: socketService.socket.id,
      };

      // Use beacon API for more reliable delivery during page unload
      if (navigator.sendBeacon) {
        const beaconUrl = `${API_URL}/api/user/closing`;
        const blob = new Blob([JSON.stringify(closeNotification)], {
          type: "application/json",
        });
        navigator.sendBeacon(beaconUrl, blob);
      }

      // Try socket.io as well, but it's less reliable during unload
      socketService.socket.emit("browser_closing", closeNotification);
    } catch (error) {
      // Can't do much with errors during unload
    }
  }
});

// Handle close events using the page visibility API as a fallback
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    console.log(
      "[SocketService] Tab visibility hidden - user may be switching tabs"
    );

    // Send a user activity ping to maintain connection
    if (socketService.isConnected()) {
      socketService.socket.emit("user_active");
    }

    // Set a timeout to detect if this is likely a tab close vs tab switch
    // If the visibility doesn't return to "visible" within a short time, it might be a closure
    if (!socketService.visibilityTimeout) {
      socketService.visibilityTimeout = setTimeout(() => {
        // If tab is still hidden after timeout, it might be closed
        if (
          document.visibilityState === "hidden" &&
          socketService.isConnected()
        ) {
          console.log(
            "[SocketService] Tab still hidden after timeout - might be closed"
          );
          // But we don't disconnect - we keep the connection and let the server-side timeout handle it
        }
        socketService.visibilityTimeout = null;
      }, 15000); // 15 seconds
    }
  } else if (document.visibilityState === "visible") {
    // Tab is visible again, clear any timeout
    if (socketService.visibilityTimeout) {
      clearTimeout(socketService.visibilityTimeout);
      socketService.visibilityTimeout = null;
    }

    // Send heartbeat to confirm activity
    if (socketService.isConnected()) {
      socketService.sendHeartbeatNow();
    }
  }
});

// Handle pings from server
if (socketService.socket) {
  socketService.socket.on("ping", (data) => {
    // Respond with a pong to keep the connection alive
    socketService.socket.emit("pong", { timestamp: Date.now() });
  });
}
