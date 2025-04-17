import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_URL } from "../config/constants";
import socketService from "../services/socketService";

/**
 * Custom hook for handling user online/offline status
 * @param {string} userId - The user ID to track
 * @param {boolean} initialStatus - Optional initial status
 * @returns {Object} User status information and functions
 */
const useUserStatus = (userId, initialStatus = null) => {
  const [status, setStatus] = useState({
    isOnline: initialStatus !== null ? initialStatus : false,
    lastSeen: null,
    lastSeenFormatted: null,
    source: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to keep track of timers and listeners
  const statusTimeoutRef = useRef(null);
  const socketRegisteredRef = useRef(false);
  const retryCountRef = useRef(0);
  const fetchTimeoutRef = useRef(null);
  const handleStatusUpdateRef = useRef(null);

  // Constants
  const MAX_RETRIES = 3;
  const DEBUG = process.env.NODE_ENV === "development";

  // Debug helper
  const debug = (message, data = null) => {
    if (DEBUG) {
      console.log(`[UserStatus:${userId}] ${message}`, data || "");
    }
  };

  // Format last seen time for display
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return null;

    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;

    // If less than a minute
    if (diffMs < 60 * 1000) {
      return "just now";
    }

    // If less than an hour
    if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    // If less than a day
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

    // If less than a week
    if (diffMs < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    // More than a week
    return lastSeen.toLocaleDateString();
  };

  // Force immediate status check
  const checkStatus = () => {
    if (!userId) return;

    debug("Manual status check requested");

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set a timeout to fetch after a small delay (to avoid hammering the server)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchStatus();
    }, 300);
  };

  // Handle user status update event from socket
  const handleUserStatusUpdate = (data) => {
    if (!data || data.userId !== userId) return;

    debug("Received real-time status update through socket", data);

    // Update status with the real-time data
    setStatus({
      isOnline: data.isOnline,
      lastSeen: data.lastSeen || new Date(),
      lastSeenFormatted:
        data.lastSeenFormatted || formatLastSeen(data.lastSeen || new Date()),
      source: "socket",
    });

    setLoading(false);
    setError(null);

    // Cache the updated status
    try {
      const statusCache = JSON.parse(
        localStorage.getItem("user_status_cache") || "{}"
      );
      statusCache[userId] = {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen || new Date(),
        lastSeenFormatted:
          data.lastSeenFormatted || formatLastSeen(data.lastSeen || new Date()),
        timestamp: Date.now(),
        source: "socket",
      };
      localStorage.setItem("user_status_cache", JSON.stringify(statusCache));
      debug("Cached user status from socket in localStorage");
    } catch (err) {
      console.error("Error caching user status from socket:", err);
    }
  };

  // Fetch status from server
  const fetchStatus = async () => {
    if (!userId) return;

    debug("Fetching status from server");

    try {
      setLoading(true);

      // Get auth token
      const authToken =
        localStorage.getItem("auth_token") || localStorage.getItem("token");
      const hasToken = !!authToken;

      if (hasToken) {
        debug("Auth token found, will include in request");
      } else {
        debug("No auth token found, request may be treated as anonymous");
      }

      // Try direct status endpoint first (more reliable)
      try {
        debug("Trying direct database status");
        const response = await axios.get(
          `${API_URL}/user/direct-status/${userId}`,
          {
            withCredentials: true,
            timeout: 5000, // Increased timeout
            headers: {
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
              ...(hasToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            params: { _t: Date.now() },
          }
        );

        if (response.data) {
          debug(`Got direct status for user:`, response.data);
          console.log("Direct status response:", response.data);

          setStatus({
            isOnline: response.data.isOnline,
            lastSeen: response.data.lastSeen,
            lastSeenFormatted: response.data.lastSeenFormatted,
            source: response.data.source || "direct",
          });

          setLoading(false);
          setError(null);
          retryCountRef.current = 0;

          // Cache status in localStorage for quick loading next time
          try {
            const statusCache = JSON.parse(
              localStorage.getItem("user_status_cache") || "{}"
            );
            statusCache[userId] = {
              isOnline: response.data.isOnline,
              lastSeen: response.data.lastSeen,
              lastSeenFormatted: response.data.lastSeenFormatted,
              timestamp: Date.now(),
              source: response.data.source,
            };
            localStorage.setItem(
              "user_status_cache",
              JSON.stringify(statusCache)
            );
            debug("Cached user status in localStorage");
          } catch (err) {
            console.error("Error caching user status:", err);
          }

          return;
        }
      } catch (directError) {
        debug("Direct status error:", directError);
        console.error("Direct status error:", directError);
        // Fall back to socket-based status
      }

      // Fallback to the socket-based status endpoint
      debug("Falling back to socket-based status endpoint");
      const response = await axios.get(`${API_URL}/user/status/${userId}`, {
        withCredentials: true,
        timeout: 5000,
        headers: {
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
          ...(hasToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        params: { _t: Date.now() },
      });

      if (response.data) {
        debug("Got status from socket endpoint:", response.data);

        setStatus({
          isOnline: response.data.isOnline,
          lastSeen: response.data.lastSeen,
          lastSeenFormatted:
            response.data.lastSeenFormatted ||
            formatLastSeen(response.data.lastSeen),
          source: "api",
        });

        setLoading(false);
        setError(null);
        retryCountRef.current = 0;
      } else {
        throw new Error("Empty response from server");
      }
    } catch (err) {
      console.error("Error fetching user status:", err);

      // Increment retry count
      retryCountRef.current++;

      // Set error after max retries
      if (retryCountRef.current >= MAX_RETRIES) {
        setError(err.message || "Failed to get user status");

        // Use cached status if available after all retries fail
        try {
          const statusCache = JSON.parse(
            localStorage.getItem("user_status_cache") || "{}"
          );
          const cachedStatus = statusCache[userId];

          if (cachedStatus) {
            debug("Using cached status after fetch failure:", cachedStatus);
            setStatus({
              isOnline: cachedStatus.isOnline,
              lastSeen: cachedStatus.lastSeen,
              lastSeenFormatted: cachedStatus.lastSeenFormatted,
              source: "cache",
            });
          }
        } catch (cacheErr) {
          debug("Error reading from cache:", cacheErr);
        }
      } else {
        // Retry after a delay (with backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 5000);
        debug(`Will retry in ${delay}ms (attempt ${retryCountRef.current})`);

        fetchTimeoutRef.current = setTimeout(fetchStatus, delay);
      }
    } finally {
      setLoading(false);
    }
  };

  // Detect socket connection changes
  const isConnected = () => {
    return (
      socketService && socketService.isConnected && socketService.isConnected()
    );
  };

  // Subscribe to user status via socket
  const subscribeToUserStatus = () => {
    if (!userId) return;

    if (isConnected()) {
      debug("Subscribing to real-time status updates via socket");

      // Use socketService directly
      socketService.watchUserStatus(userId);

      debug("Registered socket event handler");
    } else {
      debug("Socket not connected, will try to subscribe later");

      // Try to reconnect the socket if not connected
      if (socketService) {
        socketService.reconnect();
      }
    }
  };

  // Initialize status tracking
  useEffect(() => {
    if (!userId) return;

    debug("Initializing status tracking");

    // Check if we have cached status first
    try {
      const statusCache = JSON.parse(
        localStorage.getItem("user_status_cache") || "{}"
      );
      const cachedStatus = statusCache[userId];

      // Use cached status if recent (within 2 minutes)
      if (cachedStatus && Date.now() - cachedStatus.timestamp < 120000) {
        debug("Using cached status:", cachedStatus);
        setStatus({
          isOnline: cachedStatus.isOnline,
          lastSeen: cachedStatus.lastSeen,
          lastSeenFormatted: cachedStatus.lastSeenFormatted,
          source: "cache",
        });
        setLoading(false);
      }
    } catch (err) {
      debug("Error reading from cache:", err);
    }

    // Store the handler in ref so it's accessible to cleanup and other functions
    handleStatusUpdateRef.current = handleUserStatusUpdate;

    // Register socket event handler
    if (!socketRegisteredRef.current) {
      debug("Setting up socket event listeners");

      // Listen for user status updates
      socketService.on("user_status_update", handleStatusUpdateRef.current);

      // Also listen for general socket connection events to resubscribe when needed
      socketService.onConnected(() => {
        debug("Socket reconnected, resubscribing to status updates");
        subscribeToUserStatus();
        fetchStatus(); // Also fetch fresh status
      });

      socketRegisteredRef.current = true;
    }

    // Initial subscription to status updates
    subscribeToUserStatus();

    // Fetch initial status from server
    fetchStatus();

    // Set up periodic status checks (less frequent - every 2 minutes instead of every 60 seconds)
    // This reduces the chance of flickering status
    statusTimeoutRef.current = setInterval(fetchStatus, 120000);

    // Set up heartbeat to let server know we're still active even if we're not doing anything
    const heartbeatInterval = setInterval(() => {
      if (isConnected()) {
        debug("Sending heartbeat to maintain connection");
        socketService.emit("heartbeat", {});
        socketService.emit("user_active", {});
      } else {
        debug("Not connected, attempting reconnect for heartbeat");
        socketService.reconnect();
      }
    }, 30000); // Every 30 seconds

    // Set up visibility change listener to update status when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        debug("Tab became visible, checking latest status");
        fetchStatus();
        subscribeToUserStatus(); // Resubscribe to status updates

        // Send extra heartbeat on tab visibility change
        if (isConnected()) {
          socketService.emit("heartbeat", {});
          socketService.emit("user_active", {});
        } else {
          // Reconnect if not connected
          socketService.reconnect();

          // Small delay to allow reconnection to complete
          setTimeout(() => {
            if (isConnected()) {
              socketService.emit("heartbeat", {});
              socketService.emit("user_active", {});
            }
          }, 1000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle browser close/refresh with beforeunload
    const handleBeforeUnload = () => {
      debug("Browser tab closing, notifying server");

      // Try to notify server about tab closing
      if (isConnected()) {
        socketService.emit("browser_closing", {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up on unmount
    return () => {
      debug("Cleaning up status tracking");

      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      if (socketRegisteredRef.current) {
        socketService.off("user_status_update", handleStatusUpdateRef.current);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        window.removeEventListener("beforeunload", handleBeforeUnload);
        socketRegisteredRef.current = false;
      }
    };
  }, [userId]);

  return {
    status,
    loading,
    error,
    checkStatus,
    isConnected: isConnected(),
  };
};

export default useUserStatus;
