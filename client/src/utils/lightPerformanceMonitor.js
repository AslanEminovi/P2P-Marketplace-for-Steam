/**
 * Ultra-lightweight performance monitoring utility
 * This version uses minimal resources to avoid causing performance issues itself
 */

let resetCallbacks = [];
let isMonitoring = false;
let timeoutId = null;
let emergencyTimeoutTriggered = false;
let lastResetTime = 0;

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
  const { timeout = 15000 } = options; // Increase default timeout to 15 seconds

  // Don't start if already monitoring
  if (isMonitoring) return;

  // Don't restart monitoring too quickly - prevent cascading resets
  const now = Date.now();
  if (now - lastResetTime < 3000) {
    console.log("Skipping monitor start - too soon after last reset");
    return;
  }

  isMonitoring = true;
  emergencyTimeoutTriggered = false;
  console.log("Starting lightweight performance monitoring");

  // Set a simple timeout
  timeoutId = setTimeout(() => {
    // Only trigger emergency reset if no reset has happened recently
    if (!emergencyTimeoutTriggered) {
      emergencyTimeoutTriggered = true;
      console.warn("Emergency performance reset triggered");
      performEmergencyReset();
    }
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
export const resetTimeout = (newTimeout = 15000) => {
  // Increased timeout here too
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (isMonitoring) {
    timeoutId = setTimeout(() => {
      if (!emergencyTimeoutTriggered) {
        emergencyTimeoutTriggered = true;
        console.warn("Emergency performance reset triggered after reset");
        performEmergencyReset();
      }
    }, newTimeout);
  }
};

/**
 * Perform an emergency reset
 */
export const performEmergencyReset = () => {
  console.warn("Performing emergency reset");

  // Record last reset time to prevent cascading resets
  lastResetTime = Date.now();

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

  // Start monitoring again, but with a delay to prevent cascading resets
  stopMonitoring();
  setTimeout(() => {
    startMonitoring();
  }, 1000);
};

// Export as default object
export default {
  registerResetCallback,
  startMonitoring,
  stopMonitoring,
  resetTimeout,
  performEmergencyReset,
};
