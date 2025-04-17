import { useState, useEffect, useRef, useCallback } from "react";
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
  // Get current user ID to determine if we're checking our own status
  const authToken =
    localStorage.getItem("auth_token") || localStorage.getItem("token");
  const currentUserIdRef = useRef(null);

  // Try to get current user ID from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData && userData._id) {
        currentUserIdRef.current = userData._id;
      }
    } catch (e) {
      console.error("Error parsing user data from localStorage:", e);
    }
  }, []);

  const isSelf = useCallback(() => {
    return userId === currentUserIdRef.current;
  }, [userId]);

  // For the logged-in user, we can assume they're online if we're viewing the page
  const defaultIsOnline = isSelf()
    ? true
    : initialStatus !== null
    ? initialStatus
    : false;

  const [status, setStatus] = useState({
    isOnline: defaultIsOnline,
    lastSeen: null,
    lastSeenFormatted: null,
    source: "default",
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

  // Cache the status for quick access later
  const cacheStatus = useCallback(
    (statusData, source) => {
      try {
        const statusCache = JSON.parse(
          localStorage.getItem("user_status_cache") || "{}"
        );
        statusCache[userId] = {
          ...statusData,
          timestamp: Date.now(),
          source: source || statusData.source || "unknown",
        };
        localStorage.setItem("user_status_cache", JSON.stringify(statusCache));
        debug("Cached user status in localStorage", statusData);
      } catch (err) {
        console.error("Error caching user status:", err);
      }
    },
    [userId, debug]
  );

  // Initialize from cache or default status
  useEffect(() => {
    if (!userId) return;

    debug("Initializing status");

    // If checking our own status, we know we're online
    if (isSelf()) {
      debug("This is our own status, setting to online immediately");
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        lastSeen: new Date(),
        lastSeenFormatted: "just now",
        source: "self",
      }));
      setLoading(false);

      // Still cache this status
      cacheStatus(
        {
          isOnline: true,
          lastSeen: new Date(),
          lastSeenFormatted: "just now",
        },
        "self"
      );

      return;
    }

    // Check if we have cached status
    try {
      const statusCache = JSON.parse(
        localStorage.getItem("user_status_cache") || "{}"
      );
      const cachedStatus = statusCache[userId];

      // Always use cached status initially to prevent flashing
      if (cachedStatus) {
        debug("Using cached status:", cachedStatus);
        setStatus({
          isOnline: cachedStatus.isOnline,
          lastSeen: cachedStatus.lastSeen,
          lastSeenFormatted: cachedStatus.lastSeenFormatted,
          source: "cache",
        });
        // Don't set loading to false immediately to allow for a check
        setLoading(false);
      }
    } catch (err) {
      debug("Error reading from cache:", err);
    }
  }, [userId, isSelf, cacheStatus]);

  // Force immediate status check
  const checkStatus = useCallback(() => {
    if (!userId) return;

    debug("Manual status check requested");

    // If checking our own status, we know we're online
    if (isSelf()) {
      debug("This is our own status, no need to check - we're online");
      return;
    }

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set a timeout to fetch after a small delay (to avoid hammering the server)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchStatus();
    }, 300);
  }, [userId, isSelf]);

  // Handle user status update event from socket
  const handleUserStatusUpdate = useCallback(
    (data) => {
      if (!data || data.userId !== userId) return;

      debug("Received real-time status update through socket", data);

      // Update status with the real-time data
      setStatus((prev) => ({
        ...prev,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen || new Date(),
        lastSeenFormatted:
          data.lastSeenFormatted || formatLastSeen(data.lastSeen || new Date()),
        source: "socket",
      }));

      setLoading(false);
      setError(null);

      // Cache the updated status
      cacheStatus(
        {
          isOnline: data.isOnline,
          lastSeen: data.lastSeen || new Date(),
          lastSeenFormatted:
            data.lastSeenFormatted ||
            formatLastSeen(data.lastSeen || new Date()),
        },
        "socket"
      );
    },
    [userId, cacheStatus, formatLastSeen]
  );

  // Fetch status from server
  const fetchStatus = useCallback(async () => {
    if (!userId) return;

    // Skip API check for self
    if (isSelf()) {
      debug("Skip API check for self - we know we're online");
      return;
    }

    debug("Fetching status from server");

    // Only indicate loading if we don't already have a status
    if (!status.source || status.source === "default") {
      setLoading(true);
    }

    try {
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

          setStatus((prev) => ({
            ...prev,
            isOnline: response.data.isOnline,
            lastSeen: response.data.lastSeen,
            lastSeenFormatted: response.data.lastSeenFormatted,
            source: response.data.source || "direct",
          }));

          setLoading(false);
          setError(null);
          retryCountRef.current = 0;

          // Cache the status
          cacheStatus(
            {
              isOnline: response.data.isOnline,
              lastSeen: response.data.lastSeen,
              lastSeenFormatted: response.data.lastSeenFormatted,
            },
            "direct"
          );

          return;
        }
      } catch (directError) {
        debug("Direct status error:", directError);
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

        setStatus((prev) => ({
          ...prev,
          isOnline: response.data.isOnline,
          lastSeen: response.data.lastSeen,
          lastSeenFormatted:
            response.data.lastSeenFormatted ||
            formatLastSeen(response.data.lastSeen),
          source: "api",
        }));

        setLoading(false);
        setError(null);
        retryCountRef.current = 0;

        // Cache the status
        cacheStatus(
          {
            isOnline: response.data.isOnline,
            lastSeen: response.data.lastSeen,
            lastSeenFormatted:
              response.data.lastSeenFormatted ||
              formatLastSeen(response.data.lastSeen),
          },
          "api"
        );
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
            setStatus((prev) => ({
              ...prev,
              isOnline: cachedStatus.isOnline,
              lastSeen: cachedStatus.lastSeen,
              lastSeenFormatted: cachedStatus.lastSeenFormatted,
              source: "cache",
            }));
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
  }, [userId, isSelf, status.source, cacheStatus, formatLastSeen]);

  // Detect socket connection changes
  const isConnected = useCallback(() => {
    return (
      socketService && socketService.isConnected && socketService.isConnected()
    );
  }, []);

  // Subscribe to user status via socket
  const subscribeToUserStatus = useCallback(() => {
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
  }, [userId, isConnected]);

  // Initialize status tracking
  useEffect(() => {
    if (!userId) return;

    debug("Initializing status tracking");

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
        // Keep a slight delay before fetching status to let socket establish
        setTimeout(() => fetchStatus(), 300);
      });

      socketRegisteredRef.current = true;
    }

    // Initial subscription to status updates
    subscribeToUserStatus();

    // Fetch initial status from server (with a slight delay to let the socket connect)
    setTimeout(() => fetchStatus(), 100);

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
  }, [
    userId,
    handleUserStatusUpdate,
    subscribeToUserStatus,
    fetchStatus,
    isConnected,
  ]);

  return {
    status,
    loading,
    error,
    checkStatus,
    isConnected: isConnected(),
  };
};

export default useUserStatus;
