import React from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import useUserStatus from '../hooks/useUserStatus';
import '../styles/SellerStatus.css';

// Set DEBUG_MODE to false to disable the debug panel
const DEBUG_MODE = false;

const SellerStatus = ({ sellerId, showLastSeen = true, className = '', forceStatus = null }) => {
  const { status, loading, error, checkStatus, isConnected } = useUserStatus(sellerId, forceStatus);

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

  // Simple loading state - show very briefly
  if (loading && !status.isOnline) {
    return (
      <div className={`seller-status-loading ${className}`}>
        <div className="status-indicator offline" />
        <div className="status-text">
          <span className="offline-text">Checking...</span>
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
  );
};

export default SellerStatus; 