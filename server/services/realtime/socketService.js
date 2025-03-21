const { createAdapter } = require("@socket.io/redis-adapter");
const { createRedisClient } = require("../../config/redis");
const Item = require("../../models/Item");

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      // Create Redis clients for pub/sub
      this.redisClient = createRedisClient();
      this.redisPub = createRedisClient();

      // Wait for both clients to be ready
      await Promise.all([
        new Promise((resolve, reject) => {
          this.redisClient.once("ready", resolve);
          this.redisClient.once("error", reject);
        }),
        new Promise((resolve, reject) => {
          this.redisPub.once("ready", resolve);
          this.redisPub.once("error", reject);
        }),
      ]);

      // Set up Socket.IO Redis adapter
      this.io.adapter(createAdapter(this.redisPub, this.redisClient));
      console.log("Socket.IO Redis adapter configured successfully");

      // Initialize Redis-backed user tracking
      this.initializeUserTracking();
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      // Continue without Redis - fallback to in-memory
      console.log("Falling back to in-memory adapter");
      this.redisClient = null;
      this.redisPub = null;

      // Initialize in-memory user tracking
      this.connectedUsers = new Map();
    }

    // Initialize socket events regardless of Redis status
    this.initializeSocketEvents();
  }

  async initializeUserTracking() {
    if (!this.redisClient) return;

    // Clear existing online users on startup
    await this.redisClient.del("online_users");

    // Set up periodic cleanup of inactive users
    setInterval(async () => {
      const now = Date.now();
      const users = await this.redisClient.hgetall("online_users");

      for (const [userId, timestamp] of Object.entries(users)) {
        if (now - parseInt(timestamp) > 30000) {
          // 30 seconds timeout
          await this.redisClient.hdel("online_users", userId);
          await this.updateStats();
        }
      }
    }, 10000); // Run every 10 seconds
  }

  async updateStats() {
    try {
      // Get active listings count
      const activeListings = await Item.countDocuments({ isListed: true });

      // Get online users count
      let onlineUsers = 0;
      if (this.redisClient) {
        onlineUsers = await this.redisClient.hlen("online_users");
      } else {
        onlineUsers = this.connectedUsers.size;
      }

      const stats = {
        activeListings,
        onlineUsers,
        timestamp: Date.now(),
      };

      // Emit with consistent event name
      this.io.emit("stats_update", stats);

      return stats;
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  }

  // Helper method to safely interact with Redis
  async safeRedisOperation(operation) {
    if (!this.redisClient) {
      console.log("Redis not available, skipping operation");
      return null;
    }
    try {
      return await operation();
    } catch (error) {
      console.error("Redis operation failed:", error);
      return null;
    }
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        socket.emit("ping");
      }, 25000);

      socket.on("pong", () => {
        socket.isAlive = true;
      });

      // Handle authentication
      socket.on("authenticate", async (userData) => {
        try {
          const userId = userData.id;
          await this.handleUserConnection(socket, userId);
          socket.emit("auth_success", { userId });
        } catch (error) {
          console.error("Authentication error:", error);
          socket.emit("auth_error", { message: "Authentication failed" });
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        clearInterval(heartbeat);
        this.handleDisconnection(socket);
      });

      // Handle trade-related events
      socket.on("join_trade", (tradeId) => {
        socket.join(`trade:${tradeId}`);
        console.log(`Socket ${socket.id} joined trade room: ${tradeId}`);
      });

      socket.on("leave_trade", (tradeId) => {
        socket.leave(`trade:${tradeId}`);
        console.log(`Socket ${socket.id} left trade room: ${tradeId}`);
      });

      // Handle marketplace updates
      socket.on("join_marketplace", () => {
        socket.join("marketplace");
        console.log(`Socket ${socket.id} joined marketplace room`);
      });

      // Handle stats request
      socket.on("request_stats_update", async () => {
        try {
          const Item = require("../../models/Item");
          const Trade = require("../../models/Trade");

          // Get counts
          const activeListings = await Item.countDocuments({ isListed: true });
          const completedTrades = await Trade.countDocuments({
            status: "completed",
          });
          const activeUsers = await this.getOnlineUsersCount();

          // Send stats to the requesting client
          socket.emit("stats_update", {
            activeListings,
            activeUsers,
            completedTrades,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error handling stats request:", error);
        }
      });
    });
  }

  async handleUserConnection(socket, userId) {
    // Add user to connected users map
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Store user data in Redis if available
    await this.safeRedisOperation(async () => {
      await this.redisClient.hset(
        `user:${userId}`,
        "lastSeen",
        Date.now(),
        "socketId",
        socket.id
      );
    });

    // Broadcast user online status
    this.io.emit("user_status", {
      userId: userId,
      status: "online",
    });

    // Send initial data to user
    socket.emit("connection_established", {
      userId: userId,
      timestamp: Date.now(),
    });
  }

  handleDisconnection(socket) {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove socket from connected users
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.connectedUsers.delete(userId);
          // Update user's last seen in Redis
          this.safeRedisOperation(async () => {
            await this.redisClient.hset(
              `user:${userId}`,
              "lastSeen",
              Date.now()
            );
          });
          // Broadcast user offline status
          this.io.emit("user_status", {
            userId: userId,
            status: "offline",
          });
        }
      }
    }
  }

  // Broadcast trade updates to all clients in a trade room
  async broadcastTradeUpdate(tradeId, updateData) {
    this.io.to(`trade:${tradeId}`).emit("trade_update", {
      tradeId,
      ...updateData,
      timestamp: Date.now(),
    });

    // Store trade update in Redis for history
    await this.safeRedisOperation(async () => {
      await this.redisClient.lpush(
        `trade_updates:${tradeId}`,
        JSON.stringify({
          ...updateData,
          timestamp: Date.now(),
        })
      );
      // Keep only last 100 updates
      await this.redisClient.ltrim(`trade_updates:${tradeId}`, 0, 99);
    });
  }

  // Broadcast marketplace updates
  async broadcastMarketplaceUpdate(updateData) {
    this.io.to("marketplace").emit("marketplace_update", {
      ...updateData,
      timestamp: Date.now(),
    });
  }

  // Send notification to specific user
  async sendUserNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit("notification", {
      ...notification,
      timestamp: Date.now(),
    });

    // Store notification in Redis
    await this.safeRedisOperation(async () => {
      await this.redisClient.lpush(
        `notifications:${userId}`,
        JSON.stringify({
          ...notification,
          timestamp: Date.now(),
        })
      );
      // Keep only last 50 notifications
      await this.redisClient.ltrim(`notifications:${userId}`, 0, 49);
    });
  }

  // Get online users count
  async getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Clean up resources
  async cleanup() {
    await this.safeRedisOperation(async () => {
      await this.redisClient.quit();
      await this.redisPub.quit();
    });
  }
}

module.exports = RealtimeService;
