/**
 * Status utilities for trade-related operations
 * Contains constants and helper functions for working with trade statuses
 */

// Status variant definitions with colors and labels
export const tradeStatusVariants = {
  // Pending states
  created: {
    color: "#3b82f6", // Blue
    label: "Created",
    icon: "plus-circle",
    description: "Trade has been created but not yet initiated",
  },
  pending: {
    color: "#3b82f6", // Blue
    label: "Pending",
    icon: "clock",
    description: "Trade is pending acceptance",
  },
  awaiting_seller: {
    color: "#f59e0b", // Amber
    label: "Awaiting Seller",
    icon: "user-tie",
    description: "Waiting for seller to accept the trade",
  },
  awaiting_buyer: {
    color: "#f59e0b", // Amber
    label: "Awaiting Buyer",
    icon: "user",
    description: "Waiting for buyer to confirm receipt",
  },
  offer_sent: {
    color: "#8b5cf6", // Purple
    label: "Offer Sent",
    icon: "paper-plane",
    description: "The Steam trade offer has been sent",
  },
  awaiting_confirmation: {
    color: "#8b5cf6", // Purple
    label: "Awaiting Confirmation",
    icon: "check-circle",
    description: "Waiting for trade confirmation",
  },

  // Final states
  completed: {
    color: "#10b981", // Green
    label: "Completed",
    icon: "check-circle",
    description: "Trade successfully completed",
  },
  cancelled: {
    color: "#ef4444", // Red
    label: "Cancelled",
    icon: "times-circle",
    description: "Trade was cancelled",
  },
  rejected: {
    color: "#ef4444", // Red
    label: "Rejected",
    icon: "times-circle",
    description: "Trade was rejected",
  },
  expired: {
    color: "#6b7280", // Gray
    label: "Expired",
    icon: "hourglass-end",
    description: "Trade expired due to inactivity",
  },
  failed: {
    color: "#ef4444", // Red
    label: "Failed",
    icon: "exclamation-circle",
    description: "Trade failed to complete",
  },

  // Alternative capitalized versions
  CREATED: {
    color: "#3b82f6",
    label: "Created",
    icon: "plus-circle",
  },
  PENDING: {
    color: "#3b82f6",
    label: "Pending",
    icon: "clock",
  },
  AWAITING_SELLER: {
    color: "#f59e0b",
    label: "Awaiting Seller",
    icon: "user-tie",
  },
  AWAITING_BUYER: {
    color: "#f59e0b",
    label: "Awaiting Buyer",
    icon: "user",
  },
  COMPLETED: {
    color: "#10b981",
    label: "Completed",
    icon: "check-circle",
  },
  CANCELLED: {
    color: "#ef4444",
    label: "Cancelled",
    icon: "times-circle",
  },
  REJECTED: {
    color: "#ef4444",
    label: "Rejected",
    icon: "times-circle",
  },
  EXPIRED: {
    color: "#6b7280",
    label: "Expired",
    icon: "hourglass-end",
  },
  FAILED: {
    color: "#ef4444",
    label: "Failed",
    icon: "exclamation-circle",
  },
};

/**
 * Get color for a trade status
 * @param {string} status - Trade status
 * @returns {string} Color hex code
 */
export const getStatusColor = (status) => {
  return tradeStatusVariants[status]?.color || "#6b7280"; // Default gray
};

/**
 * Get display label for a trade status
 * @param {string} status - Trade status
 * @returns {string} User-friendly status label
 */
export const getStatusLabel = (status) => {
  return tradeStatusVariants[status]?.label || status;
};

/**
 * Check if a status is a final state
 * @param {string} status - Trade status
 * @returns {boolean} True if status is final
 */
export const isFinalStatus = (status) => {
  const finalStatuses = [
    "completed",
    "cancelled",
    "rejected",
    "expired",
    "failed",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "EXPIRED",
    "FAILED",
  ];
  return finalStatuses.includes(status);
};

/**
 * Check if a status is an active state
 * @param {string} status - Trade status
 * @returns {boolean} True if status is active
 */
export const isActiveStatus = (status) => {
  return !isFinalStatus(status);
};

export default {
  tradeStatusVariants,
  getStatusColor,
  getStatusLabel,
  isFinalStatus,
  isActiveStatus,
};
