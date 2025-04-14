const express = require("express");
const axios = require("axios");
const Trade = require("../models/trade");
const { checkAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/users", checkAdmin, async (req, res) => {
  try {
    // ... existing code ...
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get Steam inventory for a user by Steam ID
router.get("/user-inventory/:steamId", checkAdmin, async (req, res) => {
  try {
    const { steamId } = req.params;

    if (!steamId) {
      return res.status(400).json({ error: "Steam ID is required" });
    }

    // Get Steam API key from environment variables
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!steamApiKey) {
      return res.status(500).json({ error: "Steam API key not configured" });
    }

    // Call the Steam API to get the user's inventory
    // The URL format follows Steam Web API specifications
    const steamInventoryUrl = `https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1/?key=${steamApiKey}&steamid=${steamId}&appid=730&contextid=2&get_descriptions=true`;

    console.log(`Fetching Steam inventory for SteamID: ${steamId}`);

    const response = await axios.get(steamInventoryUrl, {
      timeout: 10000, // 10 second timeout
    });

    if (
      !response.data ||
      !response.data.result ||
      !response.data.result.items
    ) {
      return res
        .status(404)
        .json({ error: "No inventory data found or private inventory" });
    }

    // Process the inventory items to make them easier to work with
    const items = response.data.result.items;
    const descriptions = response.data.result.descriptions;

    // Map the descriptions to the items
    const processedItems = items.map((item) => {
      const description = descriptions.find(
        (desc) =>
          desc.classid === item.classid && desc.instanceid === item.instanceid
      );

      if (!description) {
        return {
          ...item,
          name: "Unknown Item",
          icon_url: "",
        };
      }

      // Extract wear value from market_hash_name if it exists
      let wear = "";
      const wearMatch =
        description.market_hash_name &&
        description.market_hash_name.match(
          /(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)$/
        );
      if (wearMatch) {
        wear = wearMatch[1];
      }

      // Extract rarity from tags
      let rarity = "";
      if (description.tags) {
        const rarityTag = description.tags.find(
          (tag) => tag.category === "Rarity"
        );
        if (rarityTag) {
          rarity = rarityTag.name;
        }
      }

      return {
        ...item,
        assetid: item.assetid || item.id,
        name: description.name || description.market_hash_name,
        marketname: description.market_hash_name,
        icon_url: description.icon_url
          ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`
          : "",
        wear,
        rarity,
        tradable: description.tradable === 1,
      };
    });

    console.log(
      `Found ${processedItems.length} inventory items for SteamID: ${steamId}`
    );

    res.json(processedItems);
  } catch (error) {
    console.error("Error fetching user inventory:", error);

    // Provide more specific error messages based on the error
    if (error.response) {
      if (error.response.status === 403) {
        return res
          .status(403)
          .json({ error: "Inventory is private or inaccessible" });
      }
      return res.status(error.response.status).json({
        error: `Steam API error: ${
          error.response.data?.error || error.message
        }`,
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Steam API request timed out" });
    }

    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
});

// Get trade history for a specific user
router.get("/user-trades/:userId", checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Query the database for trades involving this user
    // The user could be either a buyer or a seller
    const trades = await Trade.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .sort({ createdAt: -1 }) // Sort by most recent first
      .populate("item", "name marketHashName imageUrl")
      .limit(100); // Limit to 100 most recent trades

    console.log(`Found ${trades.length} trades for user ${userId}`);

    // Process the trades to make them easier to work with in the frontend
    const processedTrades = trades.map((trade) => {
      const tradeObj = trade.toObject();

      // Add simplified properties for easier rendering
      return {
        ...tradeObj,
        itemName: tradeObj.item?.marketHashName || tradeObj.itemName,
        itemImage: tradeObj.item?.imageUrl || tradeObj.itemImage,
        // Convert prices to numbers if they are strings
        price:
          typeof tradeObj.price === "string"
            ? parseFloat(tradeObj.price)
            : tradeObj.price,
      };
    });

    res.json(processedTrades);
  } catch (error) {
    console.error("Error fetching user trades:", error);
    res.status(500).json({ error: "Failed to fetch trade history" });
  }
});

module.exports = router;
