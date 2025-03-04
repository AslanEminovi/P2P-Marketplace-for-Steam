const axios = require("axios");

exports.getUserInventory = async (req, res) => {
  try {
    if (!req.user || !req.user.steamId) {
      return res
        .status(401)
        .json({ error: "User not authenticated or Steam ID not found" });
    }

    const steamId = req.user.steamId;
    const apiKey = process.env.STEAMWEBAPI_KEY || "FSWJNSWYW8QSAQ6W"; // Use the hardcoded key as fallback

    // Add cache busting to ensure fresh data
    const cacheBuster = Date.now();

    // Try the new URL format first (which we used in the trade controller)
    try {
      console.log("Attempting to fetch inventory with new URL format...");
      const url = `https://steamwebapi.com/steam/api/inventory?key=${apiKey}&steam_id=${steamId}&game=730&parse=1&no_cache=1&_nocache=${cacheBuster}`;

      console.log(`Fetching inventory from: ${url}`);
      const response = await axios.get(url);

      if (response.data && response.data.success) {
        console.log("Successfully fetched inventory with new URL format");
        return res.json(response.data.items || []);
      } else {
        console.log(
          "New URL format returned unsuccessful response, trying legacy format..."
        );
        throw new Error("Unsuccessful response from new URL format");
      }
    } catch (newFormatError) {
      console.log("Error with new URL format:", newFormatError.message);
      console.log("Falling back to legacy URL format...");

      // Fall back to the original URL format
      const legacyUrl = `https://www.steamwebapi.com/steam/api/inventory`;

      const response = await axios.get(legacyUrl, {
        params: {
          key: apiKey,
          steam_id: steamId,
          game: "cs2",
          parse: 1,
          currency: "USD",
          sort: "price_max",
          no_cache: 1,
          _nocache: cacheBuster,
        },
      });

      console.log("Legacy Steam Web API Response status:", response.status);

      if (!response.data) {
        return res.status(404).json({ error: "No inventory data found" });
      }

      // Check if it's the expected format and convert if needed
      if (Array.isArray(response.data.items)) {
        return res.json(response.data.items);
      } else if (Array.isArray(response.data)) {
        return res.json(response.data);
      } else if (response.data.descriptions) {
        return res.json(response.data.descriptions);
      } else {
        // Just return whatever we got for debugging
        return res.json(response.data);
      }
    }
  } catch (err) {
    console.error(
      "Inventory fetch error:",
      err.response
        ? {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers,
          }
        : err.message || err
    );

    return res.status(500).json({
      error: "Failed to fetch Steam inventory.",
      details: err.response ? err.response.data : err.message,
    });
  }
};
