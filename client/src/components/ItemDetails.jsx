import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import TradePanel from './TradePanel';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/ItemDetails.css';

const ItemDetails = ({ 
  item: initialItem = null,
  itemId, 
  isOpen = false, 
  onClose, 
  onItemUpdated,
  onAction
}) => {
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(!initialItem);
  const [error, setError] = useState(null);
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState(null);
  const [isUserOwner, setIsUserOwner] = useState(false);
  
  useEffect(() => {
    // If item is directly provided, use it
    if (initialItem) {
      setItem(initialItem);
      setLoading(false);
      checkUserOwnership(initialItem);
      return;
    }
    
    // Otherwise fetch by ID if available and modal is open
    if (itemId && isOpen) {
      fetchItemDetails();
    }
  }, [itemId, isOpen, initialItem]);
  
  const checkUserOwnership = async (itemData) => {
    try {
      // Check if the current user is the owner
      const userResponse = await axios.get(`${API_URL}/user/profile`, {
        withCredentials: true
      });
      
      if (itemData.owner && userResponse.data && 
          itemData.owner._id === userResponse.data._id) {
        setIsUserOwner(true);
      } else {
        setIsUserOwner(false);
      }
    } catch (err) {
      console.error('Error checking user ownership:', err);
      setIsUserOwner(false);
    }
  };
  
  const fetchItemDetails = async () => {
    if (!itemId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/marketplace/item/${itemId}`, {
        withCredentials: true
      });
      setItem(response.data);
      checkUserOwnership(response.data);
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(err.response?.data?.error || 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBuyNow = () => {
    if (onAction) {
      onAction('buy');
    } else {
      setTradeAction('buy');
      setTradePanelOpen(true);
    }
  };
  
  const handleMakeOffer = () => {
    if (onAction) {
      onAction('offer');
    } else {
      setTradeAction('offer');
      setTradePanelOpen(true);
    }
  };

  const handleTradeComplete = (data) => {
    if (onItemUpdated) {
      onItemUpdated(data);
    }
  };
  
  const handleCancelListing = async (itemId) => {
    try {
      const response = await axios.put(
        `${API_URL}/marketplace/cancel/${itemId}`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        if (window.showNotification) {
          window.showNotification(
            'Listing Removed',
            'Your item has been removed from the marketplace.',
            'SUCCESS'
          );
        }
        
        // Close the modal and notify parent component
        if (onItemUpdated) {
          onItemUpdated({
            ...item,
            isListed: false
          });
        }
        
        onClose();
      }
    } catch (err) {
      console.error('Error cancelling listing:', err);
      
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to remove listing. Please try again.',
          'ERROR'
        );
      }
    }
  };
  
  // Close on escape key
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
  
  // Format wear value for display
  const formatWear = (wear) => {
    switch (wear) {
      case 'Factory New':
        return { text: 'FN', color: '#4ade80' };
      case 'Minimal Wear':
        return { text: 'MW', color: '#3b82f6' };
      case 'Field-Tested':
        return { text: 'FT', color: '#9333ea' };
      case 'Well-Worn':
        return { text: 'WW', color: '#f97316' };
      case 'Battle-Scarred':
        return { text: 'BS', color: '#ef4444' };
      default:
        return { text: wear, color: '#9ca3af' };
    }
  };
  
  // Get color for rarity
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Consumer Grade':
        return '#b0c3d9';
      case 'Industrial Grade':
        return '#5e98d9';
      case 'Mil-Spec Grade':
        return '#4b69ff';
      case 'Restricted':
        return '#8847ff';
      case 'Classified':
        return '#d32ee6';
      case 'Covert':
        return '#eb4b4b';
      case 'Contraband':
        return '#e4ae39';
      default:
        return '#9ca3af';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 100,
            }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="item-details-modal"
            initial={{ opacity: 0, scale: 0.9, x: '40%', y: '40%' }}
            animate={{ opacity: 1, scale: 1, x: '0%', y: '0%' }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              mass: 1
            }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              padding: '32px',
              zIndex: 101,
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.07)'
            }}
          >
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
            
            {loading ? (
              <div className="item-details-loading">
                <div className="loading-spinner"></div>
                <p className="pulse-effect">Loading item details...</p>
              </div>
            ) : error ? (
              <div className="item-details-loading">
                <p style={{ color: '#ef4444' }}>{error}</p>
              </div>
            ) : item ? (
              <div>
                <div className="item-header">
                  <div className="item-header-image">
                    <img 
                      src={item.image || 'https://via.placeholder.com/200'} 
                      alt={item.name} 
                    />
                  </div>
                  
                  <div className="item-header-details">
                    <h2 className="item-title">{item.name}</h2>
                    <p className="item-subtitle">
                      {item.weapon_type || ''} 
                      {item.exterior && ` | ${item.exterior}`}
                    </p>
                    
                    <div className="item-price-tag">
                      {formatCurrency(item.price, 'USD')}
                    </div>
                    
                    <div className="item-meta">
                      {item.exterior && (
                        <div className="meta-item">
                          <div className="meta-label">Exterior</div>
                          <div className="meta-value" style={{ color: formatWear(item.exterior).color }}>
                            {item.exterior}
                          </div>
                        </div>
                      )}
                      
                      {item.rarity && (
                        <div className="meta-item">
                          <div className="meta-label">Rarity</div>
                          <div className="meta-value" style={{ color: getRarityColor(item.rarity) }}>
                            {item.rarity}
                          </div>
                        </div>
                      )}
                      
                      {item.float_value && (
                        <div className="meta-item">
                          <div className="meta-label">Float Value</div>
                          <div className="meta-value">
                            {item.float_value.toFixed(8)}
                          </div>
                        </div>
                      )}
                      
                      {item.created_at && (
                        <div className="meta-item">
                          <div className="meta-label">Listed</div>
                          <div className="meta-value">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="item-actions">
                      {!isUserOwner ? (
                        <>
                          <button 
                            className="item-action-button buy-now-button"
                            onClick={handleBuyNow}
                          >
                            Buy Now
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="21" r="1"></circle>
                              <circle cx="20" cy="21" r="1"></circle>
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                          </button>
                          <button 
                            className="item-action-button make-offer-button"
                            onClick={handleMakeOffer}
                          >
                            Make Offer
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"></line>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <button 
                          className="item-action-button cancel-button"
                          onClick={() => handleCancelListing(item._id)}
                        >
                          Cancel Listing
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {item.description && (
                  <div className="item-description">
                    <h3 className="description-title">Description</h3>
                    <p className="description-content">{item.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="item-details-loading">
                <p>No item data available</p>
              </div>
            )}
          </motion.div>
            
          {/* Trade Panel */}
          <TradePanel
            isOpen={tradePanelOpen}
            onClose={() => setTradePanelOpen(false)}
            onSuccess={handleTradeComplete}
            item={item}
            action={tradeAction}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default ItemDetails;