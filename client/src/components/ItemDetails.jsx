import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import TradePanel from './TradePanel';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/ItemDetails.css';

// Define rarity colors mapping - same as in ItemCard3D
const RARITY_COLORS = {
  'Consumer Grade': '#b0c3d9',
  'Industrial Grade': '#5e98d9',
  'Mil-Spec Grade': '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ce6',
  'Covert': '#eb4b4b',
  '★': '#e4ae39',
  // Defaults for unknown types
  'default': '#b0c3d9'
};

// Define wear color mapping - same as in ItemCard3D
const WEAR_COLORS = {
  'Factory New': '#4cd94c',
  'Minimal Wear': '#87d937',
  'Field-Tested': '#d9d937',
  'Well-Worn': '#d98037',
  'Battle-Scarred': '#d94040',
  // Default for unknown wear
  'default': '#94a3b8'
};

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
  
  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Buy Now button clicked");
    
    if (onAction) {
      onAction('buy');
    } else {
      setTradeAction('buy');
      setTradePanelOpen(true);
    }
  };
  
  const handleMakeOffer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Make Offer button clicked");
    
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
  
  // Get truncated name for better display
  const getTruncatedName = (item) => {
    if (!item) return '';
    
    let name = item.marketHashName || item.name || '';
    // Remove wear information from the name if present
    name = name.replace(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i, '').trim();
    
    // Truncate long names
    if (name.length > 40) {
      return name.substring(0, 37) + '...';
    }
    return name;
  };
  
  // Extract or identify wear from item data
  const getWearName = (item) => {
    if (!item) return null;
    
    // First check if exterior or wear is provided directly
    if (item.exterior) {
      return item.exterior;
    }
    
    if (item.wear) {
      return item.wear;
    }
    
    // Then try to extract from market hash name if available
    if (item.marketHashName) {
      const wearMatch = item.marketHashName.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i);
      if (wearMatch) {
        return wearMatch[0];
      }
    }
    
    return null;
  };
  
  // Get rarity color - fallback to default if not found
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS.default;
  };
  
  // Get wear color - fallback to default if not found
  const getWearColor = (wear) => {
    return WEAR_COLORS[wear] || WEAR_COLORS.default;
  };
  
  // Get image URL with fallback
  const getItemImage = (item) => {
    if (!item) return 'https://via.placeholder.com/200?text=No+Image';
    
    // Check for different possible image properties
    return item.imageUrl || item.image || `https://via.placeholder.com/200?text=${encodeURIComponent(item.name || 'Item')}`;
  };
  
  // Get weapon type/category
  const getWeaponType = (item) => {
    if (!item) return '';
    return item.weapon_type || item.category || '';
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="item-details-wrapper">
      {isOpen && (
        <>
          {/* Dark overlay behind the modal */}
          <div 
            className="item-details-overlay"
            onClick={onClose}
          />
          
          {/* Main modal container */}
          <div className="item-details-container">
            {/* Close button */}
            <button
              className="item-details-close-btn"
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Content area */}
            <div className="item-details-content">
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
                <>
                  {/* Header with image and basic details */}
                  <div className="item-header">
                    <div className="item-header-image" style={{
                      background: `radial-gradient(circle at top right, ${getRarityColor(item.rarity)}22, transparent 70%)`
                    }}>
                      <img 
                        src={getItemImage(item)}
                        alt={getTruncatedName(item)}
                        className="item-img"
                      />
                    </div>
                    
                    <div className="item-header-details">
                      <h2 className="item-title">{getTruncatedName(item)}</h2>
                      <p className="item-subtitle">
                        {getWeaponType(item)}
                        {getWearName(item) && ` | ${getWearName(item)}`}
                      </p>
                      
                      <div className="item-price-tag">
                        {formatCurrency(item.price, 'USD')}
                      </div>
                      
                      <div className="item-meta">
                        {getWearName(item) && (
                          <div className="meta-item">
                            <div className="meta-label">Exterior</div>
                            <div className="meta-value" style={{ color: getWearColor(getWearName(item)) }}>
                              {getWearName(item)}
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
                              {parseFloat(item.float_value).toFixed(8)}
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
                      
                      {/* Owner info section */}
                      {item.owner && (
                        <div className="item-owner">
                          <div className="meta-label">Listed by</div>
                          <div className="owner-info">
                            <div className="owner-avatar">
                              {item.owner.avatar ? (
                                <img src={item.owner.avatar} alt={item.owner.displayName || 'Seller'} />
                              ) : (
                                <div className="avatar-placeholder">
                                  {(item.owner.displayName?.[0] || '?').toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="owner-name">
                              {item.owner.displayName || 'Anonymous Seller'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons moved outside other containers for better visibility */}
                  <div className="item-action-buttons-container">
                    {!isUserOwner ? (
                      <>
                        <button 
                          className="action-button action-button-buy"
                          onClick={handleBuyNow}
                          type="button"
                        >
                          <span>Buy Now</span>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                          </svg>
                        </button>
                        <button 
                          className="action-button action-button-offer"
                          onClick={handleMakeOffer}
                          type="button"
                        >
                          <span>Make Offer</span>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button 
                        className="action-button action-button-cancel"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCancelListing(item._id);
                        }}
                        type="button"
                      >
                        <span>Cancel Listing</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Description if available */}
                  {item.description && (
                    <div className="item-description">
                      <h3 className="description-title">Description</h3>
                      <p className="description-content">{item.description}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="item-details-loading">
                  <p>No item data available</p>
                </div>
              )}
            </div>
          </div>
            
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
    </div>
  );
};

export default ItemDetails;