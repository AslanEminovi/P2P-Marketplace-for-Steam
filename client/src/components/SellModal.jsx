import React, { useState, useEffect } from 'react';
import lightPerformanceMonitor from '../utils/lightPerformanceMonitor';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import socketService from '../services/socketService';
import { API_URL } from '../config/constants';

// Debounce function to prevent UI blocking
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const SellModal = ({ item, onClose, onConfirm, onListingComplete }) => {
  const [currencyRate, setCurrencyRate] = useState(1.8);
  const [showCustom, setShowCustom] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize lightweight performance monitoring when modal opens
  useEffect(() => {
    // Reset timeout for modal operations
    lightPerformanceMonitor.resetTimeout(12000); // 12 seconds timeout
    
    // Register a one-time emergency callback for this specific modal
    lightPerformanceMonitor.registerResetCallback(() => {
      console.warn('Emergency reset triggered in SellModal');
      forceCloseModal();
    });
    
    return () => {
      // Reset is not needed here as forceCloseModal is already called in cleanup
      setIsSubmitting(false);
    };
  }, []);

  // Reset state when modal opens with a new item
  useEffect(() => {
    setCurrencyRate(1.8);
    setShowCustom(false);
    setCustomRate('');
    setIsSubmitting(false);
    
    // Pre-cache the image to reduce rendering delays
    if (item && item.image) {
      const img = new Image();
      img.src = item.image;
    }
  }, [item?.assetid, item?.asset_id]);
  
  const usdToGel = 2.79; // Current USD to GEL exchange rate
  const standardRates = [1.8, 1.9, 2.0];
  
  // Create debounced versions of state setters to prevent UI blocking
  const setCustomRateDebounced = debounce(setCustomRate, 50);
  const setCurrencyRateDebounced = debounce(setCurrencyRate, 50);
  
  const handleRateChange = (rate) => {
    setCurrencyRateDebounced(rate);
    setShowCustom(false);
  };

  const handleCustomRateChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomRateDebounced(value);
      if (value !== '') {
        setCurrencyRateDebounced(parseFloat(value));
      }
    }
  };

  const handleShowCustom = () => {
    setShowCustom(true);
    setCustomRate('');
  };

  const calculatePrice = () => {
    const basePrice = item.pricelatest || item.pricereal || 0;
    return (basePrice * currencyRate).toFixed(2);
  };

  const translateWear = (shortWear) => {
    const wearTranslations = {
      'fn': 'Factory New',
      'mw': 'Minimal Wear',
      'ft': 'Field-Tested',
      'ww': 'Well-Worn',
      'bs': 'Battle-Scarred'
    };
    return wearTranslations[shortWear?.toLowerCase()] || shortWear;
  };

  const getRarityColor = (rarity) => {
    const rarityColors = {
      'Consumer Grade': '#b0c3d9',
      'Industrial Grade': '#5e98d9',
      'Mil-Spec Grade': '#4b69ff',
      'Restricted': '#8847ff',
      'Classified': '#d32ce6',
      'Covert': '#eb4b4b',
      '★': '#e4ae39'
    };
    return rarityColors[rarity] || '#b0c3d9';
  };

  const getWearColor = (wear) => {
    const wearColors = {
      'Factory New': '#4cd94c',
      'Minimal Wear': '#87d937',
      'Field-Tested': '#d9d937',
      'Well-Worn': '#d98037',
      'Battle-Scarred': '#d94040'
    };
    return wearColors[wear] || '#b0c3d9';
  };

  // Force the modal to close as quickly as possible
  // This is a SUPER AGGRESSIVE implementation that won't freeze
  const forceCloseModal = () => {
    try {
      // First, inform the parent component immediately
      onClose();
      
      // Clear all state immediately
      setIsSubmitting(false);
      setShowCustom(false);
      setCustomRate('');
      
      // FORCEFULLY remove modal-related classes and styles from DOM
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      
      // Force remove backdrop - try multiple selectors for reliability
      ['modal-backdrop', 'backdrop', 'overlay', 'modal-open'].forEach(className => {
        document.querySelectorAll(`.${className}`).forEach(el => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      });
      
      // Reset main content styling
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.style.position = '';
        mainContent.style.top = '';
        mainContent.style.width = '';
      }
      
      console.log('Modal forcefully closed');
    } catch (e) {
      console.error('Error during force close:', e);
      // Even if something above fails, still try to call parent onClose
      try { onClose(); } catch (e) {}
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (isSubmitting) return;
    
    console.log("Starting item listing process");
    console.log("ITEM DEBUG:", {
      name: item.name,
      marketHashName: item.marketHashName,
      markethashname: item.markethashname,
      marketName: item.marketName,
      marketname: item.marketname,
      market_hash_name: item.market_hash_name,
      market_name: item.market_name,
      fullItem: item
    });
    
    // Show loading toast immediately before any operations
    const loadingToastId = toast.loading("Listing your item...");
    
    try {
      // Start by setting submitting flag to prevent double-submissions
      setIsSubmitting(true);
      
      // Get base price from the item
      const basePrice = item.pricelatest || item.pricereal || 0;
      if (!basePrice) {
        console.error("Item has no price information");
        toast.dismiss(loadingToastId); // Dismiss loading toast
        toast.error("Could not determine item price");
        setIsSubmitting(false);
        return;
      }
      
      // Calculate selling price
      const sellingPriceUSD = basePrice * currencyRate;
      const sellingPriceGEL = (basePrice * currencyRate * 2.79).toFixed(2); // Current GEL rate
      
      // EXTRACT THE CORRECT ITEM NAME - Try all possible variations
      let itemName = item.name || 
                    item.marketHashName || 
                    item.markethashname || 
                    item.market_hash_name || 
                    item.marketName || 
                    item.marketname || 
                    item.market_name;
                    
      // If we're displaying an item name already in the modal, use that
      const displayedItemName = document.querySelector("h3")?.innerText;
      if (displayedItemName && displayedItemName.length > 3) {
        itemName = displayedItemName;
      }
      
      console.log("Using item name:", itemName);
      
      // Create listing payload
      const listingData = {
        steamItemId: item.classid || item.id || '',
        assetId: item.assetid || item.asset_id || '',
        marketHashName: itemName || 'CS2 Item',
        price: sellingPriceUSD,
        imageUrl: item.image || item.icon_url || '',
        wear: item.wear || translateWear(item.wear_name) || 'Unknown',
        rarity: item.rarity || 'Normal',
        currencyRate: currencyRate,
        priceGEL: sellingPriceGEL
      };
      
      // Log listing data for debugging
      console.log("Sending listing request with data:", listingData);
      
      // Now send the request
      const response = await axios.post(
        `${API_URL}/marketplace/list`,
        listingData,
        {
          withCredentials: true,
          timeout: 12000 // 12 second timeout for Render hosting
        }
      );
      
      console.log("Listing response received:", response.status, response.data);
      
      // Dismiss the loading toast
      toast.dismiss(loadingToastId);
      
      // Only show success and close modal if the request was successful
      toast.success("Item listed successfully!");
      
      // Close the modal after successful listing
      setTimeout(() => {
        onClose();
        
        // Call completion callback to refresh listings
        if (onListingComplete) {
          onListingComplete({success: true});
        }
      }, 300);
      
    } catch (error) {
      console.error("Error listing item:", error);
      
      // Always dismiss the loading toast first
      toast.dismiss(loadingToastId);
      
      // Handle error responses from the server
      if (error.response) {
        const errorMessage = error.response.data?.error || "Failed to list item";
        console.log("Server returned error:", errorMessage);
        
        // Check if it's an 'already listed' error
        if (errorMessage.includes("already listed")) {
          toast.error("This item is already listed on the marketplace");
        } else {
          toast.error(errorMessage);
        }
      } else if (error.request) {
        // Request was made but no response received (network error)
        toast.error("Network error. Please try again.");
      } else {
        // Something else went wrong
        toast.error("Failed to list item. Please try again.");
      }
      
      // Don't close the modal on error
    } finally {
      // Always reset submission state
      setIsSubmitting(false);
    }
  };
  
  // Replace the handleClose with the forceCloseModal function
  const handleClose = forceCloseModal;

  // Add emergency effect that forces modal to close after a timeout
  useEffect(() => {
    // Set a forced close timeout
    const forceCloseTimeout = setTimeout(() => {
      console.warn('Force closing modal after timeout');
      forceCloseModal();
    }, 15000);
    
    // And another quick close if submitting
    const submittingTimeout = isSubmitting ? 
      setTimeout(() => forceCloseModal(), 1000) : null;
      
    // Clean up timeouts
    return () => {
      clearTimeout(forceCloseTimeout);
      if (submittingTimeout) clearTimeout(submittingTimeout);
    };
  }, [isSubmitting]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, []);

  // Handle clicking outside the modal to close it
  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(5px)'
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: 'rgba(21, 28, 43, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid rgba(51, 115, 242, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        color: 'var(--gaming-text-medium)',
        position: 'relative'
      }}
      onClick={e => e.stopPropagation()} // Prevent clicks from propagating to backdrop
      >
        <button
          onClick={handleClose} // Using the improved closing function
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: 'var(--gaming-text-dim)',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.target.style.color = 'var(--gaming-text-bright)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.target.style.color = 'var(--gaming-text-dim)';
          }}
        >
          ×
        </button>
        
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
          background: 'linear-gradient(to right, #3373F2, #00D2FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700'
        }}>
          Sell Your Item
        </h2>
        
        <div style={{
          display: 'flex',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(31, 41, 61, 0.7)',
          borderRadius: '12px',
          padding: '1.25rem',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid rgba(51, 115, 242, 0.1)'
        }}>
          <div style={{
            flexShrink: 0,
            position: 'relative',
            width: '100px',
            height: '100px',
            overflow: 'hidden',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            background: 'rgba(31, 41, 61, 0.5)'
          }}>
            <img
              src={item.image}
              alt={item.marketname || item.markethashname}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                padding: '0.5rem',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '0.75rem',
              color: 'var(--gaming-text-bright)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {item.marketname || item.markethashname}
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}>
              {/* Wear condition */}
              {(item.wear || (item.marketname || item.markethashname)?.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i)) && (
                <div style={{ 
                  color: 'var(--gaming-text-medium)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <span style={{ color: 'var(--gaming-text-dim)', fontSize: '0.75rem' }}>Condition</span>
                  <span style={{ 
                    color: getWearColor(translateWear(item.wear)),
                    fontWeight: '500'
                  }}>
                    {translateWear(item.wear)}
                  </span>
                </div>
              )}
              
              {/* Price */}
              <div style={{ 
                color: 'var(--gaming-text-medium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                justifySelf: 'end',
                textAlign: 'right'
              }}>
                <span style={{ color: 'var(--gaming-text-dim)', fontSize: '0.75rem' }}>Market Price</span>
                <span style={{ 
                  color: '#4ade80',
                  fontWeight: 'bold'
                }}>
                  ${(item.pricelatest || item.pricereal || '0.00').toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1rem',
            marginBottom: '1rem',
            color: 'var(--gaming-text-bright)',
            textAlign: 'center'
          }}>
            Select Currency Rate (USD to GEL)
          </h3>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            {standardRates.map(rate => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                style={{
                  padding: '0.75rem 1rem',
                  background: currencyRate === rate && !showCustom ? 
                    'linear-gradient(to right, #3373F2, #00D2FF)' : 
                    'rgba(31, 41, 61, 0.7)',
                  color: 'white',
                  border: '1px solid rgba(51, 115, 242, 0.15)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  textAlign: 'center',
                  boxShadow: currencyRate === rate && !showCustom ? 
                    '0 4px 12px rgba(0, 210, 255, 0.2)' : 'none'
                }}
              >
                {rate.toFixed(1)}
              </button>
            ))}
            
            <button
              onClick={handleShowCustom}
              style={{
                padding: '0.75rem 1rem',
                background: showCustom ? 
                  'linear-gradient(to right, #3373F2, #00D2FF)' : 
                  'rgba(31, 41, 61, 0.7)',
                color: 'white',
                border: '1px solid rgba(51, 115, 242, 0.15)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                flex: 1,
                textAlign: 'center',
                boxShadow: showCustom ? 
                  '0 4px 12px rgba(0, 210, 255, 0.2)' : 'none'
              }}
            >
              Custom
            </button>
          </div>
          
          {showCustom && (
            <div style={{
              marginBottom: '1rem'
            }}>
              <input
                type="text"
                value={customRate}
                onChange={handleCustomRateChange}
                placeholder="Enter custom rate (e.g. 2.1)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(31, 41, 61, 0.7)',
                  color: 'var(--gaming-text-bright)',
                  border: '1px solid rgba(51, 115, 242, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                autoFocus
              />
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(31, 41, 61, 0.7)',
            padding: '1.25rem',
            borderRadius: '12px',
            marginTop: '1.25rem',
            border: '1px solid rgba(51, 115, 242, 0.15)'
          }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--gaming-text-dim)' }}>Original Price (USD):</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4ade80' }}>
                ${(item.pricelatest || item.pricereal || '0.00').toFixed(2)}
              </p>
            </div>
            
            <div style={{
              width: '1px',
              height: '40px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}></div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--gaming-text-dim)' }}>Selling Price (GEL):</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4ade80' }}>
                ₾{calculatePrice()} <span style={{ fontSize: '0.8rem', color: 'var(--gaming-text-dim)' }}>({currencyRate.toFixed(1)}x)</span>
              </p>
            </div>
          </div>
          
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--gaming-text-dim)',
            marginTop: '0.75rem',
            textAlign: 'center'
          }}>
            Current market rate: 1 USD = {usdToGel} GEL
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '1rem'
        }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '0.85rem',
              backgroundColor: 'rgba(31, 41, 61, 0.7)',
              color: 'var(--gaming-text-bright)',
              border: '1px solid rgba(51, 115, 242, 0.15)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: isSubmitting ? 
                'linear-gradient(to right, #3373F2, #00D2FF)' : 
                'linear-gradient(to right, #3373F2, #00D2FF)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: isSubmitting ? 'default' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 210, 255, 0.2)',
              opacity: isSubmitting ? 0.8 : 1
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Listing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellModal;