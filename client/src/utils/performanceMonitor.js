/**
 * Performance monitoring utility to detect and prevent browser freezing
 */

// Track UI responsiveness
let lastFrameTime = Date.now();
let monitoringActive = false;
let monitorInterval = null;
let emergencyCallbacks = [];
let emergencyTimeoutId = null;

/**
 * Start monitoring browser performance
 * @param {Object} options Configuration options
 * @param {number} options.checkInterval How often to check frame timing (ms)
 * @param {number} options.freezeThreshold How long between frames indicates a freeze (ms)
 * @param {number} options.emergencyTimeout Emergency timeout to recover from complete freeze (ms)
 * @param {Function} options.onFreeze Callback when freeze is detected
 * @param {Function} options.onEmergency Callback when emergency recovery is triggered
 */
export const startMonitoring = (options = {}) => {
  const {
    checkInterval = 300,
    freezeThreshold = 1000,
    emergencyTimeout = 10000,
    onFreeze = null,
    onEmergency = null,
  } = options;

  // Don't start twice
  if (monitoringActive) return;

  console.log("Starting performance monitoring");
  monitoringActive = true;
  lastFrameTime = Date.now();

  // Register callbacks
  if (onFreeze) emergencyCallbacks.push(onFreeze);
  if (onEmergency) emergencyCallbacks.push(onEmergency);

  // Set frame time on each animation frame
  const frameCallback = () => {
    lastFrameTime = Date.now();
    if (monitoringActive) {
      requestAnimationFrame(frameCallback);
    }
  };
  requestAnimationFrame(frameCallback);

  // Check for frozen frames periodically
  monitorInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastFrame = now - lastFrameTime;

    // If we haven't had a frame in a while, browser might be frozen
    if (timeSinceLastFrame > freezeThreshold) {
      console.warn(
        `UI may be frozen - ${timeSinceLastFrame}ms since last frame`
      );

      // Call all emergency callbacks
      for (const callback of emergencyCallbacks) {
        try {
          callback("freeze");
        } catch (e) {
          console.error("Error in freeze callback:", e);
        }
      }
    }
  }, checkInterval);

  // Set emergency timeout for complete browser freeze
  emergencyTimeoutId = setTimeout(() => {
    console.error("Emergency timeout triggered after", emergencyTimeout, "ms");

    // Call all emergency callbacks with emergency reason
    for (const callback of emergencyCallbacks) {
      try {
        callback("emergency_timeout");
      } catch (e) {
        console.error("Error in emergency callback:", e);
      }
    }

    // Stop monitoring after emergency
    stopMonitoring();
  }, emergencyTimeout);

  // Monitor events that indicate UI responsiveness
  const eventTypes = ["mousemove", "click", "keydown", "touchstart", "scroll"];
  const eventHandler = () => {
    lastFrameTime = Date.now();
  };

  // Add event listeners
  eventTypes.forEach((type) => {
    window.addEventListener(type, eventHandler, { passive: true });
  });

  // Return clean-up function
  return () => {
    stopMonitoring();
    eventTypes.forEach((type) => {
      window.removeEventListener(type, eventHandler);
    });
  };
};

/**
 * Register a callback to be called when a UI freeze is detected
 * @param {Function} callback The function to call when freeze is detected
 */
export const registerEmergencyCallback = (callback) => {
  if (typeof callback === "function") {
    emergencyCallbacks.push(callback);
  }
};

/**
 * Stop monitoring browser performance
 */
export const stopMonitoring = () => {
  if (!monitoringActive) return;

  console.log("Stopping performance monitoring");
  monitoringActive = false;

  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }

  if (emergencyTimeoutId) {
    clearTimeout(emergencyTimeoutId);
    emergencyTimeoutId = null;
  }
};

/**
 * Reset the emergency timeout
 * Called when a potentially heavy operation is about to start
 */
export const resetEmergencyTimeout = (newTimeout = 10000) => {
  if (emergencyTimeoutId) {
    clearTimeout(emergencyTimeoutId);
  }

  emergencyTimeoutId = setTimeout(() => {
    console.error("Emergency timeout triggered after reset");

    // Call all emergency callbacks
    for (const callback of emergencyCallbacks) {
      try {
        callback("emergency_timeout_after_reset");
      } catch (e) {
        console.error("Error in emergency callback:", e);
      }
    }

    // Stop monitoring
    stopMonitoring();
  }, newTimeout);
};

/**
 * Default emergency recovery function
 * Cleans up common UI states that might be stuck
 */
export const performEmergencyRecovery = (reason = "unknown") => {
  console.warn(`Performing emergency recovery due to: ${reason}`);

  // Reset body styles
  document.body.style.overflow = "";
  document.body.style.backgroundColor = "";
  document.body.classList.remove("modal-open");
  document.body.style.position = "";
  document.body.style.top = "";

  // Remove backdrops
  const backdrops = document.querySelectorAll(
    ".modal-backdrop, .backdrop, .overlay"
  );
  backdrops.forEach((el) => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Reset any fixed positioning
  const mainContent = document.querySelector("main");
  if (mainContent) {
    mainContent.style.position = "";
    mainContent.style.top = "";
  }

  // Display a message that the page recovered from an error
  const errorDiv = document.createElement("div");
  errorDiv.style.position = "fixed";
  errorDiv.style.top = "10px";
  errorDiv.style.left = "50%";
  errorDiv.style.transform = "translateX(-50%)";
  errorDiv.style.backgroundColor = "rgba(255, 59, 48, 0.9)";
  errorDiv.style.color = "white";
  errorDiv.style.padding = "10px 20px";
  errorDiv.style.borderRadius = "5px";
  errorDiv.style.zIndex = "10000";
  errorDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
  errorDiv.style.maxWidth = "80%";
  errorDiv.style.textAlign = "center";
  errorDiv.innerHTML =
    "Emergency recovery performed due to browser freezing. Please refresh if you experience issues.";

  document.body.appendChild(errorDiv);

  // Remove the message after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 10000);

  // Return a value indicating if recovery was successful
  return true;
};

// Register the default emergency handler
registerEmergencyCallback(performEmergencyRecovery);

export default {
  startMonitoring,
  stopMonitoring,
  registerEmergencyCallback,
  resetEmergencyTimeout,
  performEmergencyRecovery,
};
