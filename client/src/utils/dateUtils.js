/**
 * Format a date string or timestamp into a human-readable format
 * @param {string|number|Date} dateInput - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return "N/A";

  try {
    const date = new Date(dateInput);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    // Default formatting options
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    // Merge with user-provided options
    const formatOptions = { ...defaultOptions, ...options };

    return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param {string|number|Date} dateInput - The date to format
 * @returns {string} Relative time string
 */
export const timeAgo = (dateInput) => {
  if (!dateInput) return "N/A";

  try {
    const date = new Date(dateInput);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Convert to seconds
    const seconds = Math.floor(diff / 1000);

    // Less than a minute
    if (seconds < 60) {
      return "just now";
    }

    // Minutes
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }

    // Hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    // Days
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    // Weeks
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }

    // Months
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }

    // Years
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  } catch (error) {
    console.error("Error calculating time ago:", error);
    return "Date error";
  }
};

/**
 * Get formatted date only (without time)
 * @param {string|number|Date} dateInput - The date to format
 * @returns {string} Formatted date string (date only)
 */
export const formatDateOnly = (dateInput) => {
  return formatDate(dateInput, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: undefined,
    minute: undefined,
    second: undefined,
  });
};

/**
 * Get formatted time only (without date)
 * @param {string|number|Date} dateInput - The date to format
 * @returns {string} Formatted time string (time only)
 */
export const formatTimeOnly = (dateInput) => {
  return formatDate(dateInput, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "2-digit",
    second: undefined,
    hour12: true,
  });
};

/**
 * Check if a date is today
 * @param {string|number|Date} dateInput - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (dateInput) => {
  if (!dateInput) return false;

  try {
    const date = new Date(dateInput);
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error("Error checking if date is today:", error);
    return false;
  }
};

export default {
  formatDate,
  timeAgo,
  formatDateOnly,
  formatTimeOnly,
  isToday,
};
