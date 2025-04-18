/**
 * Utility functions for formatting values
 */

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: USD)
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
  if (amount == null) return "$0.00";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

/**
 * Format a date string
 * @param {string|Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} The formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return "";

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.warn("Invalid date:", date);
      return "";
    }
    return new Intl.DateTimeFormat("en-US", mergedOptions).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param {string|Date} date - The date to format
 * @returns {string} The relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.warn("Invalid date for relative time:", date);
      return "";
    }

    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) {
      return "just now";
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return formatDate(dateObj, { hour: undefined, minute: undefined });
    }
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "";
  }
};
