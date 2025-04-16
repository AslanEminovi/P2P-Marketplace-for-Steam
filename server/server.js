require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { createAdapter } = require("@socket.io/redis-adapter");
const connectRedis = require("connect-redis");
const { redisClient } = require("./config/redis");
const Redis = require("ioredis");

// Import Redis configuration
const redisConfig = require("./config/redis");

// Determine environment
const isProduction = process.env.NODE_ENV === "production";
console.log(`Running in ${isProduction ? "production" : "development"} mode`);

// Validate essential API keys
if (!process.env.STEAMWEBAPI_KEY) {
  console.error(
    "WARNING: STEAMWEBAPI_KEY is not set in environment variables. Inventory checks will fail."
  );
} else {
  console.log(
    `STEAMWEBAPI_KEY is set (starts with: ${process.env.STEAMWEBAPI_KEY.substring(
      0,
      4
    )}...)`
  );
}

if (!process.env.STEAM_API_KEY) {
  console.error(
    "WARNING: STEAM_API_KEY is not set in environment variables. Steam authentication may fail."
  );
} else {
  console.log(
    `STEAM_API_KEY is set (starts with: ${process.env.STEAM_API_KEY.substring(
      0,
      4
    )}...)`
  );
}

// Load appropriate config
const config = isProduction
  ? require("./config/production")
  : {
      PORT: process.env.PORT || 5001,
      CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
    };

// Suppress the Mongoose strictQuery warning for Mongoose 7
mongoose.set("strictQuery", false);

require("./config/db"); // Connect to MongoDB
require("./config/passport"); // Set up Passport strategy

// Import routes
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const offerRoutes = require("./routes/offerRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const walletRoutes = require("./routes/walletRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = config.PORT;

// Enable CORS for your React client
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Check against whitelist
    const allowedOrigins = [
      config.CLIENT_URL,
      "https://p2-p-marketplace-for-steam.vercel.app",
      "http://localhost:3000",
      "https://localhost:3000",
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["set-cookie"],
  maxAge: 86400, // 24 hours in seconds
};

app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options("*", cors(corsOptions));

// Log CORS configuration
console.log(
  `CORS configured with following origins:`,
  isProduction
    ? [config.CLIENT_URL, "https://p2-p-marketplace-for-steam.vercel.app"]
    : "All origins allowed in development"
);

// Increased body size limit for larger payloads (e.g., when submitting multiple items)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Check for session secret
if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required but not provided"
  );
}

// Session configuration
console.log(
  `Environment: ${process.env.NODE_ENV}, Port: ${PORT}, Client URL: ${process.env.CLIENT_URL}`
);
console.log(`Secure cookies: ${process.env.NODE_ENV === "production"}`);
console.log(`Session secret length: ${process.env.SESSION_SECRET?.length}`);

// Initialize Redis session store
const RedisStore = require("connect-redis").default;

// Create a Redis client for sessions
let sessionClient;
try {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  console.log(
    `Connecting to Redis at ${redisUrl.split("@")[1] || redisUrl.split("@")[0]}`
  );

  sessionClient = new Redis(redisUrl, {
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(
        `Redis session connection retry in ${delay}ms (attempt #${times})`
      );
      return delay;
    },
  });

  sessionClient.on("error", (err) =>
    console.error("Redis Session Error:", err)
  );
  sessionClient.on("connect", () => console.log("Redis Session connected"));
} catch (error) {
  console.error("Failed to initialize Redis session client:", error);
}

// Configure express-session with Redis or fallback to memory store
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
};

// Only add Redis store if Redis client is initialized
if (sessionClient) {
  sessionConfig.store = new RedisStore({
    client: sessionClient,
    prefix: "cs2marketplace:sess:",
  });
  console.log("Using Redis store for sessions");
} else {
  console.warn(
    "Fallback to memory store for sessions (not recommended for production)"
  );
}

app.use(session(sessionConfig));

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// Log the Frontend client URL for debugging
console.log("Frontend client URL:", config.CLIENT_URL);

// Create a simple token cache to reduce database lookups
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for token cache

// Middleware to check for token authentication
app.use(async (req, res, next) => {
  // Skip if user is already authenticated via session
  if (req.isAuthenticated()) {
    return next();
  }

  // Check for token in query parameters
  const token = req.query.auth_token;
  if (token) {
    try {
      // Check token cache first
      const cachedUser = tokenCache.get(token);
      if (cachedUser) {
        // Token found in cache, use it
        req.login(cachedUser, (err) => {
          if (err) {
            console.error("Token login error (from cache):", err);
          }
          return next();
        });
        return;
      }

      // Decode the JWT token to get the user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        console.error("Invalid token format, no user ID found");
        return next();
      }

      // Token not in cache, verify by looking up user by ID from the JWT
      const User = require("./models/User");
      const userId = decoded.id;
      console.log(`Looking up user with ID: ${userId} from token`);
      const user = await User.findById(userId);

      if (user) {
        // Add to cache with TTL
        tokenCache.set(token, user);
        setTimeout(() => {
          tokenCache.delete(token);
        }, TOKEN_CACHE_TTL);

        // Log the user in
        req.login(user, (err) => {
          if (err) {
            console.error("Token login error:", err);
          } else {
            console.log(`User authenticated via token: ${user._id}`);
          }
          next();
        });
        return;
      } else {
        console.log(`User with ID ${userId} not found`);
      }
    } catch (error) {
      console.error("Token authentication error:", error);
    }
  }

  // Continue without authentication
  next();
});

