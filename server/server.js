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

      // Token not in cache, verify by looking up user
      const User = require("./models/User");
      const user = await User.findById(token);

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
    if (socket.request.user) {
      console.log(`User authenticated via session: ${socket.request.user._id}`);
      return next();
    }

    // If no session auth, check for token in handshake
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (token) {
      console.log(`Attempting to authenticate socket with token: ${token}`);

      const User = require("./models/User");
      const user = await User.findById(token);

      if (user) {
        console.log(`User authenticated via token: ${user._id}`);
        socket.request.user = user;
        return next();
      }

      console.log(`Invalid token provided for socket authentication: ${token}`);
    }

    // If we reach here, no valid authentication
    console.log(`Unauthenticated socket connection: ${socket.id}`);
    next(new Error("Authentication required"));
  } catch (error) {
    console.error(`Socket authentication error:`, error);
    next(new Error("Internal server error"));
  }
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Authenticate the socket connection using session data
  if (socket.request.user) {
    const userId = socket.request.user._id;
    console.log(
      `Authenticated user ${userId} connected to socket ${socket.id}`
    );

    // Join user to their own room for targeted messages
    socket.join(`user:${userId}`);

    // Send welcome message to client
    socket.emit("connect_success", {
      message: "Successfully connected to WebSocket server",
    });
  } else {
    console.log(`Unauthenticated connection: ${socket.id}`);
    socket.emit("auth_error", { message: "Authentication required" });
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
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
