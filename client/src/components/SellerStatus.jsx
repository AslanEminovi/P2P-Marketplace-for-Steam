import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import '../styles/SellerStatus.css';

const SellerStatus = ({ sellerId, showLastSeen = true }) => {
  const [status, setStatus] = useState({
    isOnline: false,
    lastSeen: null,
    lastSeenFormatted: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;

    // Function to fetch status
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/user/status/${sellerId}`, {
          withCredentials: true
        });
        
        if (response.data) {
          setStatus(response.data);
        }
      } catch (error) {
        console.error('Error fetching seller status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up socket listener for real-time updates
    if (socketService.isConnected()) {
      const handleStatusUpdate = (data) => {
        if (data.userId === sellerId) {
          setStatus(prev => ({
            ...prev,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen
          }));
        }
      };

      socketService.on('userStatusUpdate', handleStatusUpdate);

      // Cleanup
      return () => {
        socketService.off('userStatusUpdate', handleStatusUpdate);
      };
    }
  }, [sellerId]);

  if (loading) {
    return <div className="seller-status-loading">Loading status...</div>;
  }

  return (
    <div className="seller-status-container">
      <div className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`} />
      
      <div className="status-text">
        {status.isOnline ? (
          <span className="online-text">Online</span>
        ) : (
          <span className="offline-text">
            Offline
            {showLastSeen && status.lastSeenFormatted && (
              <span className="last-seen-text"> • Last seen {status.lastSeenFormatted}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default SellerStatus; 