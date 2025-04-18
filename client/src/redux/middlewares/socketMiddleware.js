import socketService from "../../services/socketService";
import { addNotification } from "../slices/notificationsSlice";
import { updateListingLocally } from "../slices/listingsSlice";
import { updateStats } from "../slices/statsSlice";
import { updateTradeStatus, updateTradePrice } from "../slices/tradesSlice";

// Socket middleware to connect Socket.io events with Redux
const socketMiddleware = (store) => {
  // Return the middleware function
  return (next) => (action) => {
    // First, dispatch the action normally
    const result = next(action);

    // Check if socketService is initialized
    if (!socketService || !socketService.socket) {
      return result;
    }

    // Handle specific actions that should trigger socket events
    switch (action.type) {
      // Authentication
      case "auth/login/fulfilled":
      case "auth/fetchUserProfile/fulfilled":
        // When user logs in or profile is fetched, ensure socket connection and subscribe to notifications
        if (!socketService.isConnected()) {
          socketService.reconnect();
        }

        // Request fresh stats after authentication changes
        if (socketService.requestStatsUpdate) {
          socketService.requestStatsUpdate();
        }
        break;

      case "auth/logout/fulfilled":
        // Optionally disconnect socket on logout (or keep it for anonymous browsing)
        // socketService.disconnect();

        // Request fresh stats after authentication changes
        if (socketService.requestStatsUpdate) {
          socketService.requestStatsUpdate();
        }
        break;

      // Notifications
      case "notifications/markNotificationsRead/fulfilled":
      case "notifications/markAllNotificationsRead/fulfilled":
        // Could emit an event to update other tabs/devices that notifications were read
        if (socketService.isConnected()) {
          socketService.emit("notifications_read");
        }
        break;

      // Listings
      case "listings/createListing/fulfilled":
      case "listings/updateListing/fulfilled":
      case "listings/deleteListing/fulfilled":
        // These actions affect stats, request an update
        if (socketService.requestStatsUpdate) {
          socketService.requestStatsUpdate();
        }

        // For specific listing operations, also emit the appropriate event
        if (socketService.isConnected()) {
          if (action.type === "listings/createListing/fulfilled") {
            socketService.emit("market_update", {
              type: "new_listing",
              listing: action.payload,
            });
          } else if (action.type === "listings/updateListing/fulfilled") {
            socketService.emit("market_update", {
              type: "listing_updated",
              listing: action.payload,
            });
          } else if (action.type === "listings/deleteListing/fulfilled") {
            socketService.emit("market_update", {
              type: "listing_deleted",
              listingId: action.payload,
            });
          }
        }
        break;

      // Trades
      case "trades/cancelTrade/fulfilled":
      case "trades/sellerApproveTrade/fulfilled":
      case "trades/sellerInitiateTrade/fulfilled":
      case "trades/buyerConfirmReceipt/fulfilled":
        // These actions affect stats, request an update
        if (socketService.requestStatsUpdate) {
          socketService.requestStatsUpdate();
        }
        break;

      default:
        // Do nothing for other actions
        break;
    }

    return result;
  };
};

// Set up socket event listeners that dispatch Redux actions
export const setupSocketListeners = (store) => {
  if (!socketService) return;

  // Listen for socket events once connected
  socketService.onConnected(() => {
    console.log(
      "[socketMiddleware] Setting up Redux-integrated socket listeners"
    );

    // Handle socket reconnection
    socketService.socket.on("reconnect", () => {
      console.log("[socketMiddleware] Socket reconnected");
      // Check authentication state
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        // Re-subscribe to notifications and user-specific events
        console.log("[socketMiddleware] Re-subscribing authenticated user");
      }

      // Request fresh stats on reconnection
      if (socketService.requestStatsUpdate) {
        socketService.requestStatsUpdate();
      }
    });

    // Handle notifications
    socketService.socket.on("notification", (notification) => {
      console.log("[socketMiddleware] Received notification:", notification);
      store.dispatch(addNotification(notification));
    });

    // Handle market updates
    socketService.socket.on("market_update", (update) => {
      console.log("[socketMiddleware] Received market update:", update);

      // Update local listing data if we have an update for a specific listing
      if (update.listing && update.type !== "listing_deleted") {
        store.dispatch(updateListingLocally(update.listing));
      }

      // Request fresh stats after any market update
      if (socketService.requestStatsUpdate) {
        setTimeout(() => socketService.requestStatsUpdate(), 100);
      }
    });

    // Handle user status updates
    socketService.socket.on("user_status_update", (statusUpdate) => {
      console.log(
        "[socketMiddleware] Received user status update:",
        statusUpdate
      );

      // Request fresh stats after user status changes
      if (socketService.requestStatsUpdate) {
        socketService.requestStatsUpdate();
      }
    });

    // Handle stats updates
    socketService.socket.on("stats_update", (stats) => {
      console.log("[socketMiddleware] Received stats update:", stats);
      store.dispatch(updateStats(stats));
    });

    // Handle trade updates
    socketService.socket.on("trade_update", (update) => {
      console.log("[socketMiddleware] Received trade update:", update);

      // Update the trade status in Redux
      if (update.tradeId && update.status) {
        store.dispatch(
          updateTradeStatus({
            tradeId: update.tradeId,
            status: update.status,
            statusHistory: update.statusHistory,
          })
        );
      }

      // Request fresh stats after trade updates
      if (socketService.requestStatsUpdate) {
        setTimeout(() => socketService.requestStatsUpdate(), 100);
      }
    });

    // Handle trade price updates
    socketService.socket.on("trade_price_update", (update) => {
      console.log("[socketMiddleware] Received trade price update:", update);

      if (update.tradeId && update.newPrice !== undefined) {
        store.dispatch(
          updateTradePrice({
            tradeId: update.tradeId,
            newPrice: update.newPrice,
            previousPrice: update.previousPrice || 0,
            updatedBy: update.updatedBy || "system",
          })
        );

        // Add a notification about the price change
        if (update.notification !== false) {
          store.dispatch(
            addNotification({
              type: "trade_price_change",
              title: "Trade Price Updated",
              message: `The price for trade #${update.tradeId.substring(
                0,
                8
              )} has been updated to ${update.newPrice}`,
              tradeId: update.tradeId,
              createdAt: new Date().toISOString(),
              read: false,
              data: {
                tradeId: update.tradeId,
                newPrice: update.newPrice,
                previousPrice: update.previousPrice,
              },
            })
          );
        }

        // Request fresh stats after price update
        if (socketService.requestStatsUpdate) {
          setTimeout(() => socketService.requestStatsUpdate(), 100);
        }
      }
    });

    // Handle tradeStatusUpdate event (specific to this app)
    socketService.socket.on("tradeStatusUpdate", (data) => {
      console.log("[socketMiddleware] Received trade status update:", data);

      if (data.tradeId) {
        store.dispatch(
          updateTradeStatus({
            tradeId: data.tradeId,
            status: data.status,
            statusHistory: data.statusHistory,
          })
        );

        // Request fresh stats
        if (socketService.requestStatsUpdate) {
          setTimeout(() => socketService.requestStatsUpdate(), 100);
        }
      }
    });

    // Request initial stats update
    if (socketService.requestStatsUpdate) {
      socketService.requestStatsUpdate();
    } else {
      console.warn(
        "[socketMiddleware] requestStatsUpdate method not available"
      );
    }
  });
};

export default socketMiddleware;
