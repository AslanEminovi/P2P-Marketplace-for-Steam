import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingCart,
  faStore,
  faArrowRight,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/formatters';

// Helper function to determine status color
const getStatusColor = (status) => {
  const statusColors = {
    'CREATED': '#3b82f6', // Blue
    'PENDING': '#f59e0b', // Amber
    'ACCEPTED': '#10b981', // Green
    'PROCESSING': '#8b5cf6', // Purple
    'COMPLETED': '#10b981', // Green
    'CANCELLED': '#ef4444', // Red
    'DECLINED': '#ef4444', // Red
    'FAILED': '#ef4444',   // Red
    'EXPIRED': '#6b7280',  // Gray
    'TIMEOUT': '#6b7280',  // Gray
  };
  return statusColors[status] || '#6b7280';
};

// Helper function to get user-friendly status label
const getStatusLabel = (status) => {
  const statusLabels = {
    'CREATED': 'Created',
    'PENDING': 'Pending',
    'ACCEPTED': 'Accepted',
    'PROCESSING': 'Processing',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
    'DECLINED': 'Declined',
    'FAILED': 'Failed',
    'EXPIRED': 'Expired',
    'TIMEOUT': 'Timed Out',
  };
  return statusLabels[status] || 'Unknown';
};

// Helper function to get avatar URL
const getAvatarUrl = (user) => {
  if (!user) return '/default-avatar.png';
  return user.avatar || user.avatarUrl || user.profilePicture || user.imageUrl || '/default-avatar.png';
};

const TradeItem = ({ trade, index }) => {
  // Handle missing data gracefully
  if (!trade) {
    return (
      <div className="trade-card error">
        <FontAwesomeIcon icon={faExclamationCircle} />
        <span>Trade data unavailable</span>
      </div>
    );
  }

  return (
    <motion.div 
      key={trade._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="trade-card"
      whileHover={{ scale: 1.01 }}
    >
      <div className="trade-card-header">
        <div 
          className="trade-status" 
          style={{ backgroundColor: getStatusColor(trade.status) }}
        >
          {getStatusLabel(trade.status)}
        </div>
        <div className="trade-date">
          {formatDate(trade.createdAt)}
        </div>
      </div>
      
      <div className="trade-card-content">
        <div className="trade-item-image">
          <img 
            src={trade.itemImage || 
                 (trade.item && (trade.item.iconUrl || trade.item.iconURL || trade.item.icon || trade.item.imageUrl || trade.item.image)) || 
                 trade.itemIconUrl || 
                 trade.iconUrl || 
                 '/default-item.png'} 
            alt={trade.itemName || (trade.item && trade.item.marketHashName) || 'Item'} 
            onError={(e) => {
              console.error("Failed to load image:", e.target.src);
              e.target.onerror = null; // Prevent infinite loop
              e.target.src = '/default-item.png';
            }}
          />
        </div>
        
        <div className="trade-item-details">
          <h3 className="trade-item-name">
            {trade.itemName || trade.item?.marketHashName || 'Unknown Item'}
          </h3>
          <p className="trade-item-price">
            {formatCurrency(trade.price, trade.currency)} 
            {trade.currency && trade.currency !== 'USD' && ` (${trade.currency})`}
          </p>
          
          <div className="trade-participants">
            <div className="trade-participant">
              <div className="trade-participant-avatar">
                <img 
                  src={getAvatarUrl(trade.buyer)} 
                  alt={trade.buyer?.displayName || 'Buyer'} 
                  onError={(e) => {
                    console.error("Failed to load buyer avatar:", e.target.src);
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.src = '/default-avatar.png';
                  }}
                  loading="lazy"
                />
              </div>
              <div className="trade-participant-info">
                <span className="trade-role">
                  <FontAwesomeIcon icon={faShoppingCart} size="xs" />
                  {trade.isUserBuyer ? 'You' : 'Buyer'}:
                </span>
                <span className="trade-user">
                  {trade.isUserBuyer ? 'You' : trade.buyer?.displayName || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="trade-divider">
              <FontAwesomeIcon icon={faArrowRight} />
            </div>
            
            <div className="trade-participant">
              <div className="trade-participant-avatar">
                <img 
                  src={getAvatarUrl(trade.seller)} 
                  alt={trade.seller?.displayName || 'Seller'} 
                  onError={(e) => {
                    console.error("Failed to load seller avatar:", e.target.src);
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.src = '/default-avatar.png';
                  }}
                  loading="lazy"
                />
              </div>
              <div className="trade-participant-info">
                <span className="trade-role">
                  <FontAwesomeIcon icon={faStore} size="xs" />
                  {trade.isUserSeller ? 'You' : 'Seller'}:
                </span>
                <span className="trade-user">
                  {trade.isUserSeller ? 'You' : trade.seller?.displayName || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="trade-actions">
          <Link to={`/trades/${trade._id}`} className="trade-view-button">
            View Details
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default TradeItem; 