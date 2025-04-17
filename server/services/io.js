/**
 * Module to expose the Socket.io instance
 * This file acts as a bridge to access the io instance from other modules
 */

// Initially no io instance is available
let io = null;

/**
 * Set the Socket.io instance
 * @param {SocketIO.Server} instance - The Socket.io server instance
 */
function setIo(instance) {
  if (!instance) {
    console.warn("[io] Attempted to set null io instance");
    return;
  }

  io = instance;
  console.log("[io] Socket.io instance set");
}

/**
 * Get the Socket.io instance
 * @returns {SocketIO.Server|null} The Socket.io instance or null if not set
 */
function getIo() {
  return io;
}

// Export a proxy object that forwards all properties/methods to the io instance
// This allows other modules to require this file and use it as if it were the io instance
module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === "setIo") return setIo;
      if (prop === "getIo") return getIo;

      // If io is not set yet, return a placeholder function that logs a warning
      if (!io) {
        if (typeof prop === "symbol") return undefined;

        if (typeof Function.prototype[prop] === "function") {
          return Function.prototype[prop].bind(Function.prototype);
        }

        return (...args) => {
          console.warn(
            `[io] Attempted to call ${String(
              prop
            )} but io instance is not set yet`
          );
          return undefined;
        };
      }

      // Otherwise forward the property access to the io instance
      return io[prop];
    },
  }
);
