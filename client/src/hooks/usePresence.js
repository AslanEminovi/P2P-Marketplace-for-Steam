import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import io from "socket.io-client";
import { toast } from "react-toastify";

/**
 * Hook for tracking user online/offline status
 * Based on the pattern of using Redis for user presence tracking
 *
 * @param {string} myUserId - The current user's ID
 * @returns {Object} - { presence, fetchPresence }
 */
export function usePresence(myUserId) {
  const { authUser } = useAuth();
  const [presence, setPresence] = useState({}); // { userId: "online" | "offline" }
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if we have a user ID
    if (!myUserId) return;

    let apiUrl = process.env.REACT_APP_API_URL;

    // Fallback detection for production
    if (!apiUrl && window.location.hostname !== "localhost") {
      // If on Vercel production and no API URL set, use the likely Render URL
      apiUrl = "https://cs2-marketplace.onrender.com";
      console.log(
        `[Presence] No API_URL env var found, using fallback: ${apiUrl}`
      );
    } else if (!apiUrl) {
      // Local development fallback
      apiUrl = "http://localhost:5001";
      console.log(`[Presence] Using local development API: ${apiUrl}`);
    }

    console.log(`[Presence] Connecting to Socket.IO at: ${apiUrl}`);

    const socketInstance = io(apiUrl, {
      auth: {
        token: localStorage.getItem("token"),
        userId: myUserId,
      },
    });

    socketInstance.on("connect", () => {
      console.log("Presence socket connected");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Presence socket connection error:", error);
    });

    // Listen to global status updates
    socketInstance.on("userStatusUpdate", ({ userId, isOnline }) => {
      setPresence((prev) => ({
        ...prev,
        [userId]: isOnline ? "online" : "offline",
      }));
    });

    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [myUserId]);

  // Helper to fetch a specific user's presence via REST API
  const fetchPresence = async (targetId) => {
    if (!targetId) return null;

    try {
      let apiUrl = process.env.REACT_APP_API_URL;

      // Fallback detection for production
      if (!apiUrl && window.location.hostname !== "localhost") {
        // If on Vercel production and no API URL set, use the likely Render URL
        apiUrl = "https://cs2-marketplace.onrender.com";
        console.log(
          `[Presence] No API_URL env var found, using fallback: ${apiUrl}`
        );
      } else if (!apiUrl) {
        // Local development fallback
        apiUrl = "http://localhost:5001";
        console.log(`[Presence] Using local development API: ${apiUrl}`);
      }

      console.log(
        `[Presence] Fetching status for user ${targetId} from ${apiUrl}/api/presence/${targetId}`
      );

      const res = await fetch(`${apiUrl}/api/presence/${targetId}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch user presence: ${res.status}`);
      }

      const data = await res.json();
      console.log(`[Presence] Got status for user ${targetId}:`, data);

      // Save to localStorage as a backup (with 5-minute expiration)
      try {
        localStorage.setItem(
          `user_presence:${targetId}`,
          JSON.stringify({
            ...data,
            localTimestamp: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
          })
        );
      } catch (storageError) {
        console.error(
          "Failed to store presence in localStorage:",
          storageError
        );
      }

      // Update local state with the fetched data
      setPresence((prev) => ({
        ...prev,
        [targetId]: data.status,
      }));

      return data;
    } catch (error) {
      console.error("Error fetching user presence:", error);

      // Try to get from localStorage as fallback
      try {
        const cached = localStorage.getItem(`user_presence:${targetId}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          // Check if cache is still valid
          if (parsedCache.expiresAt > Date.now()) {
            console.log(
              `[Presence] Using cached status for user ${targetId}:`,
              parsedCache
            );
            return parsedCache;
          }
        }
      } catch (cacheError) {
        console.error("Error reading presence from cache:", cacheError);
      }

      return {
        userId: targetId,
        status: "offline",
        lastActive: Date.now(),
        lastSeenFormatted: "Unknown",
      };
    }
  };

  return { presence, fetchPresence };
}

/**
 * Component for displaying user online status
 */
export const UserStatusBadge = ({
  userId,
  showOffline = true,
  showLastSeen = false,
}) => {
  const { authUser } = useAuth();
  const currentUserId = authUser?._id;
  const { presence, fetchPresence } = usePresence(currentUserId);
  const [statusData, setStatusData] = useState(null);

  // Get status from state
  const status = presence[userId];

  useEffect(() => {
    async function getFullStatus() {
      if (userId && (!status || showLastSeen)) {
        const data = await fetchPresence(userId);
        setStatusData(data);
      }
    }

    getFullStatus();
  }, [userId, status, showLastSeen]);

  if (!userId) return null;
  if (!showOffline && (!status || status === "offline")) return null;

  // For simple online/offline indicator without last seen info
  if (!showLastSeen) {
    return (
      <span
        className={status === "online" ? "text-green-600" : "text-gray-400"}
      >
        {status === "online" ? "● Online" : "○ Offline"}
      </span>
    );
  }

  // For detailed status with last seen
  return (
    <div className="flex flex-col gap-1">
      <span
        className={status === "online" ? "text-green-600" : "text-gray-400"}
      >
        {status === "online" ? "● Online" : "○ Offline"}
      </span>
      {status !== "online" && statusData && statusData.lastSeenFormatted && (
        <span className="text-xs text-gray-500">
          Last seen: {statusData.lastSeenFormatted}
        </span>
      )}
    </div>
  );
};

export default usePresence;
