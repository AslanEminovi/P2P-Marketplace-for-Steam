import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { formatCurrency } from '../config/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck, faSyncAlt, faExclamationTriangle, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { 
  updateTradeStatus,
  fetchTradeDetails
} from '../redux/slices/tradesSlice';

// Component to display trade item details
const TradeItemDisplay = ({ item }) => {
  if (!item) return null;
  
  return (
    <div className="trade-item-display">
      <div className="trade-item-image-container">
        <img 
          src={item.icon || item.iconUrl || '/default-item.png'} 
          alt={item.name || 'Item'} 
          className="trade-item-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-item.png';
          }}
        />
      </div>
      <div className="trade-item-details">
        <h4 className="trade-item-name">{item.name || item.marketHashName}</h4>
        <p className="trade-item-price">{formatCurrency(item.price || 0)}</p>
        {item.float && (
          <p className="trade-item-float">Float: {parseFloat(item.float).toFixed(10)}</p>
        )}
        {item.wear && (
          <p className="trade-item-wear">Wear: {item.wear}</p>
        )}
      </div>
    </div>
  );
};

// Component for user avatar and info
const UserDisplay = ({ user, role }) => {
  return (
    <div className="trade-user-display">
      <div className="trade-user-avatar">
        <img 
          src={user?.avatar || '/default-avatar.png'} 
          alt={user?.displayName || role} 
          className="trade-user-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/default-avatar.png';
          }}
        />
      </div>
      <div className="trade-user-info">
        <p className="trade-user-role">{role}</p>
        <p className="trade-user-name">{user?.displayName || 'Unknown User'}</p>
      </div>
    </div>
  );
};

