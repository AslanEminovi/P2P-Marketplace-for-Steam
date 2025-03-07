import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, API_URL } from '../config/constants';
import TradePanel from './TradePanel';

const ItemDetails = ({ 
  itemId, 
  isOpen = false, 
  onClose, 
  onItemUpdated 
}) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState(null);
  const [isUserOwner, setIsUserOwner] = useState(false);
  
  useEffect(() => {
    if (itemId && isOpen) {
      fetchItemDetails();
    }
  }, [itemId, isOpen]);
  
  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/marketplace/item/${itemId}`, {
        withCredentials: true
      });
      setItem(response.data);
      
      // Check if the current user is the owner
      const userResponse = await axios.get(`${API_URL}/user/profile`, {
        withCredentials: true
      });
      
      if (response.data.owner && userResponse.data && 
          response.data.owner._id === userResponse.data._id) {
        setIsUserOwner(true);
      } else {
        setIsUserOwner(false);
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError(err.response?.data?.error || 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBuyNow = () => {
    setTradeAction('buy');
    setTradePanelOpen(true);
  };
  
  const handleMakeOffer = () => {
    setTradeAction('offer');
    setTradePanelOpen(true);
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
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 100,
          display: isOpen ? 'block' : 'none'
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '24px',
          zIndex: 101,
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: isOpen ? 'block' : 'none'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ×
        </button>
        
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '40px 0' 
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              borderTopColor: '#4ade80',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#7f1d1d',
            color: '#f87171',
            padding: '16px',
            borderRadius: '8px',
            margin: '20px 0'
          }}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : item ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Item header */}
              <div style={{ 
                display: 'flex', 
                gap: '24px',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row'
              }}>
                {/* Item image */}
                <div style={{
                  backgroundColor: '#111827',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: window.innerWidth < 640 ? '100%' : '300px',
                  height: '250px'
                }}>
                  <img 
                    src={item.imageUrl} 
                    alt={item.marketHashName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                
                {/* Item details */}
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    color: '#f1f1f1', 
                    marginTop: 0,
                    marginBottom: '12px' 
                  }}>
                    {item.marketHashName}
                  </h2>
                  
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {item.wear && (
                      <span style={{
                        backgroundColor: '#111827',
                        color: formatWear(item.wear).color,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {formatWear(item.wear).text}
                      </span>
                    )}
                    
                    {item.rarity && (
                      <span style={{
                        backgroundColor: '#111827',
                        color: getRarityColor(item.rarity),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {item.rarity}
                      </span>
                    )}
                    
                    <span style={{
                      backgroundColor: '#111827',
                      color: '#9ca3af',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      Asset ID: {item.assetId.substring(0, 8)}...
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ 
                        color: '#9ca3af',
                        fontSize: '0.875rem' 
                      }}>
                        Listed by
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={item.owner.avatar}
                        alt={item.owner.displayName}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%'
                        }}
                      />
                      <span style={{ color: '#f1f1f1' }}>
                        {item.owner.displayName}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Price</span>
                      <span style={{ 
                        color: '#4ade80', 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold' 
                      }}>
                        {formatCurrency(item.price, 'USD')}
                      </span>
                    </div>
                    {item.priceGEL && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end'
                      }}>
                        <span style={{ 
                          color: '#9ca3af', 
                          fontSize: '0.875rem' 
                        }}>
                          {formatCurrency(item.priceGEL, 'GEL')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px',
                    marginTop: '24px'
                  }}>
                    {!isUserOwner ? (
                      <>
                        <button
                          onClick={handleBuyNow}
                          style={{
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flex: '1'
                          }}
                        >
                          Buy Now
                        </button>
                        
                        {item.allowOffers && (
                          <button
                            onClick={handleMakeOffer}
                            style={{
                              backgroundColor: '#374151',
                              color: '#f1f1f1',
                              padding: '10px 20px',
                              border: '1px solid #4b5563',
                              borderRadius: '4px',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              flex: '1'
                            }}
                          >
                            Make Offer
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleCancelListing(item._id)}
                        style={{
                          backgroundColor: '#7f1d1d',
                          color: 'white',
                          padding: '10px 20px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          flex: '1'
                        }}
                      >
                        Remove Listing
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Additional details */}
              <div style={{
                backgroundColor: '#111827',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <h3 style={{ color: '#f1f1f1', marginTop: 0 }}>Item Description</h3>
                <p style={{ color: '#9ca3af' }}>
                  {item.description || `This is a ${item.marketHashName} with ${item.wear} condition.`}
                </p>
                
                {/* You could add more details here like float value, pattern index, etc. */}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            Item not found
          </div>
        )}
        
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
      
      {/* Trade Panel */}
      <TradePanel
        isOpen={tradePanelOpen}
        onClose={() => setTradePanelOpen(false)}
        item={item}
        action={tradeAction}
        onComplete={handleTradeComplete}
      />
    </>
  );
};

export default ItemDetails;