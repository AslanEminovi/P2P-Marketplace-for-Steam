import socketService from "../../services/socketService";
import { addNotification } from "../slices/notificationsSlice";
import { updateListingLocally } from "../slices/listingsSlice";

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
        break;

      case "auth/logout/fulfilled":
        // Optionally disconnect socket on logout (or keep it for anonymous browsing)
        // socketService.disconnect();
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
        // Notify about new listing
        if (socketService.isConnected()) {
          socketService.emit("market_update", {
            type: "new_listing",
            listing: action.payload,
          });
        }
        break;

      case "listings/updateListing/fulfilled":
        // Notify about updated listing
        if (socketService.isConnected()) {
          socketService.emit("market_update", {
            type: "listing_updated",
            listing: action.payload,
          });
        }
        break;

      case "listings/deleteListing/fulfilled":
        // Notify about deleted listing
        if (socketService.isConnected()) {
          socketService.emit("market_update", {
            type: "listing_deleted",
            listingId: action.payload,
          });
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

      // Could dispatch different actions based on update.type
      // For now, just log it
    });

    // Handle user status updates
    socketService.socket.on("user_status_update", (statusUpdate) => {
      console.log(
        "[socketMiddleware] Received user status update:",
        statusUpdate
      );
      // Could dispatch an action to update user status in the store
    });
  });
};

export default socketMiddleware;
