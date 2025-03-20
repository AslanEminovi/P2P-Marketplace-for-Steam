import React, { useState, useEffect } from 'react';
import performanceMonitor from '../utils/performanceMonitor';

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

const SellModal = ({ item, onClose, onConfirm }) => {
  const [currencyRate, setCurrencyRate] = useState(1.8);
  const [showCustom, setShowCustom] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize performance monitoring when modal opens
  useEffect(() => {
    // Reset any previous emergency timeout
    performanceMonitor.resetEmergencyTimeout(20000);
    
    // Register an emergency callback specific to this modal
    const cleanupCallback = performanceMonitor.registerEmergencyCallback((reason) => {
      if (reason === 'freeze' || reason === 'emergency_timeout') {
        console.warn('Emergency callback triggered in SellModal:', reason);
        // Force close the modal if it's still open when this runs
        handleClose();
      }
    });
    
    return () => {
      // Clean up not needed since registerEmergencyCallback doesn't return a cleanup function
      // But we should reset states just in case
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

  // Completely rewritten handleSubmit function to prevent browser freezing
  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double submissions
    
    // Immediately update UI state to prevent interaction
    setIsSubmitting(true);
    
    // Use triple requestAnimationFrame to absolutely ensure UI updates
    // This technique forces multiple render cycles to complete before continuing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // Create a minimal data object with only the absolutely necessary values
            // Never clone the full item object as it may contain circular references
            const essentialData = {
              classid: item.classid,
              assetid: item.assetid || item.asset_id || item.id,
              markethashname: item.markethashname,
              image: item.image,
              pricelatest: item.pricelatest,
              pricereal: item.pricereal,
              wear: item.wear,
              rarity: item.rarity,
              currencyRate: currencyRate,
              priceGEL: calculatePrice()
            };
            
            // Immediately close the modal before calling onConfirm
            // This is critical to prevent freezing
            handleClose();
            
            // Use setTimeout with zero delay to push the confirmation 
            // to the next event loop tick after modal closing
            setTimeout(() => {
              try {
                // Call the parent's onConfirm function
                onConfirm(essentialData);
              } catch (confirmError) {
                console.error('Error in onConfirm callback:', confirmError);
                // We can't update state here as component may be unmounted
              }
            }, 0);
          } catch (error) {
            console.error('Error in submit preparation:', error);
            setIsSubmitting(false);
            alert('There was an error processing your request. Please try again.');
          }
        });
      });
    });
  };

  // Improved closing function with more thorough cleanup
  const handleClose = () => {
    // Reset state first
    setIsSubmitting(false);
    setShowCustom(false);
    setCustomRate('');
    
    // Remove any modal-related styles immediately
    document.body.style.overflow = '';
    document.body.style.backgroundColor = '';
    document.body.classList.remove('modal-open');
    
    // Remove any backdrop or overlay elements that might be stuck
    const overlayElements = document.querySelectorAll('.modal-backdrop, .overlay, .backdrop, [style*="backdrop"]');
    overlayElements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Reset any fixed positioning
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.style.position = '';
      mainContent.style.top = '';
      mainContent.style.width = '';
    }
    
    // Cleanup any fixed/locked body positioning
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    
    // Inform the parent that the modal should close
    onClose();
  };

  // Add cleanup effect when the component unmounts
  useEffect(() => {
    // Set up any necessary modal state
    document.body.classList.add('modal-open');
    
    // Emergency timeout to auto-close modal if it stays open too long
    const emergencyTimeout = setTimeout(() => {
      console.warn('Emergency timeout triggered - auto-closing modal');
      handleClose();
    }, 30000); // 30 seconds max open time
    
    // Clean up when the component unmounts
    return () => {
      clearTimeout(emergencyTimeout);
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      
      // Reset any fixed positioning that was applied
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.style.position = '';
        mainContent.style.top = '';
        mainContent.style.width = '';
      }
    };
  }, []);

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
        backgroundColor: 'rgba(45, 27, 105, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        color: '#e2e8f0',
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
            backgroundColor: 'transparent',
            border: 'none',
            color: '#e2e8f0',
            fontSize: '1.5rem',
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
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
        
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Sell Item
        </h2>
        
        <div style={{
          display: 'flex',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            flexShrink: 0
          }}>
            <img
              src={item.image}
              alt={item.marketname || item.markethashname}
              style={{
                width: '100px',
                height: 'auto',
                borderRadius: '8px',
                border: `2px solid ${getRarityColor(item.rarity)}`,
                boxShadow: `0 0 20px ${getRarityColor(item.rarity)}33`
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#ffffff'
            }}>
              {item.marketname || item.markethashname}
            </h3>
            
            <div style={{
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <p style={{
                color: getRarityColor(item.rarity),
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                textShadow: `0 0 10px ${getRarityColor(item.rarity)}66`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getRarityColor(item.rarity),
                  boxShadow: `0 0 10px ${getRarityColor(item.rarity)}66`,
                  display: 'inline-block'
                }}></span>
                {item.rarity}
              </p>
              
              {(item.wear || (item.marketname || item.markethashname)?.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i)) && (
                <p style={{
                  color: getWearColor(translateWear(item.wear)),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  textShadow: `0 0 10px ${getWearColor(translateWear(item.wear))}66`
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getWearColor(translateWear(item.wear)),
                    boxShadow: `0 0 10px ${getWearColor(translateWear(item.wear))}66`,
                    display: 'inline-block'
                  }}></span>
                  {translateWear(item.wear)}
                </p>
              )}
              
              <p style={{
                color: '#4ade80',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(74, 222, 128, 0.3)'
              }}>
                ${(item.pricelatest || item.pricereal || '0.00').toFixed(2)} USD
              </p>
            </div>
          </div>
        </div>
        
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1rem',
            marginBottom: '0.75rem',
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
                  backgroundColor: currencyRate === rate && !showCustom ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                {rate.toFixed(1)}
              </button>
            ))}
            
            <button
              onClick={handleShowCustom}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: showCustom ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                flex: 1,
                textAlign: 'center'
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
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
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
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            padding: '1rem',
            borderRadius: '12px',
            marginTop: '1rem'
          }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Original Price (USD):</p>
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
              <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Selling Price (GEL):</p>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#4ade80' }}>
                ₾{calculatePrice()} <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>({currencyRate.toFixed(1)}x)</span>
              </p>
            </div>
          </div>
          
          <div style={{
            fontSize: '0.8rem',
            color: '#9ca3af',
            marginTop: '0.5rem',
            textAlign: 'center'
          }}>
            Market rate: 1 USD = {usdToGel} GEL
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
              padding: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: isSubmitting ? '#22c55e' : '#4ade80',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: isSubmitting ? 'default' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
              opacity: isSubmitting ? 0.8 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = '#22c55e';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = '#4ade80';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.2)';
              }
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