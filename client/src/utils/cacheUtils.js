/**
 * Utility functions for client-side caching using localStorage
 */

/**
 * Get a cached item by key with expiration check
 * @param {string} key - The cache key
 * @returns {any|null} - The cached value or null if expired/not found
 */
export const getCachedItem = (key) => {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    const { value, expiry } = JSON.parse(cachedData);

    // Check if the cache has expired
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch (error) {
    console.error("Error retrieving cached item:", error);
    // If there's any error, clear the cache for this key
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Set a cached item with optional expiration
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {number} [ttl] - Time to live in milliseconds
 */
export const setCachedItem = (key, value, ttl = null) => {
  try {
    const cacheData = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };

    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting cached item:", error);
    // If storage is full, clear less important caches
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      clearOldCaches();
    }
  }
};

/**
 * Remove a cached item by key
 * @param {string} key - The cache key
 */
export const removeCachedItem = (key) => {
  localStorage.removeItem(key);
};

/**
 * Clear all caches that match a pattern
 * @param {string|RegExp} pattern - The pattern to match against keys
 */
export const clearCachesByPattern = (pattern) => {
  const keyRegex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (keyRegex.test(key)) {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Clear all expired caches
 */
export const clearExpiredCaches = () => {
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) continue;

      const { expiry } = JSON.parse(cachedData);
      if (expiry && now > expiry) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      // If we can't parse the data, it's not one of our cache entries
      continue;
    }
  }
};

/**
 * Clear old caches when storage is full
 * Strategy: Clear expired caches first, then oldest caches
 */
export const clearOldCaches = () => {
  // First try clearing expired caches
  clearExpiredCaches();

  try {
    // Test if we have storage space now
    localStorage.setItem("__test_cache_space", "1");
    localStorage.removeItem("__test_cache_space");
    return;
  } catch (error) {
    // Still no space, we need to clear more aggressively
  }

  // Collect all cache entries with their metadata
  const cacheEntries = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) continue;

      const data = JSON.parse(cachedData);
      if (data.expiry) {
        // Only consider our cache entries
        cacheEntries.push({
          key,
          expiry: data.expiry || Infinity,
        });
      }
    } catch (error) {
      continue;
    }
  }

  // Sort by expiry (ascending, so oldest first)
  cacheEntries.sort((a, b) => a.expiry - b.expiry);

  // Clear 25% of the caches
  const clearCount = Math.ceil(cacheEntries.length * 0.25);

  for (let i = 0; i < clearCount && i < cacheEntries.length; i++) {
    localStorage.removeItem(cacheEntries[i].key);
  }
};
