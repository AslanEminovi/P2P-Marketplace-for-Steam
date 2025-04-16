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
        }
      } catch (error) {
        console.error('Error fetching seller status:', error);
        setError('Failed to load status');
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

    // Set up socket listener for real-time updates
    const setupSocketListener = () => {
      if (socketService.isConnected()) {
        const handleStatusUpdate = (data) => {
          if (data.userId === sellerId) {
            setStatus(prev => ({
              ...prev,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
              lastSeenFormatted: data.lastSeenFormatted || prev.lastSeenFormatted
            }));
          }
        };

        // Only register listener once
        if (!socketRegisteredRef.current) {
          socketService.on('userStatusUpdate', handleStatusUpdate);
          socketRegisteredRef.current = true;
          
          // Update socket connection if needed
          socketService.emit('subscribeToUserStatus', { userId: sellerId });
        }
      } else {
        // Try to connect socket if not connected
        socketService.connect();
        
        // Check again in a second
        setTimeout(setupSocketListener, 1000);
      }
    };
    
    setupSocketListener();

    // Cleanup
    return () => {
      if (statusTimeoutRef.current) {
        clearInterval(statusTimeoutRef.current);
      }
      
      if (socketRegisteredRef.current) {
        socketService.off('userStatusUpdate', (data) => {
          if (data.userId === sellerId) {
            // This is our listener
          }
        });
        socketRegisteredRef.current = false;
      }
    };
  }, [sellerId]);

  // Simple loading state with spinner
  if (loading) {
    return <div className={`seller-status-loading ${className}`}>Loading status</div>;
  }
  
  // Error state
  if (error) {
    return null; // Hide on error to not disrupt the UI
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