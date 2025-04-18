import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTradeById, updateTradeStatus, updateTradePriceThunk } from '../redux/slices/tradesSlice';
import { formatDate } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';

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

  const isUserSender = currentTrade.sender?._id === user?._id;
  const isUserReceiver = currentTrade.receiver?._id === user?._id;
  const canAccept = isUserReceiver && currentTrade.status === 'pending';
  const canCancel = 
    (isUserSender && ['pending', 'accepted'].includes(currentTrade.status)) ||
    (isUserReceiver && currentTrade.status === 'accepted');
    
  // Check if price can be updated - allowed statuses
  const canUpdatePrice = (isUserSender || isUserReceiver) && 
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
        <h1>Trade Details</h1>
        <div className="trade-status-badge status-{currentTrade.status}">
          {currentTrade.status.charAt(0).toUpperCase() + currentTrade.status.slice(1)}
        </div>
      </div>

      <div className="trade-info">
        <div className="trade-date-info">
          <p>Created: {formatDate(currentTrade.createdAt)}</p>
          {currentTrade.updatedAt && (
            <p>Last updated: {formatDate(currentTrade.updatedAt)}</p>
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
            <h3>Sender</h3>
            <div className="user-info">
              <img 
                src={currentTrade.sender?.avatar || '/default-avatar.png'} 
                alt={currentTrade.sender?.username} 
                className="user-avatar" 
              />
              <span>{currentTrade.sender?.username}</span>
              {isUserSender && <span className="user-indicator">(You)</span>}
            </div>
          </div>

          <div className="trade-party">
            <h3>Receiver</h3>
            <div className="user-info">
              <img 
                src={currentTrade.receiver?.avatar || '/default-avatar.png'} 
                alt={currentTrade.receiver?.username} 
                className="user-avatar" 
              />
              <span>{currentTrade.receiver?.username}</span>
              {isUserReceiver && <span className="user-indicator">(You)</span>}
            </div>
          </div>
        </div>

        <div className="trade-items-section">
          <div className="trade-offering">
            <h3>Sender is offering:</h3>
            <div className="items-list">
              {currentTrade.senderItems?.length > 0 ? (
                currentTrade.senderItems.map((item) => (
                  <div key={item._id} className="trade-item">
                    <img 
                      src={item.imageUrl || '/default-item.png'} 
                      alt={item.name} 
                      className="item-image" 
                    />
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <p className="item-value">${item.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No items offered</p>
              )}
            </div>
          </div>

          <div className="trade-requesting">
            <h3>Receiver is offering:</h3>
            <div className="items-list">
              {currentTrade.receiverItems?.length > 0 ? (
                currentTrade.receiverItems.map((item) => (
                  <div key={item._id} className="trade-item">
                    <img 
                      src={item.imageUrl || '/default-item.png'} 
                      alt={item.name} 
                      className="item-image" 
                    />
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <p className="item-value">${item.value.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No items offered</p>
              )}
            </div>
          </div>
        </div>

        {currentTrade.message && (
          <div className="trade-message">
            <h3>Message</h3>
            <p>{currentTrade.message}</p>
          </div>
        )}

        <div className="trade-actions">
          {canAccept && (
            <button 
              onClick={() => handleStatusUpdate('accepted')} 
              className="btn-accept"
            >
              Accept Trade
            </button>
          )}
          {isUserReceiver && currentTrade.status === 'pending' && (
            <button 
              onClick={() => handleStatusUpdate('declined')} 
              className="btn-decline"
            >
              Decline Trade
            </button>
          )}
          {canCancel && (
            <button 
              onClick={() => handleStatusUpdate('cancelled')} 
              className="btn-cancel"
            >
              Cancel Trade
            </button>
          )}
          {currentTrade.status === 'accepted' && (
            <button 
              onClick={() => handleStatusUpdate('completed')} 
              className="btn-complete"
            >
              Mark as Completed
            </button>
          )}
        </div>
      </div>
      
      {/* Price Update Modal */}
      {showPriceModal && (
        <div className="modal-backdrop">
          <div className="price-update-modal">
            <h3>Update Trade Price</h3>
            <form onSubmit={handleUpdatePrice}>
              <div className="form-group">
                <label htmlFor="price">Price ($):</label>
                <input
                  type="number"
                  id="price"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  disabled={updateLoading}
                />
              </div>
              
              {updateError && <p className="error-message">{updateError}</p>}
              
              <div className="modal-buttons">
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
  );
};

export default TradeDetails;