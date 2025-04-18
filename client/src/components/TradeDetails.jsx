import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchTradeById, 
  sellerApproveTrade, 
  sellerInitiateTrade, 
  buyerConfirmReceipt,
  sellerSentItem,
  cancelTrade,
  updateTradePriceThunk 
} from '../redux/slices/tradesSlice';
import { formatDate } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';
import '../styles/TradeDetails.css';

const TradeDetails = () => {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTrade, loading, error } = useSelector((state) => state.trades);
  const { user } = useSelector((state) => state.auth);
  
  // State for price update modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // State for Steam trade offer URL
  const [steamOfferUrl, setSteamOfferUrl] = useState('');
  const [offerError, setOfferError] = useState('');

  useEffect(() => {
    if (tradeId) {
      dispatch(fetchTradeById(tradeId));
    }
  }, [dispatch, tradeId]);
  
  useEffect(() => {
    // Initialize the newPrice state when currentTrade changes
    if (currentTrade && currentTrade.price) {
      setNewPrice(currentTrade.price.toString());
    }
  }, [currentTrade]);

  const handleStatusUpdate = (newStatus) => {
    if (window.confirm(`Are you sure you want to ${newStatus} this trade?`)) {
      dispatch(updateTradeStatus({ tradeId, status: newStatus }));
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this trade?')) {
      dispatch(cancelTrade({ tradeId, reason: 'Cancelled by user' }));
    }
  };
  
  const handleSellerApprove = () => {
    if (window.confirm('Are you sure you want to approve this trade?')) {
      dispatch(sellerApproveTrade(tradeId));
    }
  };
  
  const handleSellerSendItem = (e) => {
    e.preventDefault();
    setOfferError('');
    
    if (!steamOfferUrl) {
      setOfferError('Please enter a valid Steam trade offer URL or ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to mark this item as sent?')) {
      dispatch(sellerSentItem({ tradeId, steamOfferUrl }));
    }
  };
  
  const handleBuyerConfirm = () => {
    if (window.confirm('Are you sure you want to confirm receiving this item?')) {
      dispatch(buyerConfirmReceipt(tradeId));
    }
  };

  const goBack = () => {
    navigate('/trades');
  };
  
  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateLoading(true);
    
    try {
      if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) {
        setUpdateError('Please enter a valid price greater than 0');
        setUpdateLoading(false);
        return;
      }
      
      const resultAction = await dispatch(
        updateTradePriceThunk({ 
          tradeId, 
          price: parseFloat(newPrice) 
        })
      );
      
      if (updateTradePriceThunk.fulfilled.match(resultAction)) {
        setShowPriceModal(false);
      } else if (updateTradePriceThunk.rejected.match(resultAction)) {
        setUpdateError(resultAction.payload || 'Failed to update price');
      }
    } catch (err) {
      console.error('Error updating trade price:', err);
      setUpdateError('An error occurred while updating the price');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error loading trade details</h2>
        <p>{error}</p>
        <button onClick={goBack} className="btn-secondary">Back to Trades</button>
      </div>
    );
  }

  if (!currentTrade) {
    return (
      <div className="not-found-container">
        <h2>Trade not found</h2>
        <p>The trade you're looking for doesn't exist or you don't have permission to view it.</p>
        <button onClick={goBack} className="btn-secondary">Back to Trades</button>
      </div>
    );
  }

  const isUserSeller = currentTrade.seller?._id === user?._id;
  const isUserBuyer = currentTrade.buyer?._id === user?._id;
  
  // Determine what actions are available based on trade status and user role
  const canCancel = ['awaiting_seller', 'created', 'pending', 'accepted'].includes(currentTrade.status);
  const canSellerApprove = isUserSeller && currentTrade.status === 'awaiting_seller';
  const canSellerSend = isUserSeller && currentTrade.status === 'accepted';
  const canBuyerConfirm = isUserBuyer && currentTrade.status === 'offer_sent';
    
  // Check if price can be updated - allowed statuses
  const canUpdatePrice = (isUserSeller || isUserBuyer) && 
    ['awaiting_seller', 'created', 'pending', 'accepted'].includes(currentTrade.status);

  // Format price with currency symbol
  const formatPrice = (price) => {
    if (price === undefined || price === null) return 'Not set';
    return `$${Number(price).toFixed(2)}`;
  };

  return (
    <div className="trade-details-container">
      <div className="trade-details-header">
        <button onClick={goBack} className="btn-back">
          ← Back to Trades
        </button>
        <div className="trade-status-section">
          <h1>Trade #{currentTrade._id.substring(0, 8)}</h1>
          <div className={`trade-status-badge status-${currentTrade.status}`}>
            {currentTrade.status.replace(/_/g, ' ').charAt(0).toUpperCase() + currentTrade.status.replace(/_/g, ' ').slice(1)}
          </div>
        </div>
      </div>

      <div className="trade-info">
        <div className="trade-date-info">
          <p>Created: {formatDate(currentTrade.createdAt)}</p>
          {currentTrade.completedAt && (
            <p>Completed: {formatDate(currentTrade.completedAt)}</p>
          )}
          
          {/* Price information */}
          <div className="trade-price-info">
            <div className="price-header">
              <h3>Trade Price: {formatPrice(currentTrade.price)}</h3>
              {canUpdatePrice && (
                <button 
                  className="btn-update-price" 
                  onClick={() => setShowPriceModal(true)}
                >
                  Update Price
                </button>
              )}
            </div>
            
            {/* Show price history if available */}
            {currentTrade.priceHistory && currentTrade.priceHistory.length > 0 && (
              <div className="price-history">
                <h4>Price History:</h4>
                <ul className="price-history-list">
                  {currentTrade.priceHistory.map((entry, index) => (
                    <li key={index} className="price-history-item">
                      <span className="price-value">{formatPrice(entry.price)}</span>
                      <span className="price-date">{formatDate(entry.updatedAt)}</span>
                      {entry.updatedBy && (
                        <span className="price-updater">by {entry.updatedBy}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="trade-parties-info">
          <div className="trade-party">
            <h3>Seller</h3>
            <div className="user-info">
              <img 
                src={currentTrade.seller?.avatar || '/default-avatar.png'} 
                alt={currentTrade.seller?.displayName} 
                className="user-avatar" 
              />
              <span>{currentTrade.seller?.displayName || 'Unknown'}</span>
              {isUserSeller && <span className="user-indicator">(You)</span>}
            </div>
          </div>

          <div className="trade-party">
            <h3>Buyer</h3>
            <div className="user-info">
              <img 
                src={currentTrade.buyer?.avatar || '/default-avatar.png'} 
                alt={currentTrade.buyer?.displayName} 
                className="user-avatar" 
              />
              <span>{currentTrade.buyer?.displayName || 'Unknown'}</span>
              {isUserBuyer && <span className="user-indicator">(You)</span>}
            </div>
          </div>
        </div>

        <div className="trade-item-section">
          <h3>Item Being Traded:</h3>
          <div className="trade-item">
            <img 
              src={currentTrade.item?.imageUrl || currentTrade.itemImage || '/default-item.png'} 
              alt={currentTrade.item?.marketHashName || currentTrade.itemName || 'Item'} 
              className="item-image" 
            />
            <div className="item-details">
              <h4>{currentTrade.item?.marketHashName || currentTrade.itemName || 'Unknown Item'}</h4>
              {currentTrade.item?.wear && <p>Wear: {currentTrade.item.wear}</p>}
              {currentTrade.item?.rarity && <p>Rarity: {currentTrade.item.rarity}</p>}
              <p className="item-price">{formatPrice(currentTrade.price)}</p>
            </div>
          </div>
        </div>

        {/* Status history */}
        {currentTrade.statusHistory && currentTrade.statusHistory.length > 0 && (
          <div className="status-history-section">
            <h3>Status History</h3>
            <ul className="status-history-list">
              {currentTrade.statusHistory.map((entry, index) => (
                <li key={index} className="status-history-item">
                  <span className={`status-badge status-${entry.status}`}>
                    {entry.status.replace(/_/g, ' ')}
                  </span>
                  <span className="status-timestamp">{formatDate(entry.timestamp)}</span>
                  {entry.note && <span className="status-note">{entry.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trade actions */}
        <div className="trade-actions">
          {canCancel && (
            <button className="btn-cancel" onClick={handleCancel}>
              Cancel Trade
            </button>
          )}
          
          {canSellerApprove && (
            <button className="btn-approve" onClick={handleSellerApprove}>
              Approve Trade
            </button>
          )}
          
          {canSellerSend && (
            <div className="send-item-form">
              <h3>Send Item to Buyer</h3>
              <form onSubmit={handleSellerSendItem}>
                <div className="form-group">
                  <label htmlFor="steamOfferUrl">Steam Trade Offer URL or ID:</label>
                  <input
                    type="text"
                    id="steamOfferUrl"
                    value={steamOfferUrl}
                    onChange={(e) => setSteamOfferUrl(e.target.value)}
                    placeholder="https://steamcommunity.com/tradeoffer/new/... or just the ID"
                  />
                  {offerError && <p className="error-message">{offerError}</p>}
                </div>
                <button type="submit" className="btn-send">Mark Item as Sent</button>
              </form>
            </div>
          )}
          
          {canBuyerConfirm && (
            <button className="btn-confirm" onClick={handleBuyerConfirm}>
              Confirm Item Received
            </button>
          )}
        </div>

        {/* Price update modal */}
        {showPriceModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Update Trade Price</h3>
              <form onSubmit={handleUpdatePrice}>
                <div className="form-group">
                  <label htmlFor="newPrice">New Price:</label>
                  <input
                    type="number"
                    id="newPrice"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    step="0.01"
                    min="0.01"
                  />
                  {updateError && <p className="error-message">{updateError}</p>}
                </div>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => setShowPriceModal(false)}
                    disabled={updateLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-update"
                    disabled={updateLoading}
                  >
                    {updateLoading ? 'Updating...' : 'Update Price'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeDetails;