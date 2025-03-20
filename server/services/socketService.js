/**
 * Socket.io Service for real-time communication
 * This service manages WebSocket connections and event handling
 */

let io;

const socketService = {
  /**
   * Initialize the socket service with the io instance
   * @param {Object} ioInstance - The Socket.io server instance
   */
  init: (ioInstance) => {
    io = ioInstance;
    console.log("Socket service initialized");
  },

  /**
   * Send a notification to a specific user
   * @param {string} userId - The user ID to send notification to
   * @param {Object} notification - The notification data
   */
  sendNotification: (userId, notification) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    io.to(`user:${userId}`).emit("notification", notification);
    console.log(`Notification sent to user:${userId}`);
  },

  /**
   * Broadcast site statistics to all connected clients
   * @param {Object} statsData - The statistics data to broadcast
   */
  broadcastStats: (statsData) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    // Broadcast to all connected clients, even anonymous ones
    io.emit("stats_update", {
      activeListings: statsData.activeListings,
      activeUsers: statsData.activeUsers,
      completedTrades: statsData.completedTrades,
      timestamp: new Date(),
    });

    console.log(
      `Stats update broadcast to all clients: ${statsData.activeUsers} users, ${statsData.activeListings} listings`
    );
  },

  /**
   * Send a trade update to users involved in a trade
   * @param {string} tradeId - The ID of the trade
   * @param {string} buyerId - The buyer's user ID
   * @param {string} sellerId - The seller's user ID
   * @param {Object} tradeData - The updated trade data
   */
  sendTradeUpdate: (tradeId, buyerId, sellerId, tradeData) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    const eventData = {
      tradeId,
      status: tradeData.status,
      updateTime: new Date(),
      data: tradeData,
    };

    // Send to both buyer and seller
    io.to(`user:${buyerId}`).emit("trade_update", eventData);
    io.to(`user:${sellerId}`).emit("trade_update", eventData);
    console.log(
      `Trade update for trade:${tradeId} sent to users ${buyerId} and ${sellerId}`
    );
  },

  /**
   * Send market update to all connected clients
   * @param {Object} marketData - The market update data
   */
  sendMarketUpdate: (marketData) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    io.emit("market_update", {
      type: marketData.type, // "new_listing", "price_change", "sold", etc.
      item: marketData.item,
      timestamp: new Date(),
    });
    console.log(`Market update broadcast: ${marketData.type}`);
  },

  /**
   * Send inventory update to a specific user
   * @param {string} userId - The user ID to send update to
   * @param {Object} inventoryData - The inventory update data
   */
  sendInventoryUpdate: (userId, inventoryData) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    io.to(`user:${userId}`).emit("inventory_update", {
      type: inventoryData.type, // "item_added", "item_removed", "refresh", etc.
      data: inventoryData.data,
      timestamp: new Date(),
    });
    console.log(`Inventory update sent to user:${userId}`);
  },

  /**
   * Send wallet update to a specific user
   * @param {string} userId - The user ID to send update to
   * @param {Object} walletData - The wallet update data
   */
  sendWalletUpdate: (userId, walletData) => {
    if (!io) {
      console.error("Socket service not initialized");
      return;
    }

    io.to(`user:${userId}`).emit("wallet_update", {
      balance: walletData.balance,
      balanceGEL: walletData.balanceGEL,
      transaction: walletData.transaction,
      timestamp: new Date(),
    });
    console.log(`Wallet update sent to user:${userId}`);
  },

  /**
   * Get the count of all currently connected clients (including anonymous)
   * @returns {number} The number of connected clients
   */
  getConnectedClientsCount: () => {
    if (!io) {
      console.error("Socket service not initialized");
      return 0;
    }

    return io.sockets.sockets.size;
  },
};

module.exports = socketService;
