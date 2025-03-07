/**
 * Cache manager utility for clearing various storage mechanisms that might
 * be caching trade history or other user data.
 */

/**
 * Clears all possible storage mechanisms that might be caching trade history
 */
export const clearAllCaches = () => {
  // Clear localStorage items related to trades
  clearLocalStorage();

  // Clear sessionStorage items related to trades
  clearSessionStorage();

  // Clear any in-memory caches or state that might persist
  clearMemoryCache();

  // Force-reload API data by adding a cache buster parameter to future requests
  window.__CACHE_BUSTER = Date.now();

  console.log("All caches cleared at", new Date().toISOString());
  return true;
};

/**
 * Clears localStorage items that might contain trade data
 */
export const clearLocalStorage = () => {
  // Get all keys in localStorage
  const keys = Object.keys(localStorage);

  // Clear trade-related items
  keys.forEach((key) => {
    if (
      key.includes("trade") ||
      key.includes("history") ||
      key.includes("offer")
    ) {
      localStorage.removeItem(key);
    }
  });

  // Clear any other cache keys that might exist
  localStorage.removeItem("tradeHistory");
  localStorage.removeItem("currentTrades");
  localStorage.removeItem("lastTradeSync");

  console.log("localStorage cache cleared");
};

/**
 * Clears sessionStorage items that might contain trade data
 */
export const clearSessionStorage = () => {
  // Get all keys in sessionStorage
  const keys = Object.keys(sessionStorage);

  // Clear trade-related items
  keys.forEach((key) => {
    if (
      key.includes("trade") ||
      key.includes("history") ||
      key.includes("offer")
    ) {
      sessionStorage.removeItem(key);
    }
  });

  // Clear any other cache keys that might exist
  sessionStorage.removeItem("tradeData");
  sessionStorage.removeItem("tradeHistory");

  console.log("sessionStorage cache cleared");
};

/**
 * Clears any in-memory cache variables that might be set at the window level
 */
export const clearMemoryCache = () => {
  // Reset any global cache objects that might exist
  if (window.__TRADE_CACHE) {
    window.__TRADE_CACHE = {};
  }

  // Clear any redux state if it exists (this is app-specific)
  if (
    window.__REDUX_STORE &&
    typeof window.__REDUX_STORE.dispatch === "function"
  ) {
    try {
      // If you have actions to clear trade state, dispatch them here
      window.__REDUX_STORE.dispatch({ type: "CLEAR_TRADE_HISTORY" });
    } catch (e) {
      console.warn("Failed to clear Redux state:", e);
    }
  }

  console.log("In-memory cache cleared");
};

/**
 * Adds a cache-busting parameter to URLs for trade-related API calls
 */
export const addCacheBuster = (url) => {
  if (!url) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cacheBuster=${window.__CACHE_BUSTER || Date.now()}`;
};

export default {
  clearAllCaches,
  clearLocalStorage,
  clearSessionStorage,
  clearMemoryCache,
  addCacheBuster,
};
