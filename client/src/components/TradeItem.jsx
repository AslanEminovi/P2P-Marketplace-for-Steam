import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingCart,
  faStore,
  faArrowRight,
  faExclamationCircle,
  faChevronRight,
  faUser,
  faTag,
  faDollarSign,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/formatters';
import '../styles/Trades.css';

// Helper function to determine status color
const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return { background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' };
    case 'cancelled':
    case 'failed':
      return { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' };
    case 'pending':
    case 'awaiting_seller':
    case 'offer_sent':
    case 'awaiting_confirmation':
    case 'created':
      return { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' };
    default:
      return { background: 'linear-gradient(135deg, #9ca3af, #6b7280)', color: 'white' };
  }
};

// Helper function to get user-friendly status label
const getStatusLabel = (status) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    case 'awaiting_seller':
      return 'Awaiting Seller';
    case 'offer_sent':
      return 'Offer Sent';
    case 'awaiting_confirmation':
      return 'Awaiting Confirmation';
    case 'created':
      return 'Created';
    default:
      return status;
  }
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

  // Use lowercase status string for color mapping
  const statusColors = getStatusColor(trade.status?.toLowerCase());
  const statusLabel = getStatusLabel(trade.status?.toLowerCase());

  return (
    <motion.div
      className="trade-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{
        background: 'linear-gradient(to right, #ffffff, #f8fafc)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
        border: '1px solid #e5e7eb'
      }}
    >
      <div className="trade-card-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        alignItems: 'center' 
      }}>
        <div className="trade-status" style={{ 
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          ...statusColors
        }}>
          <FontAwesomeIcon icon={faClock} />
          {statusLabel}
        </div>
        <div className="trade-date" style={{ 
          color: '#6b7280',
          fontSize: '14px', 
          fontWeight: '500' 
        }}>
          {formatDate(trade.createdAt)}
        </div>
      </div>

      <div className="trade-card-content" style={{ 
        display: 'flex',
        alignItems: 'center', 
        gap: '20px',
        position: 'relative'
      }}>
        <div className="trade-item-image" style={{ 
          width: '80px',
          height: '80px',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <img 
            src={trade.itemImage || `/images/placeholder-item.png`} 
            alt={trade.itemName || 'Trade item'} 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block' 
            }}
          />
        </div>

        <div className="trade-item-details" style={{ flex: '1' }}>
          <div className="trade-item-name" style={{ 
            fontSize: '17px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FontAwesomeIcon icon={faTag} style={{ color: '#6b7280', fontSize: '14px' }} />
            {trade.itemName || trade.item?.marketHashName || 'Unknown Item'}
          </div>
          <div className="trade-item-price" style={{ 
            fontSize: '16px',
            fontWeight: '700',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: '14px' }} />
            {formatCurrency(trade.price)}
          </div>
        </div>

        <div className="trade-participants" style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div className="trade-participant" style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div className="trade-participant-avatar" style={{ 
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <img 
                src={trade.buyer?.avatar || `/images/default-avatar.png`} 
                alt="Buyer" 
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover' 
                }}
              />
            </div>
            <div className="trade-participant-info">
              <div className="trade-role" style={{ 
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Buyer
              </div>
              <div className="trade-user" style={{ 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: '12px' }} />
                {trade.buyer?.displayName || 'Unknown User'}
              </div>
            </div>
          </div>

          <div className="trade-divider" style={{ 
            height: '1px',
            background: 'linear-gradient(to right, transparent, #e5e7eb, transparent)',
            margin: '5px 0'
          }}></div>

          <div className="trade-participant" style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div className="trade-participant-avatar" style={{ 
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <img 
                src={trade.seller?.avatar || `/images/default-avatar.png`} 
                alt="Seller" 
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover' 
                }}
              />
            </div>
            <div className="trade-participant-info">
              <div className="trade-role" style={{ 
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Seller
              </div>
              <div className="trade-user" style={{ 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: '12px' }} />
                {trade.seller?.displayName || 'Unknown User'}
              </div>
            </div>
          </div>
        </div>

        <Link to={`/trades/${trade._id}`} className="trade-view-button" style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.2s ease',
          border: 'none',
          fontSize: '14px'
        }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      </div>
    </motion.div>
  );
};

export default TradeItem; 