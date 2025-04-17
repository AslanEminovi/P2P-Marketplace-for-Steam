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
        debug(`Socket-based status response:`, response.data);

        setStatus({
          isOnline: response.data.isOnline,
          lastSeen: response.data.lastSeen,
          lastSeenFormatted:
            response.data.lastSeenFormatted ||
            formatLastSeen(response.data.lastSeen),
          source: "socket",
        });

        setLoading(false);
        setError(null);
        retryCountRef.current = 0;
      }
    } catch (err) {
      debug("Error fetching status:", err);
      console.error("Error fetching user status:", err);

      if (retryCountRef.current < MAX_RETRIES) {
        // Exponential backoff for retries
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        debug(
          `Retrying after ${delay}ms (attempt ${
            retryCountRef.current + 1
          }/${MAX_RETRIES})`
        );

        retryCountRef.current++;
        statusTimeoutRef.current = setTimeout(fetchStatus, delay);
      } else {
        setError(err);
        setLoading(false);
      }
    }
  };

  // Handle socket status updates
  useEffect(() => {
    // Create stable reference to the handler function
    handleStatusUpdateRef.current = (data) => {
      if (data && data.userId === userId) {
        debug(`Received socket status update:`, data);

        // Use the server-provided formatted time or our local formatting
        const formattedTime =
          data.lastSeenFormatted || formatLastSeen(data.lastSeen);

        setStatus((prev) => ({
          ...prev,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          lastSeenFormatted: formattedTime,
          source: "socket-update",
        }));

        // Reset loading and error states since we have data
        setLoading(false);
        setError(null);

        // Update cache
        try {
          const statusCache = JSON.parse(
            localStorage.getItem("user_status_cache") || "{}"
          );
          statusCache[userId] = {
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
            lastSeenFormatted: formattedTime,
            timestamp: Date.now(),
            source: "socket-update",
          };
          localStorage.setItem(
            "user_status_cache",
            JSON.stringify(statusCache)
          );
        } catch (err) {
          console.error("Error updating status cache:", err);
        }
      }
    };
  }, [userId]);

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

      if (cachedStatus && Date.now() - cachedStatus.timestamp < 30000) {
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

    // Register socket event handler
    if (!socketRegisteredRef.current) {
      debug("Registering socket event handlers");

      // Listen for user status updates
      socketService.on("userStatusUpdate", (data) => {
        if (handleStatusUpdateRef.current) {
          handleStatusUpdateRef.current(data);
        }
      });

      socketRegisteredRef.current = true;
    }

    // Subscribe to status updates for this user
    socketService.subscribeToUserStatus(userId);

    // Fetch initial status from server
    fetchStatus();

    // Set up periodic status checks
    statusTimeoutRef.current = setInterval(fetchStatus, 60000); // Check every minute

    // Clean up on unmount
    return () => {
      debug("Cleaning up status tracking");

      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (socketRegisteredRef.current) {
        socketService.off("userStatusUpdate");
        socketRegisteredRef.current = false;
      }
    };
  }, [userId]);

  // Return status and related functions
  return {
    status,
    loading,
    error,
    checkStatus, // Function to manually trigger a status check
    formatLastSeen, // Helper function to format timestamps
    isConnected: socketService.isConnected(), // Socket connection status
  };
};

export default useUserStatus;
