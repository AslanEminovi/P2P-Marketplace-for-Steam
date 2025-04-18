/**
 * Format a date string to a human-readable format
 * @param {string|Date} dateString - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  // Default options
  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };

  // Check if the date is today
  const isToday = new Date().toDateString() === date.toDateString();

  if (isToday && !options.showFullDate) {
    return `Today at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // Check if the date is yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  if (isYesterday && !options.showFullDate) {
    return `Yesterday at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // For dates within the last week, show day of week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (date > oneWeekAgo && !options.showFullDate) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", defaultOptions);
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD", options = {}) => {
  if (amount === undefined || amount === null) return "N/A";

  // Convert string amounts to numbers
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Default formatting options
  const defaultOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      ...defaultOptions,
    }).format(numAmount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `$${numAmount.toFixed(2)}`;
  }
};

/**
 * Format a number with commas and optional decimal places
 * @param {number} num - The number to format
 * @param {number} decimalPlaces - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimalPlaces = 0) => {
  if (num === undefined || num === null) return "N/A";

  const numValue = typeof num === "string" ? parseFloat(num) : num;

  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(numValue);
  } catch (error) {
    console.error("Error formatting number:", error);
    return numValue
      .toFixed(decimalPlaces)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

/**
 * Format a file size in bytes to a human-readable format
 * @param {number} bytes - The file size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${
    sizes[i]
  }`;
};

/**
 * Format a duration in milliseconds to a human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (ms) => {
  if (!ms) return "N/A";

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};
