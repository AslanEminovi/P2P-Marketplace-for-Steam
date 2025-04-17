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

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";
    const socketInstance = io(API_URL, {
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
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";
      const res = await fetch(`${API_URL}/api/presence/${targetId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch user presence");
      }

      const data = await res.json();

      // Update local state with the fetched data
      setPresence((prev) => ({
        ...prev,
        [targetId]: data.status,
      }));

      return data;
    } catch (error) {
      console.error("Error fetching user presence:", error);
      return { userId: targetId, status: "offline", lastActive: null };
    }
  };

  return { presence, fetchPresence };
}

/**
 * Component for displaying user online status
 */
export const UserStatusBadge = ({ userId, showOffline = true }) => {
  const { authUser } = useAuth();
  const currentUserId = authUser?._id;
  const { presence, fetchPresence } = usePresence(currentUserId);

  // Get status from state or fetch it
  const status = presence[userId];

  useEffect(() => {
    if (userId && !status) {
      fetchPresence(userId);
    }
  }, [userId, status]);

  if (!userId) return null;
  if (!showOffline && (!status || status === "offline")) return null;

  return (
    <span className={status === "online" ? "text-green-600" : "text-gray-400"}>
      {status === "online" ? "● Online" : "○ Offline"}
    </span>
  );
};

export default usePresence;
