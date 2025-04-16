import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/SellerStatus.css';

const SellerStatus = ({ sellerId, showLastSeen = true, className = '' }) => {
  const [status, setStatus] = useState({
    isOnline: false,
    lastSeen: null,
    lastSeenFormatted: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const statusTimeoutRef = useRef(null);
  const socketRegisteredRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      setError('No seller ID provided');
      return;
    }

    // Function to fetch status
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/user/status/${sellerId}`, {
          withCredentials: true,
          timeout: 5000 // Add timeout to prevent long-hanging requests
        });
        
        if (response.data) {
          setStatus(response.data);
          retryCountRef.current = 0; // Reset retry counter on success
        }
      } catch (error) {
        console.error('Error fetching seller status:', error);
        retryCountRef.current++;
        
        if (retryCountRef.current <= MAX_RETRIES) {
          console.log(`Retrying seller status fetch (${retryCountRef.current}/${MAX_RETRIES})`);
          // Don't set the error state here, just retry silently
        } else {
          setError('Failed to load status');
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();
    
    // Set up regular polling as a fallback if socket fails
    statusTimeoutRef.current = setInterval(() => {
      fetchStatus();
    }, 60000); // Poll every minute as a fallback

    // Subscribe to user status via socket
    socketService.subscribeToUserStatus(sellerId);

    // Set up socket listener for real-time updates
    const handleStatusUpdate = (data) => {
      if (data && data.userId === sellerId) {
        console.log(`Received status update for user ${sellerId}:`, data.isOnline ? 'Online' : 'Offline');
        setStatus(prev => ({
          ...prev,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
          lastSeenFormatted: data.lastSeenFormatted || prev.lastSeenFormatted
        }));
      }
    };

    // Register the event listener
    socketService.on('userStatusUpdate', handleStatusUpdate);
    socketRegisteredRef.current = true;
    
    // Force an immediate connection attempt if needed
    if (!socketService.isConnected()) {
      socketService.reconnect();
    }

    // Cleanup
    return () => {
      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }
      
      if (socketRegisteredRef.current) {
        socketService.off('userStatusUpdate', handleStatusUpdate);
        socketRegisteredRef.current = false;
      }
    };
  }, [sellerId]);

  // Simple loading state with spinner
  if (loading) {
    return <div className={`seller-status-loading ${className}`}>Loading status</div>;
  }
  
  // Error state - but still show something useful
  if (error) {
    return (
      <div className={`seller-status-container ${className}`}>
        <div className="status-indicator offline" />
        <div className="status-text">
          <span className="offline-text">Status unavailable</span>
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
              <span className="last-seen-text"> • {status.lastSeenFormatted}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerStatus; 