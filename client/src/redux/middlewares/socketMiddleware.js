import socketService from "../../services/socketService";
import { addNotification } from "../slices/notificationsSlice";
import { updateListingLocally } from "../slices/listingsSlice";
import { updateStats } from "../slices/statsSlice";
import {
  socketTradeUpdate,
  updateLocalTradeStatus,
  fetchTradeDetails,
  fetchTrades,
  fetchActiveTradesAsync,
  fetchTradeHistoryAsync,
  setSellerTradeOffer,
} from "../slices/tradesSlice";
import toast from "react-hot-toast";

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
      // Auth related actions
      case "auth/login/fulfilled":
      case "auth/register/fulfilled":
        // When user logs in, connect to socket with their token
        if (action.payload?.token) {
          console.log(
            "[socketMiddleware] User authenticated, connecting socket"
          );
          socketService.connect(action.payload.token);
        }
        break;

      case "auth/logout/fulfilled":
        // When user logs out, disconnect socket
        console.log("[socketMiddleware] User logged out, disconnecting socket");
        socketService.disconnect();
        break;

      // Listings related actions
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
      case "trades/updateTradeStatus/fulfilled":
        // When we update a trade status, we could notify other clients through socket
        if (socketService.isConnected() && action.payload?.tradeId) {
          socketService.emit("trade_update", {
            type: "status_update",
            tradeId: action.payload.tradeId,
            status: action.payload.result?.trade?.status,
            timestamp: new Date().toISOString(),
            action: action.payload.action,
          });

          // Request a stats update after trade status change
          if (socketService.requestStatsUpdate) {
            setTimeout(() => socketService.requestStatsUpdate(), 500);
          }
        }
        break;

      // Trade creation
      case "trades/createTrade/fulfilled":
        if (socketService.isConnected() && action.payload?.tradeId) {
          socketService.emit("trade_update", {
            type: "trade_created",
            tradeId: action.payload.tradeId,
            status: action.payload.status || "created",
            timestamp: new Date().toISOString(),
          });

          // Request a stats update after trade creation
          if (socketService.requestStatsUpdate) {
            setTimeout(() => socketService.requestStatsUpdate(), 500);
          }
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

      // Refresh trades data after reconnection to ensure we have the latest
      store.dispatch(fetchActiveTradesAsync());
      store.dispatch(fetchTradeHistoryAsync());
    });

    // Handle notifications
    socketService.socket.on("notification", (notification) => {
      console.log("[socketMiddleware] Received notification:", notification);
      store.dispatch(addNotification(notification));

      // Show toast notification for important events
      if (
        notification.type?.toLowerCase() === "trade" ||
        notification.title?.toLowerCase().includes("offer") ||
        notification.title?.toLowerCase().includes("trade")
      ) {
        toast(notification.title, {
          description: notification.message,
          icon: "💰",
          position: "top-center",
          duration: 5000,
        });
      }

      // If notification is trade-related, refresh relevant trade data
      if (notification.type === "trade" && notification.link) {
        // Extract trade ID from link (format: /trades/:id)
        const tradeId = notification.link.split("/").pop();
        if (tradeId) {
          // Refresh the specific trade details
          store.dispatch(fetchTradeDetails(tradeId));

          // After a short delay, also refresh the trade list to ensure consistency
          setTimeout(() => {
            store.dispatch(fetchActiveTradesAsync());
          }, 1000);
        }
      }
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

    // Handle trade updates
    socketService.socket.on("trade_update", (update) => {
      console.log("[socketMiddleware] Received trade update:", update);

      // Dispatch socketTradeUpdate action to update trade in store
      store.dispatch(socketTradeUpdate(update));

      // Show notification for trade status changes that require user attention
      if (update.status || update.action) {
        // Get current user to check if notification should be shown
        const state = store.getState();
        const currentUser = state.auth.user;

        if (!currentUser) return;

        // Only show notifications for trades this user is involved in
        const isUserInvolved =
          (update.buyer && update.buyer._id === currentUser._id) ||
          (update.seller && update.seller._id === currentUser._id) ||
          update.buyerId === currentUser._id ||
          update.sellerId === currentUser._id;

        if (!isUserInvolved) return;

        let notificationTitle = "";
        let notificationMessage = "";
        let notificationType = "INFO";

        // Determine notification based on trade status
        switch (update.status) {
          case "created":
          case "pending":
            if (update.seller && update.seller._id === currentUser._id) {
              notificationTitle = "New Trade Offer";
              notificationMessage = `You have received a new trade offer for ${
                update.item?.name || "an item"
              }`;
              notificationType = "INFO";
            }
            break;

          case "awaiting_seller":
            if (update.buyer && update.buyer._id === currentUser._id) {
              notificationTitle = "Offer Accepted";
              notificationMessage = `Your offer for ${
                update.item?.name || "an item"
              } has been accepted`;
              notificationType = "SUCCESS";
            } else if (update.seller && update.seller._id === currentUser._id) {
              notificationTitle = "Action Required";
              notificationMessage = `Please send the item to complete the trade`;
              notificationType = "WARNING";
            }
            break;

          case "awaiting_buyer":
            if (update.buyer && update.buyer._id === currentUser._id) {
              notificationTitle = "Item Sent";
              notificationMessage = `Seller has sent the item. Please confirm when received.`;
              notificationType = "WARNING";
            }
            break;

          case "completed":
            notificationTitle = "Trade Completed";
            notificationMessage = `The trade for ${
              update.item?.name || "an item"
            } has been completed successfully`;
            notificationType = "SUCCESS";
            break;

          case "cancelled":
          case "rejected":
            notificationTitle = "Trade Cancelled";
            notificationMessage = `The trade for ${
              update.item?.name || "an item"
            } has been cancelled`;
            notificationType = "ERROR";
            break;

          default:
            // Don't show notification for other statuses
            return;
        }

        // Show notification if we have a title and message
        if (notificationTitle && notificationMessage) {
          // Add a notification to the notifications panel
          store.dispatch(
            addNotification({
              id: Date.now(),
              title: notificationTitle,
              message: notificationMessage,
              type: notificationType,
              link: `/trades/${update.tradeId || update._id}`,
              read: false,
              createdAt: new Date().toISOString(),
            })
          );

          // Also show a toast notification to immediately alert the user
          toast[
            notificationType === "ERROR"
              ? "error"
              : notificationType === "SUCCESS"
              ? "success"
              : notificationType === "WARNING"
              ? "custom"
              : "info"
          ](notificationTitle, {
            description: notificationMessage,
            position: "top-center",
            duration: 5000,
            icon:
              notificationType === "ERROR"
                ? "❌"
                : notificationType === "SUCCESS"
                ? "✅"
                : notificationType === "WARNING"
                ? "⚠️"
                : "💬",
          });
        }
      }

      // If trade status is completed or cancelled, refresh trade lists
      if (
        update.status &&
        ["completed", "cancelled", "rejected"].includes(update.status)
      ) {
        // Small delay to ensure backend processing is complete
        setTimeout(() => {
          store.dispatch(fetchActiveTradesAsync());
          store.dispatch(fetchTradeHistoryAsync());
        }, 1000);
      }
    });

    // Handle stats updates
    socketService.socket.on("stats_update", (stats) => {
      console.log("[socketMiddleware] Received stats update:", stats);

      // Update global stats
      store.dispatch(updateStats(stats));
    });

    // Handle seller trade offers - opens trade panel for sellers
    socketService.socket.on("seller_trade_offer", (offerData) => {
      console.log("[socketMiddleware] Received seller trade offer:", offerData);

      // Get current user to check if the offer is for this seller
      const state = store.getState();
      const currentUser = state.auth.user;

      if (!currentUser || currentUser._id !== offerData.sellerId) {
        console.log(
          "[socketMiddleware] Trade offer not for this user, ignoring"
        );
        return;
      }

      // Fetch trade details to ensure we have complete data
      store.dispatch(fetchTradeDetails(offerData.tradeId));

      // Ensure there's a notification for this trade offer
      const notification = {
        id: Date.now(),
        title: "New Trade Offer",
        message: `You received a new offer for ${
          offerData.itemName || "an item"
        }`,
        type: "INFO",
        link: `/trades/${offerData.tradeId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Add to notification center
      store.dispatch(addNotification(notification));

      // Also show a toast notification immediately
      toast.success(notification.title, {
        description: notification.message,
        position: "top-center",
        duration: 5000,
        icon: "💰",
      });

      // Dispatch event to notify app that a seller trade offer arrived
      // This will be handled by TradeSidePanelManager to open the trade panel
      store.dispatch(
        setSellerTradeOffer({
          tradeId: offerData.tradeId,
          role: "seller",
        })
      );
    });

    // Also listen for newTradeOffer events
    socketService.socket.on("newTradeOffer", (offerData) => {
      console.log(
        "[socketMiddleware] Received new trade offer event:",
        offerData
      );

      // Get current user
      const state = store.getState();
      const currentUser = state.auth.user;

      if (!currentUser) return;

      // Check if this user is involved
      const isSeller = offerData.sellerId === currentUser._id;
      const isBuyer = offerData.buyerId === currentUser._id;

      if (!isSeller && !isBuyer) return;

      // Show different notifications/actions based on role
      if (isSeller) {
        // For seller - show notification and open trade panel
        store.dispatch(
          setSellerTradeOffer({
            tradeId: offerData.tradeId,
            role: "seller",
          })
        );

        // Ensure a notification is dispatched
        const notification = {
          id: Date.now(),
          title: "New Offer Received",
          message: `${offerData.buyerName || "A buyer"} wants to buy your ${
            offerData.itemName || "item"
          }`,
          type: "TRADE",
          link: `/trades/${offerData.tradeId}`,
          read: false,
          createdAt: new Date().toISOString(),
        };

        store.dispatch(addNotification(notification));

        // Show toast
        toast.success("New trade offer!", {
          description: notification.message,
          position: "top-center",
          duration: 5000,
          icon: "💰",
        });
      } else if (isBuyer) {
        // For buyer - just show notification
        const notification = {
          id: Date.now(),
          title: "Offer Sent",
          message: `Your offer for ${
            offerData.itemName || "an item"
          } was sent to the seller`,
          type: "INFO",
          link: `/trades/${offerData.tradeId}`,
          read: false,
          createdAt: new Date().toISOString(),
        };

        store.dispatch(addNotification(notification));

        // Show toast
        toast.success("Offer sent successfully!", {
          description: notification.message,
          position: "top-center",
          duration: 5000,
          icon: "📨",
        });
      }
    });
  });
};

export default socketMiddleware;
