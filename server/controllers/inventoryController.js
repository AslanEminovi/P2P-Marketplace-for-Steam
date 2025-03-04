const axios = require("axios");
const User = require("../models/User");

// Simple in-memory cache with TTL
const inventoryCache = {};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Get user's Steam inventory
exports.getUserInventory = async (req, res) => {
  try {
    // Check if user is authenticated and has Steam linked
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const user = await User.findById(req.user.id);
    if (!user.steamId) {
      return res.status(400).json({ error: "Steam account not linked" });
    }

    const steamId = user.steamId;
    const apiKey = process.env.STEAM_API_KEY || "FSWJNSWYW8QSAQ6W"; // Fallback to hardcoded key
    const forceRefresh = req.query.refresh === "true";

    // Check cache first (unless force refresh is requested)
    const cacheKey = `inventory_${steamId}`;
    const cachedData = inventoryCache[cacheKey];
    const now = Date.now();

    // If we have cached data that's not expired and force refresh is not requested
    if (
      cachedData &&
      !forceRefresh &&
      now - cachedData.timestamp < CACHE_DURATION_MS
    ) {
      console.log(
        `Using cached inventory for user ${steamId}, cache age: ${Math.round(
          (now - cachedData.timestamp) / 1000
        )} seconds`
      );
      // Return cached data with a warning about cache use
      const cacheAgeMinutes = Math.round((now - cachedData.timestamp) / 60000);
      return res.json({
        items: cachedData.data,
        warning: `Using cached inventory data from ${cacheAgeMinutes} minute${
          cacheAgeMinutes !== 1 ? "s" : ""
        } ago. API rate limits may prevent refreshing.`,
        fromCache: true,
      });
    }

    // Add cache busting for fresh data
    const cacheBuster = Math.floor(Math.random() * 1000000);

    // Try the new URL format first
    const newFormatUrl = `https://api.steamwebapi.com/steam/inventory?key=${apiKey}&steamid=${steamId}&appid=730&contextid=2&raw=1&cache=${cacheBuster}`;
    console.log(
      `Attempting to fetch inventory with new format URL for user ${steamId}`
    );

    try {
      const response = await axios.get(newFormatUrl);
      console.log(`New format API response status: ${response.status}`);

      if (response.data && response.status === 200) {
        // Store in cache
        inventoryCache[cacheKey] = {
          data: response.data,
          timestamp: Date.now(),
        };

        console.log(
          `Successfully fetched and cached inventory for user ${steamId} using new format`
        );
        return res.json(response.data);
      }
    } catch (apiError) {
      console.log(`New format API error: ${apiError.message}`);
      console.log(
        `New format API response:`,
        apiError.response?.data || "No response data"
      );

      // Check for rate limit or payment required errors
      if (
        apiError.response?.status === 402 ||
        apiError.response?.status === 429
      ) {
        console.log("API rate limit exceeded");

        // Return cached data if available (even if expired)
        if (cachedData) {
          console.log(
            `Returning expired cache due to rate limit for user ${steamId}`
          );
          const cacheAgeMinutes = Math.round(
            (now - cachedData.timestamp) / 60000
          );
          return res.json({
            items: cachedData.data,
            warning: `Steam API rate limit exceeded. Using cached data from ${cacheAgeMinutes} minute${
              cacheAgeMinutes !== 1 ? "s" : ""
            } ago.`,
            fromCache: true,
            rateLimitExceeded: true,
          });
        }

        // If no cache available, return the error
        return res.status(apiError.response.status).json({
          error: "Steam API rate limit exceeded. Please try again later.",
          rateLimitExceeded: true,
        });
      }

      // For other errors, try the legacy format
      console.log("Trying legacy format as fallback...");
    }

    // Fallback to legacy URL format
    const legacyFormatUrl = `https://api.steamwebapi.com/ISteamEconomy/GetAssetClassInfo/v1?key=${apiKey}&appid=730&language=en_US&class_count=1&cache=${cacheBuster}`;
    console.log(
      `Attempting to fetch inventory with legacy format URL for user ${steamId}`
    );

    try {
      const response = await axios.get(legacyFormatUrl);
      console.log(`Legacy format API response status: ${response.status}`);

      if (response.data && response.status === 200) {
        // Store in cache
        inventoryCache[cacheKey] = {
          data: response.data.result || response.data,
          timestamp: Date.now(),
        };

        console.log(
          `Successfully fetched and cached inventory for user ${steamId} using legacy format`
        );
        return res.json(response.data.result || response.data);
      } else {
        return res
          .status(404)
          .json({ error: "Failed to fetch inventory data" });
      }
    } catch (apiError) {
      console.error(`Legacy format API error: ${apiError.message}`);
      console.error(
        `Legacy format API response:`,
        apiError.response?.data || "No response data"
      );

      // Check for rate limit or payment required errors
      if (
        apiError.response?.status === 402 ||
        apiError.response?.status === 429
      ) {
        console.log("API rate limit exceeded on legacy API too");

        // Return cached data if available (even if expired)
        if (cachedData) {
          console.log(
            `Returning expired cache due to rate limit for user ${steamId}`
          );
          const cacheAgeMinutes = Math.round(
            (now - cachedData.timestamp) / 60000
          );
          return res.json({
            items: cachedData.data,
            warning: `Steam API rate limit exceeded. Using cached data from ${cacheAgeMinutes} minute${
              cacheAgeMinutes !== 1 ? "s" : ""
            } ago.`,
            fromCache: true,
            rateLimitExceeded: true,
          });
        }
      }

      if (apiError.response) {
        return res.status(apiError.response.status).json({
          error:
            apiError.response.data?.error || "Failed to fetch inventory data",
          details: apiError.response.data,
        });
      }

      return res
        .status(500)
        .json({ error: "Internal server error while fetching inventory" });
    }
  } catch (err) {
    console.error("Server error in getUserInventory:", err);
    return res
      .status(500)
      .json({ error: "Server error while fetching inventory" });
  }
};
