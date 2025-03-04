// Production environment configuration
module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  SESSION_SECRET: process.env.SESSION_SECRET,
  PORT: process.env.PORT || 10000,
  STEAMWEBAPI_KEY: process.env.STEAMWEBAPI_KEY,
  STEAM_API_KEY: process.env.STEAM_API_KEY,
  CLIENT_URL: process.env.CLIENT_URL || "https://your-frontend-url.com",
  CALLBACK_URL:
    process.env.CALLBACK_URL ||
    "https://your-backend-url.com/auth/steam/return",
};
