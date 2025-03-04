const axios = require("axios");

exports.getUserInventory = async (req, res) => {
  try {
    if (!req.user || !req.user.steamId) {
      return res
        .status(401)
        .json({ error: "User not authenticated or Steam ID not found" });
    }

    const steamId = req.user.steamId;
    const apiKey = process.env.STEAMWEBAPI_KEY;
    const url = `https://www.steamwebapi.com/steam/api/inventory`;

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
        _nocache: Date.now()
      },
    });

    // Log the response for debugging
    console.log("Steam Web API Response:", {
      status: response.status,
      headers: response.headers,
      data: response.data,
    });

    if (!response.data) {
      return res.status(404).json({ error: "No inventory data found" });
    }

    // Return the parsed inventory data
    return res.json(response.data);
  } catch (err) {
    console.error(
      "Inventory fetch error:",
      err.response
        ? {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers,
          }
        : err
    );

    return res.status(500).json({
      error: "Failed to fetch Steam inventory.",
      details: err.response ? err.response.data : err.message,
    });
  }
};
