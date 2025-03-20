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
app.use(
  cors({
    origin: config.CLIENT_URL,
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
  })
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

// Express session configuration (required by Passport)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: true, // Changed to true to ensure session is saved
  saveUninitialized: true, // Changed to true to create session for all users
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production", // Set true in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Needed for cross-site cookie in production
    httpOnly: true, // Prevents client-side JS from reading the cookie
    // Let the browser handle cookie domain
    domain: undefined,
    path: "/",
  },
});

// Log session configuration for debugging
console.log("Session configuration:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- PORT:", PORT);
console.log("- CLIENT_URL:", config.CLIENT_URL);
console.log("- Cookie secure:", process.env.NODE_ENV === "production");
console.log(
  "- Cookie sameSite:",
  process.env.NODE_ENV === "production" ? "none" : "lax"
);
console.log("- Cookie domain: undefined (browser will handle)");
console.log("- Cookie path: /");
console.log(
  "- Session secret length:",
  process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : "not set"
);

app.use(sessionMiddleware);

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

// Create HTTP server and integrate with Express
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  },
  pingTimeout: 60000, // 60 seconds ping timeout
  pingInterval: 25000, // 25 seconds ping interval
  transports: ["websocket", "polling"], // Use both WebSocket and polling for maximum compatibility
  allowUpgrades: true,
  cookie: {
    name: "io",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  },
});

// Use session middleware with Socket.io
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use(async (socket, next) => {
  try {
    // First try to authenticate via session
    if (socket.request.user && socket.request.user._id) {
      console.log(`User authenticated via session: ${socket.request.user._id}`);
      socket.userId = socket.request.user._id;
      socket.join(`user:${socket.request.user._id}`);
      return next();
    }

    // If no session auth, check for token in handshake
    let token = null;

    // Try to get token from different places
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.query && socket.handshake.query.token) {
      token = socket.handshake.query.token;
    } else if (
      socket.handshake.headers &&
      socket.handshake.headers.authorization
    ) {
      // Try to get from Authorization header (Bearer token)
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      console.log(
        `Attempting to authenticate socket with token: ${token.substring(
          0,
          10
        )}...`
      );

      try {
        // If JWT is enabled, try to verify it first
        if (process.env.JWT_SECRET) {
          try {
            const jwt = require("jsonwebtoken");
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
              const User = require("./models/User");
              const user = await User.findById(decoded.id);

              if (user) {
                console.log(`User authenticated via JWT: ${user._id}`);
                socket.request.user = user;
                socket.userId = user._id.toString();
                socket.join(`user:${user._id}`);
                return next();
              }
            }
          } catch (jwtError) {
            console.log(
              `JWT verification failed, trying direct ID lookup: ${jwtError.message}`
            );
          }
        }

        // If JWT verification failed or not enabled, try direct ID lookup
        const User = require("./models/User");
        const user = await User.findById(token);

        if (user) {
          console.log(`User authenticated via token ID: ${user._id}`);
          socket.request.user = user;
          socket.userId = user._id.toString();
          socket.join(`user:${user._id}`);
          return next();
        }

        console.log(`Invalid token provided for socket authentication`);
        return next(new Error("Invalid authentication token"));
      } catch (authError) {
        console.error(`Error in token authentication:`, authError);
        return next(new Error("Authentication error"));
      }
    } else {
      // For development, you might allow unauthenticated connections in debug mode
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.ALLOW_ANONYMOUS_WS === "true"
      ) {
        console.log(
          `Anonymous connection allowed in development mode: ${socket.id}`
        );
        socket.anonymous = true;
        return next();
      }
    }

    // If we reach here, no valid authentication
    console.log(`Unauthenticated socket connection rejected: ${socket.id}`);
    return next(new Error("Authentication required"));
  } catch (error) {
    console.error(`Socket authentication error:`, error);
    return next(new Error("Internal server error"));
  }
});

// WebSocket connection handling
io.on("connection", (socket) => {
  const socketId = socket.id;
  const userId = socket.request.user
    ? socket.request.user._id
    : socket.userId || null;

  console.log(
    `New client connected: ${socketId}${userId ? ` (User: ${userId})` : ""}`
  );

  // Send immediate confirmation of connection success
  socket.emit("connect_success", {
    connected: true,
    socketId: socketId,
    authenticated: !!userId,
    timestamp: Date.now(),
  });

  // Join user-specific room for targeted messages
  if (userId) {
    socket.join(`user:${userId}`);

    // Notify user of connection success
    io.to(`user:${userId}`).emit("notification", {
      type: "connection",
      title: "Connection Established",
      message: "You are now connected to real-time updates",
      timestamp: new Date(),
    });
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socketId}`);
  });
});

// Initialize socket service
const socketService = require("./services/socketService");
socketService.init(io);

// Export io instance for use in other files
app.set("io", io);

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
