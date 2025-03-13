/**
 * Application constants
 */

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";
// Add production settings
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Platform fee (as a percentage)
export const PLATFORM_FEE = 2.5;

// Item rarities with their corresponding colors
export const ITEM_RARITIES = {
  "Consumer Grade": {
    color: "#b0c3d9",
    gradient: "linear-gradient(to right, #b0c3d9, #8fa0b5)",
  },
  "Industrial Grade": {
    color: "#5e98d9",
    gradient: "linear-gradient(to right, #5e98d9, #4b7cb1)",
  },
  "Mil-Spec Grade": {
    color: "#4b69ff",
    gradient: "linear-gradient(to right, #4b69ff, #3b4fd4)",
  },
  Restricted: {
    color: "#8847ff",
    gradient: "linear-gradient(to right, #8847ff, #6a38c5)",
  },
  Classified: {
    color: "#d32ee6",
    gradient: "linear-gradient(to right, #d32ee6, #a825b9)",
  },
  Covert: {
    color: "#eb4b4b",
    gradient: "linear-gradient(to right, #eb4b4b, #c23131)",
  },
  Contraband: {
    color: "#e4ae39",
    gradient: "linear-gradient(to right, #e4ae39, #b68a2d)",
  },
};

// Item wear levels with their corresponding labels and colors
export const WEAR_LEVELS = {
  "Factory New": { value: 0, color: "#4ade80", abbreviation: "FN" },
  "Minimal Wear": { value: 1, color: "#3b82f6", abbreviation: "MW" },
  "Field-Tested": { value: 2, color: "#9333ea", abbreviation: "FT" },
  "Well-Worn": { value: 3, color: "#f97316", abbreviation: "WW" },
  "Battle-Scarred": { value: 4, color: "#ef4444", abbreviation: "BS" },
};

// Common utility functions
export const translateWear = (wearName) => {
  const wear = WEAR_LEVELS[wearName];
  return wear ? wear.abbreviation : wearName;
};

export const getRarityColor = (rarity) => {
  return ITEM_RARITIES[rarity]?.color || "#b0c3d9";
};

export const getRarityGradient = (rarity) => {
  return (
    ITEM_RARITIES[rarity]?.gradient ||
    "linear-gradient(to right, #b0c3d9, #8fa0b5)"
  );
};

export const getColorForRarity = (rarity) => {
  return ITEM_RARITIES[rarity]?.color || "#b0c3d9";
};

export const formatCurrency = (amount, currency = "USD") => {
  if (typeof amount !== "number") return "";

  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  } else if (currency === "GEL") {
    return `${amount.toFixed(2)} ₾`;
  }

  return `${amount.toFixed(2)}`;
};

// Default exchange rate
export const DEFAULT_EXCHANGE_RATE = 1.8; // 1 USD = 1.8 GEL
