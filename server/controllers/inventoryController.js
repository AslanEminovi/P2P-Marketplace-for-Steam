const axios = require("axios");
const User = require("../models/User");

exports.getUserInventory = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.steamId) {
      return res
        .status(401)
        .json({ error: "User not authenticated or Steam ID not found" });
    }

    const steamId = req.user.steamId;
    const apiKey = process.env.STEAMWEBAPI_KEY;

    // Validate API key
    if (!apiKey) {
      console.error("STEAMWEBAPI_KEY is not set in environment variables");
      return res.status(500).json({
        error: "Server configuration error: Steam Web API key not configured",
        code: "MISSING_API_KEY",
      });
    }

    console.log(`Fetching inventory for Steam ID: ${steamId}`);
    const url = `https://www.steamwebapi.com/steam/api/inventory`;

    // Try to fetch inventory with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Inventory fetch attempt ${attempts}/${maxAttempts}`);

        // Always get fresh inventory data with cache busting
        const response = await axios.get(url, {
          params: {
            key: apiKey,
            steam_id: steamId,
            game: "cs2",
            parse: 1,
            currency: "USD",
            sort: "price_max",
            // Use no_cache=1 to ensure traded items are removed from inventory
            no_cache: 1,
            // Keep timestamp as additional cache busting
            _nocache: Date.now(),
          },
          timeout: 10000, // 10 second timeout
        });

        // Check response validity
        if (!response.data) {
          throw new Error("Empty response received from Steam Web API");
        }

        if (response.data.error) {
          throw new Error(`Steam Web API error: ${response.data.error}`);
        }

        // Update the user's last inventory fetch timestamp
        try {
          await User.findByIdAndUpdate(req.user._id, {
            $set: { steamInventoryLastFetched: new Date() },
          });
        } catch (userUpdateErr) {
          console.warn(
            "Could not update user's inventory fetch timestamp:",
            userUpdateErr
          );
          // Continue anyway as this is not critical
        }

        console.log(
          `Successfully fetched inventory for ${steamId} with ${
            response.data.length || 0
          } items`
        );

        // Return the parsed inventory data
        return res.json(response.data);
      } catch (fetchError) {
        lastError = fetchError;
        console.error(
          `Inventory fetch attempt ${attempts} failed:`,
          fetchError.message
        );

        // Only retry on network errors or 5xx server errors
        if (
          !fetchError.response ||
          (fetchError.response && fetchError.response.status >= 500)
        ) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
          continue;
        } else {
          // Don't retry on client errors (4xx)
          break;
        }
      }
    }

    // If we get here, all attempts failed
    console.error(
      "All inventory fetch attempts failed:",
      lastError.response
        ? {
            status: lastError.response.status,
            data: lastError.response.data,
            headers: lastError.response.headers,
          }
        : lastError.message
    );

    // Provide a more specific error message based on the failure reason
    if (lastError.response) {
      if (
        lastError.response.status === 401 ||
        lastError.response.status === 403
      ) {
        return res.status(lastError.response.status).json({
          error:
            "API authentication failed. Please check your Steam Web API key.",
          code: "API_AUTH_ERROR",
        });
      } else if (lastError.response.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT",
        });
      } else if (lastError.response.status === 404) {
        return res.status(404).json({
          error:
            "No inventory data found. Your Steam inventory may be private.",
          code: "INVENTORY_NOT_FOUND",
        });
      } else {
        return res.status(lastError.response.status).json({
          error: "Failed to fetch Steam inventory.",
          details: lastError.response.data,
          code: "API_ERROR",
        });
      }
    } else if (lastError.code === "ECONNABORTED") {
      return res.status(504).json({
        error:
          "Connection timed out when fetching inventory. Please try again later.",
        code: "TIMEOUT",
      });
    } else {
      return res.status(500).json({
        error:
          "Network error when fetching inventory. Please check your connection and try again.",
        details: lastError.message,
        code: "NETWORK_ERROR",
      });
    }
  } catch (err) {
    console.error("Unexpected error in inventory controller:", err);
    return res.status(500).json({
      error: "An unexpected error occurred when fetching your inventory.",
      details: err.message,
      code: "UNEXPECTED_ERROR",
    });
  }
};
