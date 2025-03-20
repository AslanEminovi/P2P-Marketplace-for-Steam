/**
 * Ultra-lightweight performance monitoring utility
 * This version uses minimal resources to avoid causing performance issues itself
 */

let resetCallbacks = [];
let isMonitoring = false;
let timeoutId = null;

/**
 * Register a callback that will be called when the emergency reset is triggered
 * @param {Function} callback
 */
export const registerResetCallback = (callback) => {
  if (typeof callback === "function") {
    resetCallbacks.push(callback);
    return true;
  }
  return false;
};

/**
 * Start monitoring for freezes with minimal overhead
 * @param {Object} options
 * @param {number} options.timeout How long until emergency reset is triggered (ms)
 */
export const startMonitoring = (options = {}) => {
  const { timeout = 8000 } = options;

  // Don't start if already monitoring
  if (isMonitoring) return;

  isMonitoring = true;
  console.log("Starting lightweight performance monitoring");

  // Set a simple timeout
  timeoutId = setTimeout(() => {
    console.warn("Emergency performance reset triggered");
    performEmergencyReset();
  }, timeout);

  return () => stopMonitoring();
};

/**
 * Stop monitoring and clear all timeouts
 */
export const stopMonitoring = () => {
  if (!isMonitoring) return;

  isMonitoring = false;

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  console.log("Stopped lightweight performance monitoring");
};

/**
 * Reset the emergency timeout
 * @param {number} newTimeout
 */
export const resetTimeout = (newTimeout = 8000) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (isMonitoring) {
    timeoutId = setTimeout(() => {
      console.warn("Emergency performance reset triggered after reset");
      performEmergencyReset();
    }, newTimeout);
  }
};

/**
 * Perform an emergency reset
 */
export const performEmergencyReset = () => {
  console.warn("Performing emergency reset");

  // Call all registered callbacks
  for (const callback of resetCallbacks) {
    try {
      callback();
    } catch (e) {
      console.error("Error in reset callback:", e);
    }
  }

  // Perform default cleanup
  try {
    // Reset body styles
    document.body.style.overflow = "";
    document.body.style.backgroundColor = "";
    document.body.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";

    // Remove modal elements
    const modalElements = document.querySelectorAll(
      ".modal-backdrop, .modal, .backdrop, .overlay"
    );
    modalElements.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  } catch (e) {
    console.error("Error in emergency reset:", e);
  }

  // Start monitoring again
  stopMonitoring();
  startMonitoring();
};

// Export as default object
export default {
  registerResetCallback,
  startMonitoring,
  stopMonitoring,
  resetTimeout,
  performEmergencyReset,
};
