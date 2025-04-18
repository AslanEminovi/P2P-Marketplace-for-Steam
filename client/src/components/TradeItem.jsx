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
  faClock,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/formatters';
import '../styles/Trades.css';

/**
 * A component that displays a trade item card with a completely redesigned UI
 * @param {Object} trade - The trade object to display
 * @param {Number} index - The index for staggered animations
 */
const TradeItem = ({ trade, index }) => {
  // Handle missing data gracefully
  if (!trade) {
    return (
      <motion.div 
        className="trade-card error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
          <FontAwesomeIcon icon={faExclamationCircle} size="lg" />
          <span>Trade data unavailable</span>
        </div>
      </motion.div>
    );
  }

  // Helper function to determine status colors and gradients
  const getStatusStyles = (status) => {
    const statusStr = String(status || '').toLowerCase();
    
    if (statusStr.includes('complet')) {
      return {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        icon: faCheckCircle
      };
    } else if (statusStr.includes('cancel') || statusStr.includes('fail') || statusStr.includes('declin')) {
      return {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        icon: faTimesCircle
      };
    } else if (statusStr.includes('pend') || statusStr.includes('await') || statusStr.includes('offer') || statusStr.includes('process') || statusStr.includes('creat')) {
      return {
        background: 'linear-gradient(135deg, #f472b6, #ec4899)',
        color: 'white', 
        icon: faClock
      };
    } else {
      return {
        background: 'linear-gradient(135deg, #9ca3af, #6b7280)',
        color: 'white',
        icon: faQuestionCircle
      };
    }
  };

  // Format status text for display
  const getStatusLabel = (status) => {
    const statusStr = String(status || '').toLowerCase();
    
    if (statusStr.includes('complet')) return 'Completed';
    if (statusStr.includes('cancel')) return 'Cancelled';
    if (statusStr.includes('fail')) return 'Failed';
    if (statusStr.includes('pend')) return 'Pending';
    if (statusStr.includes('await_seller')) return 'Awaiting Seller';
    if (statusStr.includes('offer')) return 'Offer Sent';
    if (statusStr.includes('confirm')) return 'Awaiting Confirmation';
    if (statusStr.includes('creat')) return 'Created';
    if (statusStr.includes('process')) return 'Processing';
    if (statusStr.includes('declin')) return 'Declined';
    
    // If we can't match, just clean up the string and capitalize
    return statusStr
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get status information including colors and icon
  const statusInfo = getStatusStyles(trade.status);
  const statusLabel = getStatusLabel(trade.status);

  // Card animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.08
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)", 
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      className="trade-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      style={{
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: "20px",
        overflow: "hidden",
        marginBottom: "24px",
        border: "1px solid rgba(255, 255, 255, 0.12)"
      }}
    >
      <div className="trade-card-header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 24px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
      }}>
        <motion.div 
          className="trade-status" 
          style={{
            background: statusInfo.background,
            color: statusInfo.color,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "30px",
            fontSize: "0.9rem",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
          }}
          whileHover={{ scale: 1.05 }}
        >
          <FontAwesomeIcon icon={statusInfo.icon || faClock} />
          <span>{statusLabel}</span>
        </motion.div>
        
        <div className="trade-date" style={{
          fontSize: "0.9rem",
          color: "rgba(255, 255, 255, 0.6)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <FontAwesomeIcon icon={faClock} style={{ opacity: 0.7 }} />
          {formatDate(trade.createdAt)}
        </div>
      </div>

      <div className="trade-card-content" style={{
        padding: "24px",
        display: "flex",
        gap: "24px",
        alignItems: "center",
        position: "relative"
      }}>
        <motion.div 
          className="trade-item-image"
          whileHover={{ 
            scale: 1.1,
            rotate: 3,
            transition: { duration: 0.3 }
          }}
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "16px",
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)"
          }}
        >
          <img 
            src={trade.itemImage || 
                trade.item?.iconUrl || 
                trade.item?.image || 
                '/images/placeholder-item.png'} 
            alt={trade.itemName || trade.item?.marketHashName || 'Trade Item'} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/placeholder-item.png';
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </motion.div>

        <div className="trade-item-details" style={{
          flex: "1"
        }}>
          <div className="trade-item-name" style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "10px",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <motion.div
              whileHover={{ rotate: 15 }}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FontAwesomeIcon icon={faTag} />
            </motion.div>
            <span>{trade.itemName || trade.item?.marketHashName || 'Unknown Item'}</span>
          </div>
          
          <div className="trade-item-price" style={{
            fontSize: "1.2rem",
            fontWeight: "700",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <motion.div
              whileHover={{ scale: 1.2 }}
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981"
              }}
            >
              <FontAwesomeIcon icon={faDollarSign} />
            </motion.div>
            <span>{formatCurrency(trade.price)}</span>
          </div>
        </div>

        <div className="trade-participants" style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div className="trade-participant" style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <motion.div 
              className="trade-participant-avatar"
              whileHover={{ scale: 1.1 }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.08)",
                border: "2px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <img 
                src={trade.buyer?.avatar || '/images/default-avatar.png'} 
                alt="Buyer" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/default-avatar.png';
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </motion.div>
            <div className="trade-participant-info">
              <div className="trade-role" style={{
                fontSize: "0.75rem",
                color: trade.isUserBuyer ? "#f472b6" : "rgba(255, 255, 255, 0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                {trade.isUserBuyer ? 'You (Buyer)' : 'Buyer'}
              </div>
              <div className="trade-user" style={{
                fontSize: "0.95rem",
                color: "rgba(255, 255, 255, 0.9)",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: "0.8rem" }} />
                <span>{trade.buyer?.displayName || 'Unknown User'}</span>
              </div>
            </div>
          </div>
          
          <div className="trade-divider" style={{
            height: "1px",
            background: "rgba(255, 255, 255, 0.08)"
          }}></div>
          
          <div className="trade-participant" style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <motion.div 
              className="trade-participant-avatar"
              whileHover={{ scale: 1.1 }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.08)",
                border: "2px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <img 
                src={trade.seller?.avatar || '/images/default-avatar.png'} 
                alt="Seller"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/default-avatar.png';
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </motion.div>
            <div className="trade-participant-info">
              <div className="trade-role" style={{
                fontSize: "0.75rem",
                color: trade.isUserSeller ? "#f472b6" : "rgba(255, 255, 255, 0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                {trade.isUserSeller ? 'You (Seller)' : 'Seller'}
              </div>
              <div className="trade-user" style={{
                fontSize: "0.95rem",
                color: "rgba(255, 255, 255, 0.9)",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: "0.8rem" }} />
                <span>{trade.seller?.displayName || 'Unknown User'}</span>
              </div>
            </div>
          </div>
        </div>

        <motion.div 
          whileHover={{ 
            scale: 1.2, 
            rotate: 90,
            boxShadow: "0 0 20px rgba(244, 114, 182, 0.6)",
            background: "linear-gradient(135deg, #f472b6, #ec4899)"
          }}
          whileTap={{ scale: 0.9 }}
        >
          <Link 
            to={`/trades/${trade._id}`} 
            className="trade-view-button"
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              fontSize: "1rem",
              textDecoration: "none",
              transition: "all 0.3s ease"
            }}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TradeItem; 