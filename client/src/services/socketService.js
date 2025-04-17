import io from "socket.io-client";
import { API_URL } from "../config/constants";
// Remove import from non-existent authService
// import { getToken } from "./authService";
import config from "../config";
import { toast } from "react-toastify";

// Track global connection state across tabs
const CONNECTION_STATE_KEY = "socket_connection_state";
const LAST_DISCONNECT_KEY = "socket_last_disconnect";
const CONNECTION_ID_KEY = "socket_connection_id";
const CURRENT_PAGE_KEY = "socket_current_page";
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Helper function to get the auth token
const getToken = () => localStorage.getItem("auth_token");

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connectionEvents = new Map();
    this.events = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.reconnectTimer = null;
    this.connectedCallback = null;
    this.disconnectedCallback = null;
    this.lastConnectionAttempt = 0;
    this.lastForcedRefresh = null;
    this.forceReconnectInterval = 20000; // Reduced from 30 seconds to 20 seconds
    this.lastSuccessfulConnection = null;
    this.connectionCheckTimer = null;
    this.isBrowserTabActive = true;
    this.heartbeatInterval = null;
    this.heartbeatDelay = 15000; // Reduced from 60 seconds to 15 seconds
    this.currentPage = "unknown";
    this.visibilityHandler = null; // For handling visibility changes
    this.pingInterval = null; // For checking connection health
    this.connectionHealth = 100; // Connection health score (0-100)
    this.explicitlyDisconnected = false; // Flag for intentional disconnects
    this.lastHeartbeatTime = null;
    this.connectionId = null;
    this.isReconnecting = false;
    this.heartbeatTimer = null;

    // Listen for storage events to coordinate across tabs
    this.setupCrossTabSync();

    // Store the connection ID to help with identifying the same tab across reloads
    localStorage.setItem(CONNECTION_ID_KEY, this.connectionId);
  }

  // Set up storage event listener for cross-tab coordination
  setupCrossTabSync() {
    if (typeof window === "undefined") return;

    window.addEventListener("storage", (event) => {
      if (event.key === CONNECTION_STATE_KEY) {
        const newState = JSON.parse(event.newValue || '{"connected":false}');

        // If another tab connected but this one isn't, try to connect
        if (newState.connected && !this.connected) {
          console.log(
            "[SocketService] Another tab connected, reconnecting in this tab"
          );
          this.reconnect();
        }
      } else if (event.key === CURRENT_PAGE_KEY) {
        // Update current page
        this.currentPage = event.newValue || "";
        console.log(
          `[SocketService] Current page updated from another tab: ${this.currentPage}`
        );
      }
    });
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

    // Setup beforeunload handler to ensure proper disconnects
    if (typeof window !== "undefined") {
      window.addEventListener(
        "beforeunload",
        this.handleBeforeUnload.bind(this)
      );
    }

    // Start periodic connection checking
    this.startConnectionCheck();

    // Start the reliable heartbeat system
    this.setupReliableHeartbeat();

    // Setup connection health monitoring
    this.startConnectionHealthMonitoring();

    // After socket connection is established
    this.socket.on("connect", () => {
      // ... existing code ...

      // Set up event listeners for page visibility and browser closing
      this.setupEventListeners();
    });

    // Handle server pings - used to measure latency and connection health
    this.socket.on("ping", (data) => {
      const serverTime = data.timestamp;
      const latency = Date.now() - serverTime;

      // Record last received heartbeat time
      this.lastHeartbeatTime = Date.now();

      // Respond with pong and latency info
      this.socket.emit("pong", {
        serverTime,
        clientTime: Date.now(),
        latency,
        connectionId: this.connectionId,
        page: this.currentPage,
      });

      // Update connection health based on latency
      this.connectionHealth = Math.max(0, Math.min(100, 100 - latency / 10));
      console.log(
        `[SocketService] Ping response: ${latency}ms, health: ${this.connectionHealth}`
      );
    });

    return this;
  }

  // Handle beforeunload to ensure proper disconnect
  handleBeforeUnload() {
    console.log("[SocketService] Page unloading, sending disconnect signal");

    try {
      // Store disconnect timestamp
      localStorage.setItem(LAST_DISCONNECT_KEY, Date.now().toString());

      if (this.socket && this.socket.connected) {
        // Send a browser_closing event to immediately mark user offline
        this.socket.emit("browser_closing", {
          timestamp: Date.now(),
          reason: "tab_close",
        });

        // Force disconnect to ensure server registers it immediately
        this.socket.disconnect();
      }
    } catch (err) {
      console.error("[SocketService] Error during beforeunload:", err);
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      console.log("[SocketService] Tab became visible, checking connection");
      this.isBrowserTabActive = true;

      // When tab becomes visible, check connection status
      this.checkConnectionStatus();
    } else {
      console.log("[SocketService] Tab became hidden");
      this.isBrowserTabActive = false;

      // Send notice that tab is hidden but still active
      if (this.socket && this.socket.connected) {
        this.socket.emit("tab_hidden", { timestamp: Date.now() });
      }
    }
  }

  // More aggressive connection checking
  checkConnectionStatus() {
    if (!this.isConnected()) {
      console.log("[SocketService] Not connected, reconnecting");
      this.reconnect();
    } else {
      // Even if connected, verify with a ping
      this.sendPing();

      // If in marketplace, force an immediate status update
      if (
        this.currentPage === "marketplace" ||
        this.currentPage === "listing"
      ) {
        console.log(
          "[SocketService] In marketplace, requesting immediate status updates"
        );
        this.emit("request_stats_update");

        // Also notify that we're active
        this.emit("user_active", {
          page: this.currentPage,
          timestamp: Date.now(),
        });
      }
    }
  }

  // Start monitoring connection health
  startConnectionHealthMonitoring() {
    // Clear existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Start new ping interval (every 10 seconds)
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      } else if (this.isBrowserTabActive) {
        // Aggressively reconnect if tab is active but socket disconnected
        this.reconnect();
      }
    }, 10000);
  }

  // Send ping to check connection
  sendPing() {
    if (!this.socket || !this.socket.connected) return;

    const pingStart = Date.now();
    let pongReceived = false;

    try {
      // Send ping with timestamp
      this.socket.emit("ping", { timestamp: pingStart }, () => {
        // This callback executes when server responds (acknowledgement)
        const latency = Date.now() - pingStart;
        pongReceived = true;

        // Update connection health based on latency
        if (latency < 100) {
          this.connectionHealth = 100; // Excellent
        } else if (latency < 300) {
          this.connectionHealth = 90; // Good
        } else if (latency < 1000) {
          this.connectionHealth = 70; // OK
        } else {
          this.connectionHealth = 50; // Poor
        }

        console.log(
          `[SocketService] Ping latency: ${latency}ms, health: ${this.connectionHealth}`
        );
      });

      // If no pong received within 5 seconds, consider connection unhealthy
      setTimeout(() => {
        if (!pongReceived) {
          console.log(
            "[SocketService] No pong received, connection may be dead"
          );
          this.connectionHealth -= 20; // Reduce health score

          if (this.connectionHealth < 30) {
            console.log(
              "[SocketService] Connection health critical, forcing reconnect"
            );
            this.reconnect();
          }
        }
      }, 5000);
    } catch (err) {
      console.error("[SocketService] Error sending ping:", err);
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
    this.explicitlyDisconnected = false;

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
      try {
        this.socket.disconnect();
      } catch (err) {
        console.error(
          "[SocketService] Error disconnecting existing socket:",
          err
        );
      }
      this.socket = null;
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
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
        forceNew: true, // Force a new connection
      });

      // Setup connection event handlers
      this.socket.on("connect", () => {
        console.log("[SocketService] Connected to socket server!");
        this.connected = true;
        this.reconnectAttempts = 0;
        this.connectionHealth = 100; // Reset health score on successful connection

        // Save connection state to localStorage for cross-tab coordination
        try {
          localStorage.setItem(
            CONNECTION_STATE_KEY,
            JSON.stringify({
              connected: true,
              timestamp: Date.now(),
              socketId: this.socket.id,
            })
          );
        } catch (err) {
          console.error("[SocketService] Error saving connection state:", err);
        }

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

        // Generate or retrieve connection ID for cross-tab identification
        try {
          this.connectionId =
            localStorage.getItem(CONNECTION_ID_KEY) ||
            `${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
          localStorage.setItem(CONNECTION_ID_KEY, this.connectionId);
        } catch (err) {
          console.error("[SocketService] Error with connection ID:", err);
          this.connectionId = `${Math.random()
            .toString(36)
            .substring(2, 10)}-${Date.now()}`;
        }

        // Update connection state
        try {
          localStorage.setItem(
            CONNECTION_STATE_KEY,
            JSON.stringify({
              connected: true,
              timestamp: Date.now(),
              id: this.connectionId,
            })
          );
        } catch (err) {
          console.error("[SocketService] Error storing connection state:", err);
        }

        // Set up event listeners for page visibility and browser closing
        this.setupEventListeners();
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

        // Update localStorage state
        try {
          localStorage.setItem(
            CONNECTION_STATE_KEY,
            JSON.stringify({
              connected: false,
              timestamp: Date.now(),
              reason,
            })
          );
        } catch (err) {
          console.error(
            "[SocketService] Error saving disconnection state:",
            err
          );
        }

        if (this.disconnectedCallback) {
          this.disconnectedCallback();
        }

        // Handle disconnect reason
        if (reason === "io server disconnect" || reason === "transport close") {
          // Server disconnected the client, need to reconnect manually
          if (!this.explicitlyDisconnected) {
            this.scheduleReconnect();
          }
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

      // Setup pong handler for connection health
      this.socket.on("pong", (data) => {
        // Server sent a pong directly, update health
        this.connectionHealth = Math.min(this.connectionHealth + 10, 100);
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
    // Mark as explicitly disconnected to prevent auto-reconnect
    this.explicitlyDisconnected = true;

    if (this.socket) {
      console.log("[SocketService] Disconnecting socket");

      // Stop the heartbeat system first
      this.stopHeartbeat();

      try {
        // Save disconnect timestamp
        localStorage.setItem(LAST_DISCONNECT_KEY, Date.now().toString());

        // Notify server we're intentionally disconnecting
        if (this.socket.connected) {
          this.socket.emit("client_disconnect", {
            reason: "explicit_disconnect",
            timestamp: Date.now(),
          });
        }

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

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Clean up resubscription intervals
    Object.keys(this).forEach((key) => {
      if (key.startsWith("resubscribe_") && this[key]) {
        clearInterval(this[key]);
        delete this[key];
      }
    });

    // Update localStorage status
    try {
      localStorage.setItem(
        CONNECTION_STATE_KEY,
        JSON.stringify({
          connected: false,
          timestamp: Date.now(),
          reason: "explicit_disconnect",
        })
      );
    } catch (err) {
      console.error("[SocketService] Error saving disconnect state:", err);
    }
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
    this.explicitlyDisconnected = false;

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

    // Don't reconnect if explicitly disconnected
    if (this.explicitlyDisconnected) {
      console.log(
        "[SocketService] Not reconnecting because socket was explicitly disconnected"
      );
      return;
    }

    // Calculate delay with exponential backoff up to 20 seconds (reduced from 30)
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 20000);
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
    this.connectionHealth -= 15; // Reduce health on connection failure

    // If we've exceeded max attempts, notify the user
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[SocketService] Max reconnection attempts reached, giving up"
      );

      // After a 10 second pause, try again (don't give up completely)
      setTimeout(() => {
        console.log("[SocketService] Retrying connection after timeout");
        this.reconnectAttempts = 0;
        this.reconnect();
      }, 10000);

      return;
    }

    this.scheduleReconnect();
  }

  // Set current page and handle marketplace special case
  setCurrentPage(page) {
    console.log(`[SocketService] Setting current page: ${page}`);
    this.currentPage = page;

    try {
      localStorage.setItem(CURRENT_PAGE_KEY, page);
    } catch (err) {
      console.error("[SocketService] Error storing current page:", err);
    }

    // If socket exists and is connected, notify the server about page change
    if (this.socket && this.socket.connected) {
      this.socket.emit("page_changed", {
        page,
        timestamp: Date.now(),
        connectionId: this.connectionId,
      });

      // If entering marketplace or listing, request stats update
      if (page === "marketplace" || page === "listings") {
        console.log(
          "[SocketService] Entering marketplace page, requesting stats update"
        );
        this.socket.emit("request_stats_update");
      }
    }
  }

  // Enhanced setupReliableHeartbeat
  setupReliableHeartbeat() {
    console.log("[SocketService] Setting up reliable heartbeat system");

    // Clear any existing heartbeat
    this.stopHeartbeat();

    // Shorter interval for more reliable presence (15 seconds)
    this.heartbeatInterval = setInterval(() => {
      // Skip if explicitly disconnected
      if (this.explicitlyDisconnected) return;

      // Send heartbeat regardless of tab visibility
      if (this.isConnected()) {
        console.log("[SocketService] Sending automatic heartbeat");
        this.socket.emit("heartbeat", { timestamp: Date.now() });
        this.socket.emit("user_active", {
          timestamp: Date.now(),
          page: this.currentPage,
          tabActive: this.isBrowserTabActive,
        });
      } else if (this.isBrowserTabActive) {
        // Only attempt reconnect if tab is active
        console.log(
          "[SocketService] Socket disconnected, attempting reconnect for heartbeat"
        );
        this.reconnect();
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

  setupEventListeners() {
    // Clean up any existing handlers first
    this.removeEventListeners();

    // Handle page visibility changes
    this.visibilityHandler = () => {
      const isVisible = document.visibilityState === "visible";
      console.log(
        `[SocketService] Visibility changed: ${
          isVisible ? "visible" : "hidden"
        }`
      );

      if (isVisible) {
        // Tab became visible again
        console.log("[SocketService] Tab visible, checking connection");

        // If socket exists but is disconnected, try to reconnect
        if (
          this.socket &&
          !this.socket.connected &&
          !this.explicitlyDisconnected
        ) {
          console.log(
            "[SocketService] Socket disconnected while tab was hidden, reconnecting"
          );
          this.reconnect();
        }

        // If we're on the marketplace page, request stats update
        if (
          this.currentPage === "marketplace" ||
          this.currentPage === "listings"
        ) {
          console.log(
            "[SocketService] Tab visible on marketplace, requesting stats update"
          );
          if (this.socket && this.socket.connected) {
            this.socket.emit("request_stats_update");
          }
        }

        // Emit tab visible event
        if (this.socket && this.socket.connected) {
          this.socket.emit("tab_visible", {
            timestamp: Date.now(),
            connectionId: this.connectionId,
            page: this.currentPage,
          });
        }
      } else {
        // Tab was hidden
        console.log("[SocketService] Tab hidden");

        // Emit tab hidden event
        if (this.socket && this.socket.connected) {
          this.socket.emit("tab_hidden", {
            timestamp: Date.now(),
            connectionId: this.connectionId,
            page: this.currentPage,
          });
        }
      }
    };

    // Set up visibility listener
    document.addEventListener("visibilitychange", this.visibilityHandler);

    // Handle browser/tab closing
    window.addEventListener("beforeunload", (event) => {
      console.log("[SocketService] Browser closing");

      // Store close timestamp for potential recovery on refresh
      try {
        localStorage.setItem("browser_close_timestamp", Date.now().toString());
      } catch (err) {
        console.error(
          "[SocketService] Error storing browser close timestamp:",
          err
        );
      }

      // Notify server about browser closing
      if (this.socket && this.socket.connected) {
        // Send the event synchronously before page unload
        this.socket.emit("browser_closing", {
          timestamp: Date.now(),
          connectionId: this.connectionId,
          page: this.currentPage,
        });
      }
    });
  }

  removeEventListeners() {
    // Remove visibility handler if it exists
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  // Add cleanup method for proper teardown
  cleanup() {
    console.log("[SocketService] Cleaning up socket service");

    // Stop heartbeat
    this.stopHeartbeat();

    // Remove event listeners
    this.removeEventListeners();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect socket if connected
    if (this.socket && this.socket.connected) {
      this.explicitlyDisconnected = true;
      this.socket.disconnect();
    }

    // Reset properties
    this.socket = null;
    this.events.clear();
    this.initialized = false;
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
window.addEventListener("beforeunload", (event) => {
  if (socketService.socket && socketService.socket.connected) {
    // Create a timestamp to track when the close occurred
    const closeTimestamp = Date.now();

    // Store this in localStorage for potential recovery
    try {
      localStorage.setItem(
        "browser_closing_timestamp",
        closeTimestamp.toString()
      );
    } catch (err) {
      console.error("[socketService] Error storing close timestamp:", err);
    }

    // Send browser closing event to server with reason
    console.log("[socketService] Browser/tab closing, sending closing event");
    socketService.socket.emit("browser_closing", {
      timestamp: closeTimestamp,
      reason: "beforeunload",
      connectionId: socketService.connectionId || null,
      page: socketService.currentPage,
    });

    // Explicitly mark as disconnected to prevent auto-reconnect
    localStorage.setItem(
      CONNECTION_STATE_KEY,
      JSON.stringify({
        connected: false,
        timestamp: closeTimestamp,
        reason: "browser_closing",
      })
    );

    // Try to clean up the socket
    try {
      socketService.socket.disconnect();
    } catch (err) {
      console.error("[socketService] Error during disconnect on close:", err);
    }
  }
});

// Handle close events using the page visibility API as a fallback
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Update tab hidden status
    console.log("[socketService] Tab hidden");

    if (socketService.socket && socketService.socket.connected) {
      // Send tab hidden event to help server distinguish between tab switches and closures
      socketService.socket.emit("tab_hidden", {
        timestamp: Date.now(),
        connectionId: socketService.connectionId || null,
        page: socketService.currentPage,
      });

      // Also update active status
      socketService.socket.emit("user_active", {
        timestamp: Date.now(),
        isTabHidden: true,
        page: socketService.currentPage,
      });
    }
  } else if (document.visibilityState === "visible") {
    console.log("[socketService] Tab visible again");

    // Check if we need to reconnect
    if (!socketService.isConnected()) {
      console.log(
        "[socketService] Socket disconnected while tab was hidden, reconnecting"
      );
      socketService.reconnect();
    } else if (socketService.socket && socketService.socket.connected) {
      // Send tab visible event
      socketService.socket.emit("user_active", {
        timestamp: Date.now(),
        isTabHidden: false,
        page: socketService.currentPage,
      });

      // If we're in the marketplace, request updated stats
      if (
        socketService.currentPage === "marketplace" ||
        socketService.currentPage === "listing"
      ) {
        console.log(
          "[socketService] In marketplace page, requesting stats update"
        );
        socketService.socket.emit("request_stats_update");
      }
    }
  }
});

// Handle pings from server
if (socketService.socket) {
  socketService.socket.on("ping", (data) => {
    // Record the timestamp of when we received this ping
    const receivedTimestamp = Date.now();

    // Record heartbeat time for connection health monitoring
    socketService.lastHeartbeatTime = receivedTimestamp;

    // Respond with a pong including original timestamp if provided
    // and our received timestamp for latency calculation
    socketService.socket.emit("pong", {
      originalTimestamp: data && data.timestamp ? data.timestamp : null,
      receivedTimestamp,
      respondedTimestamp: Date.now(),
      connectionId: socketService.connectionId,
    });
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
