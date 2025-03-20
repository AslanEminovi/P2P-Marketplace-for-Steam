import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import './SocketConnectionIndicator.css';

const SocketConnectionIndicator = ({ isConnected, show }) => {
  const [reconnecting, setReconnecting] = useState(false);
  const [visible, setVisible] = useState(show);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setVisible(show);
    setFadeOut(false);
    
    // Hide indicator after connection is restored
    if (isConnected && show) {
      // Start fade out transition first
      setFadeOut(true);
      
      // Then hide completely after animation completes
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1000); // Matches the CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, show]);

  const handleReconnect = () => {
    setReconnecting(true);
    
    // Try to reconnect
    socketService.reconnect();
    
    // Update UI after a short delay
    setTimeout(() => {
      setReconnecting(false);
    }, 1500);
  };

  if (!visible) return null;

  return (
    <div className={`socket-connection-indicator ${isConnected ? 'connected' : 'disconnected'} ${fadeOut ? 'fade-out' : ''}`}>
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`} />
        <span className="status-text">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {!isConnected && (
        <button 
          className="reconnect-button"
          onClick={handleReconnect}
          disabled={reconnecting}
        >
          {reconnecting ? 'Reconnecting...' : 'Reconnect'}
        </button>
      )}
    </div>
  );
};

export default SocketConnectionIndicator; 