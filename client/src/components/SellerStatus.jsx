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
  const [displayStatus, setDisplayStatus] = useState(status);

  // Update display status when actual status changes, but maintain during loading
  useEffect(() => {
    // Only update display if we have a non-loading status or initial load
    if (!loading || !displayStatus.source) {
      setDisplayStatus(status);
    }
  }, [status, loading]);

  // Handle status changes with animation
  useEffect(() => {
    // Only animate when we have a confirmed status change (not during loading)
    if (!loading && prevOnlineState !== displayStatus.isOnline) {
      // Trigger appropriate animation
      setStatusTransition(displayStatus.isOnline ? 'to-online' : 'to-offline');
      
      // Store new state
      setPrevOnlineState(displayStatus.isOnline);
      
      // Reset transition class after animation completes
      const timer = setTimeout(() => {
        setStatusTransition('');
      }, 600); // slightly longer than animation duration
      
      return () => clearTimeout(timer);
    }
  }, [displayStatus.isOnline, prevOnlineState, loading]);

  // Force reconnection when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Try to reconnect socket
        if (socketService && !isConnected) {
          socketService.reconnect();
        }
        
        // Check status
        setTimeout(checkStatus, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus, isConnected]);

  // When initializing without a status, check local storage for cached status
  useEffect(() => {
    // If we don't have a status yet, try to get it from cache
    if (!displayStatus.source) {
      try {
        const statusCache = JSON.parse(localStorage.getItem("user_status_cache") || "{}");
        const cachedStatus = statusCache[sellerId];
        
        if (cachedStatus) {
          setDisplayStatus(cachedStatus);
          setPrevOnlineState(cachedStatus.isOnline);
        }
      } catch (err) {
        console.error("Error reading cached status:", err);
      }
    }
  }, [sellerId, displayStatus.source]);
  
  // Simple debug mode version when enabled
  if (DEBUG_MODE) {
    return (
      <div className="debug-panel">
        <div className={`seller-status-container ${className}`}>
          <div className={`status-indicator ${displayStatus.isOnline ? 'online' : 'offline'}`} />
          <div className="status-text">
            {displayStatus.isOnline ? (
              <span className="online-text">Online</span>
            ) : (
              <span className="offline-text">
                Offline
                {showLastSeen && displayStatus.lastSeenFormatted && (
                  <span className="last-seen-text">• Last active {displayStatus.lastSeenFormatted}</span>
                )}
              </span>
            )}
          </div>
        </div>
        
        <div className={`status-badge ${displayStatus.isOnline ? 'online' : 'offline'}`}>
          {displayStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
        
        <div className="debug-info">
          <div>
            <span className="debug-label">User ID:</span>
            <span className="debug-value">{sellerId.substring(0, 8)}...</span>
          </div>
          <div>
            <span className="debug-label">State:</span>
            <span className={`debug-value ${displayStatus.isOnline ? 'positive' : 'negative'}`}>
              {loading ? 'Loading' : error ? 'Error' : displayStatus.isOnline ? 'Online' : 'Offline'}
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
            <span className="debug-value">{displayStatus.source || 'unknown'}</span>
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

  // Return the normal status indicator - never show "Checking..." text
  return (
    <div className={`seller-status-container ${className} ${statusTransition}`}>
      <div className={`status-indicator ${displayStatus.isOnline ? 'online' : 'offline'}`} />
      
      <div className="status-text">
        {displayStatus.isOnline ? (
          <span className="online-text">Online</span>
        ) : (
          <span className="offline-text">
            Offline
            {showLastSeen && displayStatus.lastSeenFormatted && (
              <span className="last-seen-text">• Last active {displayStatus.lastSeenFormatted}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerStatus; 