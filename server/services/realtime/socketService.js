const Redis = require("ioredis");
const { createAdapter } = require("socket.io-redis");

class RealtimeService {
  constructor(io) {
    this.io = io;

    // Redis Cloud Configuration
    const redisConfig = process.env.REDIS_URL || {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    };

    // Create Redis clients
    this.redisClient = new Redis(redisConfig);
    this.redisPub = new Redis(redisConfig);

    // Error handling for Redis connections
    this.redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    this.redisPub.on("error", (err) => {
      console.error("Redis Pub Error:", err);
    });

    // Connection success logging
    this.redisClient.on("connect", () => {
      console.log("Successfully connected to Redis Cloud");
    });

    // Set up Socket.IO Redis adapter with TLS options
    const pubClient = this.redisPub;
    const subClient = this.redisClient;

    io.adapter(createAdapter({ pubClient, subClient }));

    // Track connected users and their socket IDs
    this.connectedUsers = new Map();

    // Initialize socket event handlers
    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on("authenticate", async (userData) => {
        try {
          const userId = userData.id;
          await this.handleUserConnection(socket, userId);
        } catch (error) {
          console.error("Authentication error:", error);
          socket.emit("auth_error", { message: "Authentication failed" });
        }
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

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
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

    // Store user data in Redis
    await this.redisClient.hset(
      `user:${userId}`,
      "lastSeen",
      Date.now(),
      "socketId",
      socket.id
    );

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
          this.redisClient.hset(`user:${userId}`, "lastSeen", Date.now());
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
    await this.redisClient.lpush(
      `trade_updates:${tradeId}`,
      JSON.stringify({
        ...updateData,
        timestamp: Date.now(),
      })
    );
    // Keep only last 100 updates
    await this.redisClient.ltrim(`trade_updates:${tradeId}`, 0, 99);
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
    await this.redisClient.lpush(
      `notifications:${userId}`,
      JSON.stringify({
        ...notification,
        timestamp: Date.now(),
      })
    );
    // Keep only last 50 notifications
    await this.redisClient.ltrim(`notifications:${userId}`, 0, 49);
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
    await this.redisClient.quit();
    await this.redisPub.quit();
  }
}

module.exports = RealtimeService;
