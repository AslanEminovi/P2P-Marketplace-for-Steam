import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import useUserStatus from '../hooks/useUserStatus';
import '../styles/SellerStatus.css';

// Set DEBUG_MODE to false to disable the debug panel
const DEBUG_MODE = false;

const SellerStatus = ({ sellerId, showLastSeen = true, className = '', forceStatus = null }) => {
  const { status, loading, error, checkStatus, isConnected } = useUserStatus(sellerId, forceStatus);
  const [prevOnlineState, setPrevOnlineState] = useState(status.isOnline);
  const [statusTransition, setStatusTransition] = useState('');
  const [showOffline, setShowOffline] = useState(false);
  
  // During page refresh/load, we delay showing offline state to avoid flicker
  useEffect(() => {
    // On initial load or refresh, check if we have a cached status in localStorage
    try {
      const statusCache = JSON.parse(localStorage.getItem("user_status_cache") || "{}");
      const cachedStatus = statusCache[sellerId];
      
      // If the cached status shows this user was recently online (within 3 minutes)
      if (cachedStatus && cachedStatus.isOnline && 
          Date.now() - cachedStatus.timestamp < 3 * 60 * 1000) {
        // Start with the assumption user is still online during page refresh
        setPrevOnlineState(true);
      }
    } catch (err) {
      console.error("Error reading cached status:", err);
    }
    
    // Add a delay before showing offline state during initial load
    // This prevents flickering status during page refresh
    if (loading && !status.isOnline) {
      const timer = setTimeout(() => {
        setShowOffline(true);
      }, 2000); // 2 second delay before showing offline
      
      return () => clearTimeout(timer);
    } else {
      setShowOffline(status.isOnline === false);
    }
  }, [loading, status.isOnline, sellerId]);

  // Handle status changes with animation
  useEffect(() => {
    if (prevOnlineState !== status.isOnline) {
      // Trigger appropriate animation
      setStatusTransition(status.isOnline ? 'to-online' : 'to-offline');
      
      // Store new state
      setPrevOnlineState(status.isOnline);
      
      // Reset transition class after animation completes
      const timer = setTimeout(() => {
        setStatusTransition('');
      }, 600); // slightly longer than animation duration
      
      return () => clearTimeout(timer);
    }
  }, [status.isOnline, prevOnlineState]);

  // Force reconnection when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Try to reconnect socket
        if (socketService && !isConnected) {
          socketService.reconnect();
        }
        
        // Check status
        setTimeout(checkStatus, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus, isConnected]);
  
  // Simple debug mode version when enabled
  if (DEBUG_MODE) {
    return (
      <div className="debug-panel">
        <div className={`seller-status-container ${className}`}>
          <div className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`} />
          <div className="status-text">
            {status.isOnline ? (
              <span className="online-text">Online</span>
            ) : (
              <span className="offline-text">
                Offline
                {showLastSeen && status.lastSeenFormatted && (
                  <span className="last-seen-text">• Last active {status.lastSeenFormatted}</span>
                )}
              </span>
            )}
          </div>
        </div>
        
        <div className={`status-badge ${status.isOnline ? 'online' : 'offline'}`}>
          {status.isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
        
        <div className="debug-info">
          <div>
            <span className="debug-label">User ID:</span>
            <span className="debug-value">{sellerId.substring(0, 8)}...</span>
          </div>
          <div>
            <span className="debug-label">State:</span>
            <span className={`debug-value ${status.isOnline ? 'positive' : 'negative'}`}>
              {loading ? 'Loading' : error ? 'Error' : status.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>
            <span className="debug-label">Socket:</span>
            <span className={`debug-value ${isConnected ? 'positive' : 'negative'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span className="debug-label">Source:</span>
            <span className="debug-value">{status.source || 'unknown'}</span>
          </div>
        </div>
        
        <button 
          className="refresh-button"
          onClick={() => { 
            console.log('Manual refresh clicked');
            
            // Try direct database lookup as a more reliable alternative
            axios.get(`${API_URL}/user/direct-status/${sellerId}`, {
              withCredentials: true,
              params: { _t: Date.now() }
            })
            .then(response => {
              console.log('Direct status response:', response.data);
            })
            .catch(err => console.error('Direct status error:', err));
            
            // Trigger status check from the hook
            checkStatus();
          }}
        >
          ↻ Refresh Status
        </button>
      </div>
    );
  }

  // Improved loading state - show connecting animation instead of flickering offline
  if (loading && !showOffline) {
    return (
      <div className={`seller-status-connecting ${className}`}>
        <div className="status-indicator connecting" />
        <div className="status-text">
          <span className="connecting-text">Connecting...</span>
        </div>
      </div>
    );
  }
  
  // Error state - but still show something useful
  if (error) {
    return (
      <div className={`seller-status-container ${className}`}>
        <div className="status-indicator offline" />
        <div className="status-text">
          <span className="offline-text">Offline</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`seller-status-container ${className} ${statusTransition}`}>
      <div className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`} />
      
      <div className="status-text">
        {status.isOnline ? (
          <span className="online-text">Online</span>
        ) : (
          <span className="offline-text">
            Offline
            {showLastSeen && status.lastSeenFormatted && (
              <span className="last-seen-text">• Last active {status.lastSeenFormatted}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerStatus; 