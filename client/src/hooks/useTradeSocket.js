import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { socket } from "../services/socketService";
import {
  updateLocalTrade,
  fetchTradeById,
  fetchTrades,
  fetchTradeStats,
} from "../redux/slices/tradesSlice";
import { toast } from "react-toastify";

/**
 * Hook to subscribe to trade-related socket events
 * @param {string} [currentTradeId] - Optional trade ID to focus updates on
 * @returns {Object} Trade socket event handlers
 */
const useTradeSocket = (currentTradeId = null) => {
  const dispatch = useDispatch();

  // Process a trade creation
  const handleTradeCreated = useCallback(
    (data) => {
      console.log("Trade created:", data);

      // Refresh the trades list
      dispatch(fetchTrades());

      // Show notification
      toast.success(`New trade created! You are the ${data.role}.`);

      // If we're looking at the trade details page for this trade, fetch it
      if (currentTradeId && currentTradeId === data.tradeId) {
        dispatch(fetchTradeById(data.tradeId));
      }
    },
    [dispatch, currentTradeId]
  );

  // Process a trade update
  const handleTradeUpdated = useCallback(
    (data) => {
      console.log("Trade updated:", data);

      // If we have the trade details, update the state directly
      if (data.trade) {
        dispatch(
          updateLocalTrade({
            tradeId: data.tradeId,
            updates: data.trade,
          })
        );
      }

      // If we're looking at the trade details page for this trade, fetch fresh data
      if (currentTradeId && currentTradeId === data.tradeId) {
        dispatch(fetchTradeById(data.tradeId));
      } else {
        // Otherwise just refresh the trade list
        dispatch(fetchTrades());
      }
    },
    [dispatch, currentTradeId]
  );

  // Process a trade status change
  const handleTradeStatusChanged = useCallback(
    (data) => {
      console.log("Trade status changed:", data);

      // Update the trade in our local state
      dispatch(
        updateLocalTrade({
          tradeId: data.tradeId,
          updates: { status: data.newStatus },
        })
      );

      // Show notification based on status
      const statusMessages = {
        PENDING: "Trade is now pending review",
        ACCEPTED: "Trade has been accepted",
        PROCESSING: "Trade is now processing",
        COMPLETED: "Trade has been completed successfully!",
        CANCELLED: "Trade has been cancelled",
        DECLINED: "Trade has been declined",
        FAILED: "Trade has failed",
        EXPIRED: "Trade has expired",
      };

      const message =
        statusMessages[data.newStatus] ||
        `Trade status changed to ${data.newStatus}`;

      // Use different toast types based on status
      if (["COMPLETED"].includes(data.newStatus)) {
        toast.success(message);
      } else if (
        ["CANCELLED", "DECLINED", "FAILED", "EXPIRED"].includes(data.newStatus)
      ) {
        toast.error(message);
      } else {
        toast.info(message);
      }

      // If we're looking at the trade details page for this trade, fetch fresh data
      if (currentTradeId && currentTradeId === data.tradeId) {
        dispatch(fetchTradeById(data.tradeId));
      } else {
        // Refresh the trades list and stats
        dispatch(fetchTrades());
        dispatch(fetchTradeStats());
      }
    },
    [dispatch, currentTradeId]
  );

  // Set up socket listeners
  useEffect(() => {
    // Make sure socket is connected
    if (!socket || !socket.connected) {
      console.warn(
        "Socket not connected. Trade real-time updates will not work."
      );
      return;
    }

    // Subscribe to events
    socket.on("trade:created", handleTradeCreated);
    socket.on("trade:updated", handleTradeUpdated);
    socket.on("trade:status", handleTradeStatusChanged);

    // Clean up on unmount
    return () => {
      socket.off("trade:created", handleTradeCreated);
      socket.off("trade:updated", handleTradeUpdated);
      socket.off("trade:status", handleTradeStatusChanged);
    };
  }, [handleTradeCreated, handleTradeUpdated, handleTradeStatusChanged]);

  return {
    handleTradeCreated,
    handleTradeUpdated,
    handleTradeStatusChanged,
  };
};

export default useTradeSocket;
