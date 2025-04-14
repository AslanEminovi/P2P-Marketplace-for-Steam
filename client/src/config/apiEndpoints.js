// API endpoints used throughout the application
const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    USER: "/auth/user",
    LOGOUT: "/auth/logout",
    STEAM: "/auth/steam",
    CALLBACK: "/auth/steam/callback",
  },

  // User endpoints
  USER: {
    PROFILE: "/users/profile",
    SETTINGS: "/users/settings",
    BALANCE: "/users/balance",
    INVENTORY: "/users/inventory",
    NOTIFICATIONS: "/users/notifications",
  },

  // Marketplace endpoints
  MARKETPLACE: {
    LISTINGS: "/marketplace/listings",
    CREATE: "/marketplace/create",
    ITEM: (id) => `/marketplace/listings/${id}`,
    BUY: (id) => `/marketplace/buy/${id}`,
    CANCEL: (id) => `/marketplace/cancel/${id}`,
  },

  // Trade endpoints
  TRADES: {
    LIST: "/trades",
    CREATE: "/trades/create",
    DETAIL: (id) => `/trades/${id}`,
    ACCEPT: (id) => `/trades/${id}/accept`,
    DECLINE: (id) => `/trades/${id}/decline`,
    CANCEL: (id) => `/trades/${id}/cancel`,
  },

  // Steam endpoints
  STEAM: {
    INVENTORY: "/steam/inventory",
    PROFILE: "/steam/profile",
    SETTINGS: "/steam/settings",
    TRADE_URL: "/steam/tradeurl",
  },

  // Admin endpoints
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    USERS: "/admin/users",
    LISTINGS: "/admin/listings",
    TRADES: "/admin/trades",
    SYSTEM: "/admin/system",
  },
};

export default API_ENDPOINTS;
