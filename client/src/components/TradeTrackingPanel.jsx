import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config/constants';
import socketService from '../services/socketService';
import { formatCurrency } from '../config/constants';
import '../styles/TradePanel.css';

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0.5 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { 
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { 
      type: 'spring',
      damping: 30,
      stiffness: 300
    }
  }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.4
    }
  }
};

const TradeTrackingPanel = ({
  isOpen,
  onClose,
  tradeId,
  userRole = 'buyer' // 'buyer' or 'seller'
}) => {
  const [tradeData, setTradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Fetch trade data
  useEffect(() => {
    if (isOpen && tradeId) {
      fetchTradeData();
      
      // Join the trade room for real-time updates
      socketService.joinTradeRoom(tradeId);
      socketService.subscribeToTradeUpdates(tradeId);
    }
    
    return () => {
      // Clean up socket subscriptions when component unmounts
      if (tradeId) {
        socketService.leaveTradeRoom(tradeId);
        socketService.unsubscribeFromTradeUpdates(tradeId);
      }
    };
  }, [isOpen, tradeId]);

  // Handle socket updates
  useEffect(() => {
    if (!socketService.isConnected() || !tradeId) return;
    
    const handleTradeUpdate = (update) => {
      if (update.tradeId === tradeId) {
        // Refresh the trade data
        fetchTradeData();
        
        // Add status update to the list
        setStatusUpdates(prev => [
          ...prev,
          {
            id: Date.now(),
            status: update.status,
            message: update.message || getDefaultStatusMessage(update.status, userRole === 'seller', userRole === 'buyer'),
            timestamp: new Date()
          }
        ]);
      }
    };
    
    socketService.socket.on('trade_update', handleTradeUpdate);
    
    return () => {
      socketService.socket.off('trade_update', handleTradeUpdate);
    };
  }, [tradeId, userRole]);

  // Close panel when escape key is pressed
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Close when clicking outside the panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchTradeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true
      });
      
      setTradeData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching trade data:', err);
      setError('Failed to load trade details');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToTrades = () => {
    onClose();
    navigate('/trades');
  };

  // Helper function for status messages
  const getDefaultStatusMessage = (status, isSeller, isBuyer) => {
    if (status === 'awaiting_seller' && isSeller) {
      return 'Please review and accept this trade offer.';
    } else if (status === 'awaiting_seller' && isBuyer) {
      return 'Waiting for the seller to accept your trade request.';
    } else if (status === 'awaiting_buyer' && isBuyer) {
      return 'Please confirm that you received the item.';
    } else if (status === 'awaiting_buyer' && isSeller) {
      return 'Waiting for buyer to confirm receipt of the item.';
    } else if (status === 'completed') {
      return 'This trade has been completed successfully.';
    } else if (status === 'cancelled') {
      return 'This trade was cancelled.';
    } else if (status === 'rejected') {
      return 'This trade was rejected by the seller.';
    }
    
    return `Status updated to: ${status.replace(/_/g, ' ')}`;
  };

  // Get color for status
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4ade80'; // Green
      case 'cancelled':
      case 'failed':
      case 'rejected':
      case 'expired':
        return '#ef4444'; // Red
      case 'awaiting_seller':
      case 'awaiting_buyer':
        return '#3b82f6'; // Blue
      case 'offer_sent':
      case 'accepted':
        return '#f59e0b'; // Amber
      case 'awaiting_confirmation':
        return '#8b5cf6'; // Purple
      default:
        return '#9ca3af'; // Gray
    }
  };

  const renderStatusTimeline = () => {
    if (!statusUpdates.length) return null;
    
    return (
      <div className="status-timeline mt-4">
        <h3 className="text-lg font-medium mb-2">Status Updates</h3>
        <div className="space-y-2">
          {statusUpdates.map((update) => (
            <div 
              key={update.id} 
              className="p-2 rounded-md" 
              style={{ backgroundColor: `${getStatusColor(update.status)}22` }}
            >
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: getStatusColor(update.status) }}
                ></div>
                <span className="text-sm">{update.message}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {update.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTradeStatus = () => {
    if (!tradeData) return null;
    
    return (
      <div className="trade-status">
        <div 
          className="status-badge p-2 rounded-full text-sm inline-flex items-center"
          style={{ 
            backgroundColor: `${getStatusColor(tradeData.status)}22`,
            color: getStatusColor(tradeData.status)
          }}
        >
          <span className="ml-1">{tradeData.status.replace(/_/g, ' ')}</span>
        </div>
        <p className="status-message mt-2">
          {getDefaultStatusMessage(
            tradeData.status, 
            userRole === 'seller', 
            userRole === 'buyer'
          )}
        </p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="trade-panel-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="trade-panel"
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="trade-panel-header">
              <h2>
                {userRole === 'buyer' ? 'Your Purchase' : 'Your Sale'}
              </h2>
              <button 
                className="close-button"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            
            <motion.div
              className="trade-panel-content"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading trade details...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <p>{error}</p>
                  <button onClick={fetchTradeData}>Retry</button>
                </div>
              ) : tradeData ? (
                <>
                  <div className="trade-details">
                    <div className="item-card">
                      {tradeData.item && (
                        <div className="flex items-start gap-4">
                          <div className="item-image">
                            <img 
                              src={tradeData.item.imageUrl}
                              alt={tradeData.item.marketHashName}
                              className="rounded-md"
                            />
                          </div>
                          <div className="item-info">
                            <h3 className="item-name">{tradeData.item.marketHashName}</h3>
                            <p className="item-price">
                              {formatCurrency(tradeData.amount || tradeData.price || 0)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {renderTradeStatus()}
                    {renderStatusTimeline()}
                    
                    {tradeData.status === 'completed' && (
                      <div className="trade-complete-message mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p>Trade successfully completed!</p>
                      </div>
                    )}
                    
                    <div className="trade-actions mt-6">
                      <button
                        className="primary-button w-full"
                        onClick={handleGoToTrades}
                      >
                        Go to Trades Page
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-data-state">
                  <p>No trade information available</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TradeTrackingPanel; 