// API Routes
app.use("/auth", authRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/offers", offerRoutes);
app.use("/trades", tradeRoutes);
app.use("/wallet", walletRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);

// Public stats endpoint for homepage
app.get("/stats", async (req, res) => {
  try {
    const Item = mongoose.model("Item");
    const User = mongoose.model("User");
    const Trade = mongoose.model("Trade");

    // Get counts of active listings, users, and completed trades
    const activeListings = await Item.countDocuments({ isListed: true });
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const completedTrades = await Trade.countDocuments({ status: "completed" });

    res.json({
      activeListings,
      activeUsers,
      completedTrades,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error getting public stats:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

// Steam Web API webhook endpoint
app.post("/api/webhooks/steam-trade", async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers["x-steam-signature"];

    if (!signature) {
      console.warn("Webhook received without signature header");
      return res.status(401).json({ error: "Missing webhook signature" });
    }

    // Validate the webhook signature
    const crypto = require("crypto");
    const webhookSecret = process.env.STEAM_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STEAM_WEBHOOK_SECRET not configured");
      return res
        .status(500)
        .json({ error: "Webhook validation not configured" });
    }

    // Create HMAC signature for validation
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const computedSignature = hmac
      .update(JSON.stringify(webhookData))
      .digest("hex");

    if (computedSignature !== signature) {
      console.warn("Invalid webhook signature received");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // Process the webhook data
    const steamApiService = require("./services/steamApiService");
    const result = await steamApiService.processTradeWebhook(webhookData);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Serve static files in production
if (isProduction) {
  // When using a separate frontend deployment (Vercel), we don't need to serve static files
  // from the backend server. Keeping this commented out for reference.

  /* 
  // Serve static files from the React app build directory
  const clientBuildPath = path.join(__dirname, "../client/build");
  app.use(express.static(clientBuildPath));

  // For any routes not handled by API, send back the React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
  */

  // Instead, just log the CLIENT_URL for reference
  console.log(`Frontend client URL: ${config.CLIENT_URL}`);
}

// Function to update site statistics
const updateSiteStats = async () => {
  try {
    const Item = mongoose.model("Item");
    const User = mongoose.model("User");
    const Trade = mongoose.model("Trade");

    const activeListings = await Item.countDocuments({ isListed: true });
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const completedTrades = await Trade.countDocuments({ status: "completed" });

    return {
      activeListings,
      activeUsers,
      completedTrades,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error updating site stats:", error);
    return null;
  }
};

// Create HTTP server
const server = http.createServer(app);

// Initialize Redis connections if enabled
let redisAdapter = null;
if (process.env.USE_REDIS === "true") {
  try {
    const { pubClient, subClient } = redisConfig.initRedis();
    redisAdapter = createAdapter(pubClient, subClient);
    console.log("Redis adapter for Socket.IO initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Redis adapter:", error);
    console.warn("Falling back to in-memory adapter");
  }
}

// Set up Socket.io with CORS and connection settings
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      // Check against whitelist
      const allowedOrigins = [
        config.CLIENT_URL,
        "https://p2-p-marketplace-for-steam.vercel.app",
        "http://localhost:3000",
        "https://localhost:3000",
      ];

      if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
        callback(null, true);
      } else {
        console.warn(`Socket.io blocked connection from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  // Add adapter configuration only if Redis is available
  ...(redisAdapter ? { adapter: redisAdapter } : {}),
  // Add additional settings to improve stability
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// Socket middleware for authentication
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      // Allow anonymous connections but mark them as such
      socket.userId = null;
      socket.username = null;
      socket.isAuthenticated = false;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error("User not found"));
    }

    // Attach user data to socket
    socket.userId = user._id.toString();
    socket.username = user.username || user.steamName || "User";
    socket.isAuthenticated = true;
    next();
  } catch (err) {
    // If token verification fails, allow as anonymous
    socket.userId = null;
    socket.username = null;
    socket.isAuthenticated = false;
    next();
  }
});

// Initialize socket service
const socketService = require("./services/socketService");
socketService.init(io);

// Periodically broadcast stats
setInterval(async () => {
  try {
    await socketService.broadcastStats();
  } catch (error) {
    console.error("Error broadcasting stats:", error);
  }
}, 30000); // Every 30 seconds

// Export io instance for use in other files
app.set("io", io);

// Export the updateSiteStats function along with the server
module.exports = {
  server,
  updateSiteStats,
  io, // Export the io instance
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Server error",
    message: isProduction ? "An unexpected error occurred" : err.message,
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server initialized`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Debug info for troubleshooting cross-domain authentication
  console.log(`CLIENT_URL: ${config.CLIENT_URL}`);
  console.log(`CORS origin: ${config.CLIENT_URL}`);
  console.log(`Cookie secure: ${process.env.NODE_ENV === "production"}`);
  console.log(
    `Cookie sameSite: ${process.env.NODE_ENV === "production" ? "none" : "lax"}`
  );

  if (isProduction) {
    console.log(
      `Serving static files from: ${path.join(__dirname, "../client/build")}`
    );
  }
});

// Handle server error events (e.g., port in use)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please free it or use a different port.`
    );
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    // Close Redis connections if they exist
    if (process.env.USE_REDIS === "true") {
      redisConfig.closeConnections().catch(console.error);
    }
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

// Log CORS settings
console.log("Environment:", isProduction ? "production" : "development");
console.log("CLIENT_URL:", config.CLIENT_URL);
console.log("CORS origin:", config.CLIENT_URL);
console.log("Cookie secure:", process.env.NODE_ENV === "production");
console.log(
  "Cookie sameSite:",
  process.env.NODE_ENV === "production" ? "none" : "lax"
);
