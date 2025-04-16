import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';

const ItemCard = ({ seller }) => {
  const [sellerStatus, setSellerStatus] = useState({ isOnline: false });

  useEffect(() => {
    if (seller && seller._id) {
      if (socketService.isConnected()) {
        const handleUserStatusUpdate = (data) => {
          if (data.userId === seller._id) {
            setSellerStatus({
              isOnline: data.isOnline,
              lastSeen: data.lastSeen
            });
          }
        };

        socketService.on('userStatusUpdate', handleUserStatusUpdate);

        fetchSellerStatus();

        return () => {
          socketService.off('userStatusUpdate', handleUserStatusUpdate);
        };
      } else {
        fetchSellerStatus();
      }
    }
  }, [seller]);

  const fetchSellerStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/status/${seller._id}`, {
        withCredentials: true
      });
      
      if (response.data) {
        setSellerStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching seller status:', error);
    }
  };

  return (
    <>
      {seller && (
        <div className="item-seller">
          <div className="seller-avatar">
            <img 
              src={seller.avatar || '/default-avatar.png'} 
              alt={seller.displayName} 
            />
            {/* Online status indicator */}
            <div 
              className={`online-status-indicator ${sellerStatus?.isOnline ? 'online' : 'offline'}`}
              title={sellerStatus?.isOnline ? 'Online' : 'Offline'}
            />
          </div>
          <div className="seller-info">
            <div className="seller-name">{seller.displayName}</div>
            <div className="seller-status">
              {sellerStatus?.isOnline ? 
                <span className="status-text online">Online</span> : 
                <span className="status-text offline">Offline</span>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemCard; 