// A simplified socket service
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.connected = false;
    this.connecting = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
    this._reconnectInterval = 3000; // 3 seconds
  }

  init() {
    if (this.socket) {
      console.log("Socket already initialized");
      return;
    }

    console.log("Initializing socket service");
    this.socket = {
      on: (event, callback) => {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
      },
      off: (event, callback) => {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(
            (cb) => cb !== callback
          );
        }
      },
      emit: (event, data) => {
        console.log(`[Socket] Emitting event: ${event}`, data);
        // In a real implementation, this would send data over WebSocket
      },
    };
  }

  connect() {
    if (this.connected) {
      console.log("Socket already connected");
      return;
    }

    if (this.connecting) {
      console.log("Socket connection in progress");
      return;
    }

    this.connecting = true;
    console.log("Connecting to socket server...");

    // Simulate connection delay
    setTimeout(() => {
      this.connected = true;
      this.connecting = false;
      this._reconnectAttempts = 0;

      this._emitEvent("connection_status", {
        connected: true,
        connecting: false,
      });

      console.log("Socket connected successfully");
    }, 1000);
  }

  disconnect() {
    if (!this.connected) {
      console.log("Socket already disconnected");
      return;
    }

    console.log("Disconnecting from socket server...");

    this.connected = false;
    this._emitEvent("connection_status", {
      connected: false,
      connecting: false,
    });

    console.log("Socket disconnected");
  }

  reconnect() {
    if (this.connected || this.connecting) {
      return;
    }

    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      return;
    }

    this._reconnectAttempts++;
    console.log(
      `Reconnect attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts}`
    );

    this.connect();
  }

  on(event, callback) {
    if (!this.socket) {
      this.init();
    }

    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.log("Cannot emit event, socket not connected");
      return;
    }

    this.socket.emit(event, data);
  }

  _emitEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
