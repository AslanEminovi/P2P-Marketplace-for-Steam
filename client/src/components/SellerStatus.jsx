import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/SellerStatus.css';

// Add a global debugging flag - DEBUG mode
const DEBUG_MODE = true;

const SellerStatus = ({ sellerId, showLastSeen = true, className = '', forceStatus = null }) => {
  const [status, setStatus] = useState({
    isOnline: forceStatus !== null ? forceStatus : false,
    lastSeen: null,
    lastSeenFormatted: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const statusTimeoutRef = useRef(null);
  const socketRegisteredRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const fetchTimeoutRef = useRef(null);
  const handleStatusUpdateRef = useRef(null);

  // Debug helper function
  const debug = (message, data = null) => {
    if (DEBUG_MODE) {
      console.log(`[SellerStatus:${sellerId}] ${message}`, data || '');
      
      // Also send debug info to specified server endpoint for server-side logging in production
      if (process.env.NODE_ENV === 'production' && API_URL) {
        try {
          const debugData = {
            component: 'SellerStatus',
            sellerId,
            message,
            data: data ? JSON.stringify(data) : null,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          };
          
          // Use navigator.sendBeacon if available to avoid delaying page unload
          if (navigator.sendBeacon) {
            navigator.sendBeacon(`${API_URL}/debug/log`, JSON.stringify(debugData));
          } else {
            // Fallback to fetch with keepalive
            fetch(`${API_URL}/debug/log`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(debugData),
              keepalive: true
            }).catch(() => {}); // Ignore errors
          }
        } catch (e) {
          // Ignore errors in debug logging
        }
      }
    }
  };

  // Handle status updates from socket
  useEffect(() => {
    // Create a stable reference to the handler function
    handleStatusUpdateRef.current = (data) => {
      if (data && data.userId === sellerId) {
        debug(`Received status update for user:`, data);
        debug(`User online status:`, data.isOnline ? 'ONLINE' : 'OFFLINE');
        
        // Use the server-provided formatted time or our local formatting
        const formattedTime = data.lastSeenFormatted || formatLastSeen(data.lastSeen);
        
        debug(`Setting new status:`, { 
          isOnline: data.isOnline,
          lastSeen: data.lastSeen, 
          formattedTime 
        });
        
        setStatus(prev => ({
          ...prev,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          lastSeenFormatted: formattedTime
        }));
        
        // Reset loading and error states since we have data
        setLoading(false);
        setError(null);
        
        // Store status in local storage for immediate display on page reload
        try {
          const statusCache = JSON.parse(localStorage.getItem('seller_status_cache') || '{}');
          statusCache[sellerId] = {
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
            lastSeenFormatted: formattedTime,
            timestamp: Date.now()
          };
          localStorage.setItem('seller_status_cache', JSON.stringify(statusCache));
          debug('Cached seller status in localStorage');
        } catch (err) {
          console.error('Error caching seller status:', err);
        }
      }
    };
  }, [sellerId]);

  // Format last seen time
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return null;
    
    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    
    // If less than a minute
    if (diffMs < 60 * 1000) {
      return 'just now';
    }
    
    // If less than an hour
    if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // If less than a day
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // If less than a week
    if (diffMs < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    // More than a week
    return lastSeen.toLocaleDateString();
  };

  // Force immediate status check
  const checkStatus = () => {
    if (!sellerId) return;
    
    debug('Manual status check requested');
    
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a timeout to fetch after a small delay (to avoid hammering the server)
    fetchTimeoutRef.current = setTimeout(() => {
      fetchStatus();
    }, 300);
  };

  // Function to fetch status
  const fetchStatus = async () => {
    if (!sellerId) return;
    
    debug('Fetching status from server');
    
    try {
      setLoading(true);
      
      // First try to get status directly from database (more reliable)
      try {
        debug('Trying direct database status');
        const directResponse = await axios.get(`${API_URL}/user/direct-status/${sellerId}`, {
          withCredentials: true,
          timeout: 3000,
          params: { _t: Date.now() }
        });
        
        if (directResponse.data) {
          debug(`Got direct status for user:`, directResponse.data);
          
          setStatus({
            isOnline: directResponse.data.isOnline,
            lastSeen: directResponse.data.lastSeen,
            lastSeenFormatted: directResponse.data.lastSeenFormatted
          });
          
          setLoading(false);
          setError(null);
          retryCountRef.current = 0;
          
          // Store status in local storage for quick display next time
          try {
            const statusCache = JSON.parse(localStorage.getItem('seller_status_cache') || '{}');
            statusCache[sellerId] = {
              isOnline: directResponse.data.isOnline,
              lastSeen: directResponse.data.lastSeen,
              lastSeenFormatted: directResponse.data.lastSeenFormatted,
              timestamp: Date.now()
            };
            localStorage.setItem('seller_status_cache', JSON.stringify(statusCache));
            debug('Cached seller status in localStorage');
          } catch (err) {
            console.error('Error caching seller status:', err);
          }
          
          // If we got direct status successfully, we can skip the socket-based method
          return;
        }
      } catch (directError) {
        debug('Direct status error:', directError);
        // Continue to socket-based method if direct method fails
      }
      
      // Fall back to socket-based status
      const response = await axios.get(`${API_URL}/user/status/${sellerId}`, {
        withCredentials: true,
        timeout: 3000, // Shorter timeout for faster feedback
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
          // Removed 'Expires' header which was causing CORS issues
        },
        params: {
          _t: Date.now() // Add timestamp to prevent caching
        }
      });
      
      if (response.data) {
        debug(`Fetched status for user:`, response.data);
        
        // Use local formatting if the server didn't provide formatted time
        const lastSeenFormatted = response.data.lastSeenFormatted || 
                                  (response.data.lastSeen ? formatLastSeen(response.data.lastSeen) : null);
        
        debug(`Setting status from server response:`, {
          isOnline: response.data.isOnline, 
          lastSeen: response.data.lastSeen,
          lastSeenFormatted
        });
        
        setStatus({
          isOnline: response.data.isOnline,
          lastSeen: response.data.lastSeen,
          lastSeenFormatted: lastSeenFormatted
        });
        retryCountRef.current = 0; // Reset retry counter on success
      } else {
        debug('Server returned empty response');
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching seller status:', error);
      debug('Error response:', error.response?.data);
      retryCountRef.current++;
      
      if (retryCountRef.current <= MAX_RETRIES) {
        debug(`Retrying seller status fetch (${retryCountRef.current}/${MAX_RETRIES})`);
        // Schedule a retry with exponential backoff
        setTimeout(() => {
          fetchStatus();
        }, Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000));
      } else {
        setError('Failed to load status');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    debug('Component mounted or sellerId changed');
    
    // Use forced status if provided (for immediate feedback)
    if (forceStatus !== null) {
      debug(`Using forced status: ${forceStatus ? 'ONLINE' : 'OFFLINE'}`);
      setStatus(prev => ({ ...prev, isOnline: forceStatus }));
      setLoading(false);
    }
    
    if (!sellerId) {
      debug('No sellerId provided, aborting');
      setLoading(false);
      setError('No seller ID provided');
      return;
    }

    // Check for cached status first for immediate display
    try {
      const statusCache = JSON.parse(localStorage.getItem('seller_status_cache') || '{}');
      const cachedStatus = statusCache[sellerId];
      
      // Use cached status if it's less than 5 minutes old
      if (cachedStatus && Date.now() - cachedStatus.timestamp < 5 * 60 * 1000) {
        debug(`Using cached status for user:`, cachedStatus);
        setStatus({
          isOnline: cachedStatus.isOnline,
          lastSeen: cachedStatus.lastSeen,
          lastSeenFormatted: cachedStatus.lastSeenFormatted
        });
        setLoading(false);
      } else {
        debug('No recent cached status found');
      }
    } catch (err) {
      console.error('Error reading cached status:', err);
    }

    // Initial fetch
    fetchStatus();
    
    // Ensure the socket is connected
    if (!socketService.isConnected()) {
      debug('Socket not connected, attempting to connect...');
      socketService.reconnect();
    } else {
      debug('Socket already connected');
    }
    
    // Register for status updates via socket
    debug(`Subscribing to userStatusUpdate events for ${sellerId}`);
    socketService.on('userStatusUpdate', data => {
      debug('Received userStatusUpdate event:', data);
      if (handleStatusUpdateRef.current) {
        handleStatusUpdateRef.current(data);
      }
    });
    socketRegisteredRef.current = true;
    
    // Subscribe to user status via socket
    debug(`Calling subscribeToUserStatus for ${sellerId}`);
    socketService.subscribeToUserStatus(sellerId);
    
    // Set up regular polling as a fallback if socket fails
    statusTimeoutRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        debug('Polling for status update (fallback)');
        fetchStatus();
      }
    }, 60000); // Poll every 60 seconds as a fallback (increased from 15 seconds)

    // Recheck status on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debug('Tab became visible, checking status');
        checkStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      debug('Component unmounting, cleaning up');
      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (socketRegisteredRef.current) {
        debug('Removing socket event listeners');
        socketService.off('userStatusUpdate');
        socketRegisteredRef.current = false;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sellerId, forceStatus]);

  // Simple debug mode version when enabled
  if (DEBUG_MODE) {
    return (
      <div className={`seller-status-container ${className}`} style={{border: '1px dashed #666', padding: '10px', background: '#111', margin: '10px 0'}}>
        <div className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`} />
        
        <div className="status-text">
          {status.isOnline ? (
            <span className="online-text">Online</span>
          ) : (
            <span className="offline-text">
              Offline
              {showLastSeen && status.lastSeenFormatted && (
                <span className="last-seen-text"> • Last active {status.lastSeenFormatted}</span>
              )}
            </span>
          )}
        </div>
        
        <div style={{fontSize: '10px', color: '#999', marginTop: '4px'}}>
          <div>ID: {sellerId}</div>
          <div>State: {loading ? 'Loading' : error ? 'Error' : status.isOnline ? 'Online' : 'Offline'}</div>
          <div>Socket: {socketService.isConnected() ? 'Connected' : 'Disconnected'}</div>
          <button 
            onClick={() => { 
              debug('Manual refresh clicked');
              
              // Try direct database lookup as a more reliable alternative
              axios.get(`${API_URL}/user/direct-status/${sellerId}`, {
                withCredentials: true,
                params: { _t: Date.now() }
              })
              .then(response => {
                debug('Direct status response:', response.data);
                if (response.data) {
                  setStatus({
                    isOnline: response.data.isOnline,
                    lastSeen: response.data.lastSeen,
                    lastSeenFormatted: response.data.lastSeenFormatted
                  });
                }
              })
              .catch(err => debug('Direct status error:', err));
              
              // Also try regular methods
              socketService.subscribeToUserStatus(sellerId); 
              fetchStatus(); 
            }}
            style={{fontSize: '9px', marginTop: '2px', padding: '2px 5px'}}
          >
            Refresh
          </button>
        </div>
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
              <span className="last-seen-text"> • Last active {status.lastSeenFormatted}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerStatus; 