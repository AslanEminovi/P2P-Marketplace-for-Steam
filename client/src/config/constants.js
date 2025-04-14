/**
 * Application constants
 */

// Log the environment variable values for debugging
console.log("Environment: ", process.env.NODE_ENV);
console.log("API URL from env: ", process.env.REACT_APP_API_URL);

// API base URL
export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";
console.log("Using API_URL: ", API_URL);

// Add production settings
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
console.log("Is Production: ", IS_PRODUCTION);

// Platform fee (as a percentage)
export const PLATFORM_FEE = 2.5;

// Application constants
export const APP_NAME = "CS2 Marketplace";
export const COMPANY_NAME = "CS2 Marketplace Georgia";
export const SUPPORT_EMAIL = "support@cs2marketplace.com";

// Item categories
export const ITEM_CATEGORIES = {
  WEAPONS: "weapons",
  KNIVES: "knives",
  GLOVES: "gloves",
  AGENTS: "agents",
  STICKERS: "stickers",
  CASES: "cases",
  KEYS: "keys",
  OTHER: "other",
};

// Item rarities with colors
export const ITEM_RARITIES = {
  CONSUMER: { name: "Consumer", color: "#b0c3d9" },
  INDUSTRIAL: { name: "Industrial", color: "#5e98d9" },
  MIL_SPEC: { name: "Mil-Spec", color: "#4b69ff" },
  RESTRICTED: { name: "Restricted", color: "#8847ff" },
  CLASSIFIED: { name: "Classified", color: "#d32ee6" },
  COVERT: { name: "Covert", color: "#eb4b4b" },
  EXTRAORDINARY: { name: "Extraordinary", color: "#ffd700" },
  CONTRABAND: { name: "Contraband", color: "#e4ae39" },
};

// Item wear with ranges
export const ITEM_WEAR = {
  FACTORY_NEW: { name: "Factory New", range: [0, 0.07] },
  MINIMAL_WEAR: { name: "Minimal Wear", range: [0.07, 0.15] },
  FIELD_TESTED: { name: "Field-Tested", range: [0.15, 0.38] },
  WELL_WORN: { name: "Well-Worn", range: [0.38, 0.45] },
  BATTLE_SCARRED: { name: "Battle-Scarred", range: [0.45, 1] },
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

// Trade statuses
export const TRADE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  FAILED: "failed",
};

// Socket events
export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  NEW_LISTING: "new_listing",
  LISTING_SOLD: "listing_sold",
  TRADE_UPDATED: "trade_updated",
  NOTIFICATION: "notification",
  USER_UPDATED: "user_updated",
};

// Currency formatting
export const CURRENCY = {
  SYMBOL: "₾", // Georgian Lari
  CODE: "GEL",
  LOCALE: "ka-GE",
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
