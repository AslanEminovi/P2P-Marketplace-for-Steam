import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/SellerStatus.css';

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

  // Handle status updates from socket
  useEffect(() => {
    // Create a stable reference to the handler function
    handleStatusUpdateRef.current = (data) => {
      if (data && data.userId === sellerId) {
        console.log(`Received status update for user ${sellerId}:`, data.isOnline ? 'Online' : 'Offline', 'Last seen:', data.lastSeen);
        
        // Use the server-provided formatted time or our local formatting
        const formattedTime = data.lastSeenFormatted || formatLastSeen(data.lastSeen);
        
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
    
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/user/status/${sellerId}`, {
        withCredentials: true,
        timeout: 3000 // Shorter timeout for faster feedback
      });
      
      if (response.data) {
        console.log(`Fetched status for user ${sellerId}:`, response.data);
        // Use local formatting if the server didn't provide formatted time
        const lastSeenFormatted = response.data.lastSeenFormatted || 
                                  (response.data.lastSeen ? formatLastSeen(response.data.lastSeen) : null);
        
        setStatus({
          isOnline: response.data.isOnline,
          lastSeen: response.data.lastSeen,
          lastSeenFormatted: lastSeenFormatted
        });
        retryCountRef.current = 0; // Reset retry counter on success
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching seller status:', error);
      retryCountRef.current++;
      
      if (retryCountRef.current <= MAX_RETRIES) {
        console.log(`Retrying seller status fetch (${retryCountRef.current}/${MAX_RETRIES})`);
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
    // Use forced status if provided (for immediate feedback)
    if (forceStatus !== null) {
      setStatus(prev => ({ ...prev, isOnline: forceStatus }));
      setLoading(false);
    }
    
    if (!sellerId) {
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
        console.log(`Using cached status for user ${sellerId}:`, cachedStatus.isOnline ? 'Online' : 'Offline');
        setStatus({
          isOnline: cachedStatus.isOnline,
          lastSeen: cachedStatus.lastSeen,
          lastSeenFormatted: cachedStatus.lastSeenFormatted
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error reading cached status:', err);
    }

    // Initial fetch
    fetchStatus();
    
    // Set up regular polling as a fallback if socket fails
    statusTimeoutRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, 60000); // Poll every 60 seconds as a fallback (increased from 15 seconds)

    // Register the event listener
    socketService.on('userStatusUpdate', data => {
      if (handleStatusUpdateRef.current) {
        handleStatusUpdateRef.current(data);
      }
    });
    socketRegisteredRef.current = true;
    
    // Subscribe to user status via socket
    socketService.subscribeToUserStatus(sellerId);
    
    // Force an immediate connection attempt if needed
    if (!socketService.isConnected()) {
      socketService.reconnect();
    }

    // Recheck status on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (socketRegisteredRef.current) {
        socketService.off('userStatusUpdate', data => {
          if (data.userId === sellerId && handleStatusUpdateRef.current) {
            handleStatusUpdateRef.current(data);
          }
        });
        socketRegisteredRef.current = false;
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sellerId, forceStatus]);

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