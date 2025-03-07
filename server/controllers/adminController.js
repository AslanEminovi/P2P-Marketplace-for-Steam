const axios = require("axios");

/**
 * Check if the Steam Web API key is valid
 * @route GET /admin/check-api-keys
 * @access Admin
 */
exports.checkApiKeys = async (req, res) => {
  try {
    const results = {
      steamWebApi: { valid: false, message: "" },
      steamApi: { valid: false, message: "" },
    };

    // Check Steam Web API key
    const steamWebApiKey = process.env.STEAMWEBAPI_KEY;
    if (!steamWebApiKey) {
      results.steamWebApi.message =
        "STEAMWEBAPI_KEY is not set in environment variables";
    } else {
      try {
        // Try to make a test request to check if the key is valid
        const testUrl = `https://www.steamwebapi.com/steam/api/info`;
        const response = await axios.get(testUrl, {
          params: { key: steamWebApiKey },
          timeout: 5000,
        });

        if (response.data && !response.data.error) {
          results.steamWebApi.valid = true;
          results.steamWebApi.message = "API key is valid";
        } else {
          results.steamWebApi.message =
            response.data?.error || "Unknown API error";
        }
      } catch (err) {
        results.steamWebApi.message = err.response?.data?.error || err.message;
      }
    }

    // Check Steam API key
    const steamApiKey = process.env.STEAM_API_KEY;
    if (!steamApiKey) {
      results.steamApi.message =
        "STEAM_API_KEY is not set in environment variables";
    } else {
      try {
        // Try to make a test request to check if the key is valid
        const testUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`;
        const response = await axios.get(testUrl, {
          params: {
            key: steamApiKey,
            steamids: "76561198106757508", // Example Steam ID
          },
          timeout: 5000,
        });

        if (response.data && response.data.response) {
          results.steamApi.valid = true;
          results.steamApi.message = "API key is valid";
        } else {
          results.steamApi.message = "Invalid response format from Steam API";
        }
      } catch (err) {
        results.steamApi.message = err.response?.data?.error || err.message;
      }
    }

    // Return the results
    res.json({
      success: true,
      results,
      keySummary: {
        steamWebApiKeySet: !!steamWebApiKey,
        steamWebApiKeyValid: results.steamWebApi.valid,
        steamApiKeySet: !!steamApiKey,
        steamApiKeyValid: results.steamApi.valid,
      },
    });
  } catch (error) {
    console.error("Error checking API keys:", error);
    res.status(500).json({ error: "Failed to check API keys" });
  }
};