const TradeSidePanel = ({ isOpen, onClose, tradeId, role = 'buyer' }) => {
  const dispatch = useDispatch();
  const trade = useSelector(state => state.trades.currentTrade);
  const currentUser = useSelector(state => state.auth.user);
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [counterOfferAmount, setCounterOfferAmount] = useState(0);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  
  // Determine if current user is buyer or seller
  const isBuyer = role === 'buyer' || (trade && trade.buyer?._id === currentUser?._id);
  const isSeller = role === 'seller' || (trade && trade.seller?._id === currentUser?._id);
  
  // Load trade details when panel opens
  useEffect(() => {
    if (isOpen && tradeId) {
      dispatch(fetchTradeDetails(tradeId));
    }
  }, [isOpen, tradeId, dispatch]);
  
  // Update status message based on trade status
  useEffect(() => {
    if (!trade) return;
    
    switch (trade.status) {
      case 'created':
        setStatusMessage(isBuyer ? 'Waiting for seller to confirm...' : 'New trade offer! Please confirm or reject.');
        break;
      case 'pending':
        setStatusMessage(isBuyer ? 'Offer sent! Waiting for seller to confirm.' : 'Trade offer pending. Please confirm or reject.');
        break;
      case 'awaiting_seller':
        setStatusMessage(isBuyer ? 'Waiting for seller to send the item.' : 'Please send the item to buyer.');
        break;
      case 'awaiting_buyer':
        setStatusMessage(isBuyer ? 'Please confirm receipt of the item.' : 'Waiting for buyer to confirm receipt.');
        break;
      case 'completed':
        setStatusMessage('Trade completed successfully!');
        break;
      case 'cancelled':
        setStatusMessage('Trade was cancelled.');
        break;
      case 'rejected':
        setStatusMessage('Trade offer was rejected.');
        break;
      default:
        setStatusMessage(`Trade status: ${trade.status}`);
    }
  }, [trade, isBuyer, isSeller]);
  
  // Handles trade offer acceptance (seller)
  const handleAcceptOffer = async () => {
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'seller-initiate'
      })).unwrap();
      
      toast.success('Trade offer accepted!');
      // Refresh trade details
      dispatch(fetchTradeDetails(tradeId));
    } catch (error) {
      toast.error('Failed to accept trade offer: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handles trade offer rejection (seller)
  const handleRejectOffer = async () => {
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'cancel',
        data: { reason: 'Rejected by seller' }
      })).unwrap();
      
      toast.success('Trade offer rejected');
      onClose();
    } catch (error) {
      toast.error('Failed to reject trade offer: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handles counter offer submission (seller)
  const handleCounterOffer = async () => {
    if (!counterOfferAmount || counterOfferAmount <= 0) {
      toast.error('Please enter a valid counter offer amount');
      return;
    }
    
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'counter-offer',
        data: { counterOffer: counterOfferAmount }
      })).unwrap();
      
      toast.success('Counter offer sent!');
      setShowCounterOffer(false);
      // Refresh trade details
      dispatch(fetchTradeDetails(tradeId));
    } catch (error) {
      toast.error('Failed to send counter offer: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handles confirming item sent (seller)
  const handleConfirmSent = async () => {
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'seller-confirm-sent'
      })).unwrap();
      
      toast.success('Item marked as sent! Buyer has been notified.');
      
      // Open Steam trade URL in new tab if available
      if (trade?.buyer?.tradeUrl) {
        window.open(trade.buyer.tradeUrl, '_blank');
      }
      
      // Refresh trade details
      dispatch(fetchTradeDetails(tradeId));
    } catch (error) {
      toast.error('Failed to confirm item sent: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handles confirming receipt (buyer)
  const handleConfirmReceipt = async () => {
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'buyer-confirm'
      })).unwrap();
      
      toast.success('Receipt confirmed! Trade completed successfully.');
      // Refresh trade details
      dispatch(fetchTradeDetails(tradeId));
    } catch (error) {
      toast.error('Failed to confirm receipt: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handles cancellation from either side
  const handleCancelTrade = async () => {
    setIsLoading(true);
    try {
      await dispatch(updateTradeStatus({
        tradeId: trade._id,
        action: 'cancel',
        data: { reason: isBuyer ? 'Cancelled by buyer' : 'Cancelled by seller' }
      })).unwrap();
      
      toast.success('Trade cancelled');
      onClose();
    } catch (error) {
      toast.error('Failed to cancel trade: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Go to Steam trades page
  const goToSteamTrades = () => {
    let tradeUrl;
    
    if (isBuyer && trade?.seller?.steamId) {
      tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${trade.seller.steamId}`;
    } else if (isSeller && trade?.buyer?.steamId) {
      tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${trade.buyer.steamId}`;
    } else {
      tradeUrl = 'https://steamcommunity.com/my/tradeoffers/';
    }
    
    window.open(tradeUrl, '_blank');
  };
  
  // Render actions based on user role and trade status
  const renderActions = () => {
    if (!trade) return null;
    
    // Seller actions
    if (isSeller) {
      switch (trade.status) {
        case 'created':
        case 'pending':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-reject" 
                onClick={handleRejectOffer}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Reject
              </button>
              
              <button 
                className="trade-action-button trade-action-counter" 
                onClick={() => setShowCounterOffer(!showCounterOffer)}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faExchangeAlt} /> Counter
              </button>
              
              <button 
                className="trade-action-button trade-action-accept" 
                onClick={handleAcceptOffer}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faCheck} /> Accept
              </button>
            </div>
          );
          
        case 'awaiting_seller':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-cancel" 
                onClick={handleCancelTrade}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              
              <button 
                className="trade-action-button trade-action-steam" 
                onClick={goToSteamTrades}
                disabled={isLoading}
              >
                Open Steam Trades
              </button>
              
              <button 
                className="trade-action-button trade-action-confirm" 
                onClick={handleConfirmSent}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faCheck} /> Confirm Sent
              </button>
            </div>
          );
          
        case 'awaiting_buyer':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-steam" 
                onClick={goToSteamTrades}
                disabled={isLoading}
              >
                Open Steam Trades
              </button>
              
              <div className="trade-status-message">
                <FontAwesomeIcon icon={faSyncAlt} className="fa-spin" /> Waiting for buyer to confirm receipt...
              </div>
            </div>
          );
          
        case 'completed':
          return (
            <div className="trade-side-panel-actions">
              <div className="trade-status-success">
                <FontAwesomeIcon icon={faCheck} /> Trade completed successfully!
              </div>
            </div>
          );
          
        default:
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-close" 
                onClick={onClose}
              >
                Close
              </button>
            </div>
          );
      }
    }
    
    // Buyer actions
    if (isBuyer) {
      switch (trade.status) {
        case 'created':
        case 'pending':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-cancel" 
                onClick={handleCancelTrade}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel Offer
              </button>
              
              <div className="trade-status-message">
                <FontAwesomeIcon icon={faSyncAlt} className="fa-spin" /> Waiting for seller to respond...
              </div>
            </div>
          );
          
        case 'awaiting_seller':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-cancel" 
                onClick={handleCancelTrade}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              
              <div className="trade-status-message">
                <FontAwesomeIcon icon={faSyncAlt} className="fa-spin" /> Waiting for seller to send item...
              </div>
            </div>
          );
          
        case 'awaiting_buyer':
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-steam" 
                onClick={goToSteamTrades}
                disabled={isLoading}
              >
                Open Steam Trades
              </button>
              
              <button 
                className="trade-action-button trade-action-confirm" 
                onClick={handleConfirmReceipt}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faCheck} /> Confirm Receipt
              </button>
            </div>
          );
          
        case 'completed':
          return (
            <div className="trade-side-panel-actions">
              <div className="trade-status-success">
                <FontAwesomeIcon icon={faCheck} /> Trade completed successfully!
              </div>
            </div>
          );
          
        default:
          return (
            <div className="trade-side-panel-actions">
              <button 
                className="trade-action-button trade-action-close" 
                onClick={onClose}
              >
                Close
              </button>
            </div>
          );
      }
    }
    
    return null;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="trade-side-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Side Panel */}
          <motion.div 
            className="trade-side-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Panel Header */}
            <div className="trade-side-panel-header">
              <h3>Trade Details</h3>
              <button className="trade-side-panel-close" onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            {/* Panel Content */}
            <div className="trade-side-panel-content">
              {!trade ? (
                <div className="trade-side-panel-loading">
                  <FontAwesomeIcon icon={faSyncAlt} className="fa-spin" />
                  <p>Loading trade details...</p>
                </div>
              ) : (
                <>
                  {/* Trade Status */}
                  <div className="trade-side-panel-status">
                    <div className={`trade-status-badge trade-status-${trade.status}`}>
                      {trade.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <p className="trade-status-message">{statusMessage}</p>
                  </div>
                  
                  {/* Trade ID and Date */}
                  <div className="trade-side-panel-info">
                    <p className="trade-id">Trade #{trade._id}</p>
                    <p className="trade-date">
                      Created: {new Date(trade.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Users */}
                  <div className="trade-side-panel-users">
                    <UserDisplay user={trade.seller} role="Seller" />
                    <FontAwesomeIcon icon={faExchangeAlt} className="trade-direction-icon" />
                    <UserDisplay user={trade.buyer} role="Buyer" />
                  </div>
                  
                  {/* Item Details */}
                  <div className="trade-side-panel-item">
                    <h4>Item</h4>
                    <TradeItemDisplay item={trade.item} />
                  </div>
                  
                  {/* Counter Offer (Seller only) */}
                  {showCounterOffer && isSeller && (
                    <div className="trade-counter-offer">
                      <h4>Counter Offer</h4>
                      <div className="counter-offer-input">
                        <input 
                          type="number" 
                          value={counterOfferAmount} 
                          onChange={(e) => setCounterOfferAmount(parseFloat(e.target.value) || 0)}
                          placeholder="Enter amount"
                          min="0"
                          step="0.01"
                        />
                        <button 
                          onClick={handleCounterOffer}
                          disabled={isLoading || !counterOfferAmount}
                        >
                          Send Counter
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  {renderActions()}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TradeSidePanel; 