import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import './SocketConnectionIndicator.css';

const SocketConnectionIndicator = ({ isConnected, show }) => {
  const [reconnecting, setReconnecting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timeoutRef = useRef(null);

  // Controlled mounting/unmounting with delays
  useEffect(() => {
    // Clear any existing timeouts to prevent race conditions
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (show) {
      setVisible(true);
      setFadeOut(false);
    } else if (visible) {
      // Start fade out first
      setFadeOut(true);

      // Then completely hide after animation completes
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 500); // Match CSS transition time
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, isConnected, visible]);

  // Additional effect for connected state
  useEffect(() => {
    if (isConnected && show) {
      // If connected and showing, start auto-hide sequence after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setFadeOut(true);

        timeoutRef.current = setTimeout(() => {
          setVisible(false);
        }, 500); // Match CSS transition time
      }, 3000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isConnected, show]);

  const handleReconnect = () => {
    setReconnecting(true);

    // Try to reconnect
    socketService.reconnect();

    // Update UI after a delay
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