import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import SellModal from '../components/SellModal';
import socketService from '../services/socketService';
import lightPerformanceMonitor from '../utils/lightPerformanceMonitor';

function Inventory({ user }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', or ''
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);

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
      'Consumer Grade': '#b0c3d9',      // white/gray
      'Industrial Grade': '#5e98d9',    // light blue
      'Mil-Spec Grade': '#4b69ff',      // dark blue
      'Restricted': '#8847ff',          // dark purple
      'Classified': '#d32ce6',          // light purple
      'Covert': '#eb4b4b',             // red
      '★': '#e4ae39'                    // gold (for knives/gloves)
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

  const fetchInventory = async () => {
    let retryCount = 0;
    const maxRetries = 2;

    const attemptFetch = async () => {
      try {
        setLoading(true);
        setMessage('');
        setMessageType('');

        if (!user) {
          setMessage('Please sign in through Steam to view your inventory.');
          setMessageType('error');
          setLoading(false);
          return;
        }

        console.log('Fetching inventory...');
        // Get the auth token from localStorage with the correct key
        const token = localStorage.getItem('auth_token');

        console.log('Using auth token:', token ? token.substring(0, 10) + '...' : 'No token found');
        console.log('Current API URL:', API_URL);
        console.log('User object:', JSON.stringify(user, null, 2));

        // Form the complete URL for debugging
        const requestUrl = `${API_URL}/inventory/my`;
        console.log('Request URL:', requestUrl);

        // Try a simpler approach - ONLY include the token in the URL query parameter
        // This is how many Steam integrations expect authentication
        const requestConfig = {
          withCredentials: true,
          timeout: 30000, // 30 second timeout
          params: {
            auth_token: token, // Steam authentication typically uses query parameters
            // Add cache-busting parameter to avoid stale cache issues
            _t: new Date().getTime()
          }
          // Removing the Authorization header to see if that's causing conflict
        };
        console.log('Request config:', JSON.stringify(requestConfig, null, 2));

        const res = await axios.get(requestUrl, requestConfig);

        console.log('Inventory response:', res.data);

        if (res.data && Array.isArray(res.data)) {
          if (res.data.length === 0) {
            // Only show empty inventory message if this isn't right after listing an item
            const justListed = messageType === 'success';
            if (!justListed) {
              setMessage('Your CS2 inventory is empty or private. Please check your Steam inventory privacy settings.');
              setMessageType('error');
            }
          } else {
            setItems(res.data);
            // Keep success message if it exists, otherwise clear
            if (messageType !== 'success') {
              setMessage('');
              setMessageType('');
            }
          }
        } else {
          setMessage('Failed to load inventory. Please try again later.');
          setMessageType('error');
        }
      } catch (err) {
        console.error('Inventory fetch error:', err);

        // Check if we should retry
        if (retryCount < maxRetries && (
          !err.response || // Network error
          err.response.status >= 500 || // Server error
          err.response.status === 429 || // Rate limit
          err.code === 'ECONNABORTED' // Timeout
        )) {
          console.log(`Retrying inventory fetch (${retryCount + 1}/${maxRetries})...`);
          retryCount++;

          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch();
        }

        // Specific handling for 403 Forbidden error (private inventory)
        // Check all possible ways a 403 error could be represented
        if (
          (err.response && err.response.status === 403) ||
          (err.message && err.message.includes('403')) ||
          (err.toString().includes('403')) ||
          (err.name === 'ot' && err.message === 'ot') // Special case seen in logs
        ) {
          console.log('403 Forbidden error detected - private inventory');
          setMessage('Your CS2 inventory is private. Please set your Steam inventory visibility to "Public" in your Steam profile privacy settings to allow the marketplace to access your items.');
          setMessageType('error');
          setLoading(false);
          return;
        }

        // Check for timeout message
        if (
          (err.message && err.message.includes('timeout')) ||
          (err.message && err.message.includes('too long')) ||
          (err.code === 'ECONNABORTED') ||
          (err.name === 'ot') // This seems to be the code for operation timeout in the logs
        ) {
          console.log('Request timeout detected');
          setMessage('Request to Steam servers timed out. This often happens if your inventory is private. Please check your Steam profile privacy settings and ensure your inventory is set to "Public".');
          setMessageType('error');
          setLoading(false);
          return;
        }

        const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
        setMessage('Error fetching inventory: ' + errorMessage);
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    return attemptFetch();
  };

  const handleSellClick = (item) => {
    setSelectedItem(item);
    setShowSellModal(true);
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    setSelectedItem(null);
  };

  const listItemForSale = (itemData) => {
    // CRITICAL: We can't use async/await directly here as it might block
    // Simply queue the operations and return immediately

    // First, show minimal loading indication
    setLoading(true);

    // Set a safety timeout to reset loading state
    const loadingTimeout = setTimeout(() => {
      console.log("Safety timeout triggered - resetting loading state");
      setLoading(false);
    }, 5000);

    // Use setTimeout with zero delay to move this task to a separate event loop tick
    setTimeout(() => {
      // Always try to clean up
      try {
        // Create extremely minimal data with no object references
        const minimalData = {
          steamItemId: String(itemData.classid || ""),
          assetId: String(itemData.assetid || itemData.asset_id || ""),
          marketHashName: String(itemData.markethashname || ""),
          price: Number(itemData.pricelatest || itemData.pricereal || 1),
          imageUrl: String(itemData.image || ""),
          wear: String(itemData.wear || ""),
          currencyRate: Number(itemData.currencyRate || 1.8),
          priceGEL: String(itemData.priceGEL || "")
        };

        console.log('Preparing to list item with minimal data');

        // CRITICAL: Make API call in a wrapped timeout to prevent blocking
        setTimeout(() => {
          // Use a basic fetch instead of axios (sometimes more reliable for preventing freezes)
          const apiUrl = `${API_URL}/marketplace/list`;

          // Create the request with proper timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

          fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(minimalData),
            signal: controller.signal
          })
            .then(response => {
              clearTimeout(timeoutId);
              return response.json().catch(() => ({})); // Handle JSON parse errors gracefully
            })
            .then(data => {
              // Success handling
              setLoading(false);
              clearTimeout(loadingTimeout);

              setMessage('Item listed for sale successfully!');
              setMessageType('success');

              // Don't do any further processing in this promise chain
              // Instead queue a separate operation to refresh inventory
              queueInventoryRefresh();
            })
            .catch(error => {
              console.error('Error in listing item:', error);
              setLoading(false);
              clearTimeout(loadingTimeout);

              // Simple error message, don't do complex processing
              setMessage('Error listing item. Please try again.');
              setMessageType('error');
            });
        }, 10); // minimal delay to ensure UI responsiveness
      } catch (e) {
        // Last resort error handling
        console.error('Critical error in listing flow:', e);
        setLoading(false);
        clearTimeout(loadingTimeout);
        setMessage('An unexpected error occurred.');
        setMessageType('error');
      }
    }, 0);
  };

  // Queue inventory refresh instead of doing it directly
  const queueInventoryRefresh = (() => {
    let refreshQueued = false;

    return () => {
      // Don't queue multiple refreshes
      if (refreshQueued) return;
      refreshQueued = true;

      // Wait 1.5 seconds before refreshing
      setTimeout(() => {
        try {
          console.log('Queued inventory refresh starting');
          fetchInventory()
            .catch(e => console.error('Error in queued inventory refresh:', e))
            .finally(() => {
              refreshQueued = false;
            });
        } catch (e) {
          console.error('Error starting inventory refresh:', e);
          refreshQueued = false;
        }
      }, 1500);
    };
  })();

  useEffect(() => {
    let isMounted = true;

    // CRITICAL: Reset any stuck state from previous renders
    document.body.style.overflow = '';
    document.body.style.backgroundColor = '';
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    // Remove any modal elements that might be stuck
    ['modal-backdrop', 'backdrop', 'overlay', 'modal-open'].forEach(className => {
      document.querySelectorAll(`.${className}`).forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    });

    // Reset any fixed positioning
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.style.position = '';
      mainContent.style.top = '';
      mainContent.style.width = '';
    }

    const loadInventory = async () => {
      try {
        await fetchInventory();
      } catch (error) {
        console.error("Error loading inventory:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInventory();

    // Setup WebSocket event listener for inventory updates
    const handleInventoryUpdate = (data) => {
      if (!isMounted) return;

      console.log('Inventory update received in component:', data);

      // Ensure we're not in a loading state when processing socket updates
      setLoading(false);

      try {
        // Check the type of update and handle accordingly
        if (data.type === 'refresh' || data.type === 'item_added' || data.type === 'item_removed') {
          // For full refresh events, use fetchInventory which handles its own loading state
          fetchInventory().catch(err => {
            console.error('Error refreshing inventory after socket update:', err);
          });
        } else if (data.type === 'item_added' && data.data && data.data.item) {
          // Add a single item to the inventory without a full refresh
          setItems(prevItems => [...prevItems, data.data.item]);

          // If we don't already have a success message, show this one
          if (messageType !== 'success') {
            setMessage(`Item "${data.data.item.marketname || data.data.item.markethashname}" added to inventory`);
            setMessageType('success');
          }
        } else if (data.type === 'item_removed' && data.data) {
          // Remove a single item from the inventory without a full refresh
          setItems(prevItems => {
            const removedItem = prevItems.find(item =>
              item._id === data.data.itemId || item.assetId === data.data.assetId
            );
            const filteredItems = prevItems.filter(item =>
              item._id !== data.data.itemId && item.assetId !== data.data.assetId
            );

            // Show removal message if we don't already have a success message
            if (removedItem && messageType !== 'success') {
              setMessage(`Item "${removedItem.marketname || removedItem.markethashname}" removed from inventory`);
              setMessageType('info');
            }

            return filteredItems;
          });
        }

        // Only set message from socket event if it's not overriding a success message
        if (data.message && messageType !== 'success') {
          setMessage(data.message);
          setMessageType(data.type === 'error' ? 'error' : 'info');
        }
      } catch (error) {
        console.error('Error handling socket update:', error);
      }
    };

    // Register the event handler
    socketService.on('inventory_update', handleInventoryUpdate);

    // Register a reset callback for emergency resets
    const handleEmergencyReset = () => {
      console.warn("Emergency reset triggered in Inventory");
      if (isMounted) {
        setLoading(false);
      }
    };
    lightPerformanceMonitor.registerResetCallback(handleEmergencyReset);

    // Start performance monitoring with a longer timeout
    const stopMonitoring = lightPerformanceMonitor.startMonitoring({ timeout: 20000 });

    // Create a heartbeat to reset the timeout regularly during inventory fetching
    const heartbeatId = setInterval(() => {
      if (loading) {
        lightPerformanceMonitor.resetTimeout(20000);
      }
    }, 5000);

    // Clean up the event handler when component unmounts
    return () => {
      isMounted = false;
      setLoading(false); // Ensure loading state is reset
      socketService.off('inventory_update', handleInventoryUpdate);
      clearInterval(heartbeatId);
      if (stopMonitoring) stopMonitoring();
    };
  }, []);

  // Reset monitor timeout when showing modal
  useEffect(() => {
    if (showSellModal) {
      lightPerformanceMonitor.resetTimeout(15000); // 15 seconds for modal
    }
  }, [showSellModal]);

  // Add another safety check for loading state
  useEffect(() => {
    let loadingTimeoutId = null;

    if (loading) {
      // If loading state persists for more than 8 seconds, force reset
      loadingTimeoutId = setTimeout(() => {
        setLoading(false);
        setMessage('Operation timed out. Please try again.');
        setMessageType('warning');
      }, 8000);
    }

    return () => {
      if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
      }
    };
  }, [loading]);

  // Add an extra reset effect that runs on every render to catch any frozen states
  useEffect(() => {
    // Create a cleanup timer that runs periodically
    const cleanupTimer = setInterval(() => {
      // If we're not in modal or loading state, perform a gentle cleanup
      if (!showSellModal && !loading) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    }, 5000);

    return () => {
      clearInterval(cleanupTimer);
    };
  });

  // Calculate the total worth of all items in inventory
  const calculateTotalWorth = () => {
    if (!items || items.length === 0) return '0.00';

    const total = items.reduce((sum, item) => {
      const price = Number(item.pricelatest || item.pricereal || 0);
      return sum + price;
    }, 0);

    return total.toFixed(2);
  };

  // Find the most valuable item price
  const findMostValuableItem = () => {
    if (!items || items.length === 0) return '0.00';

    const mostValuable = items.reduce((max, item) => {
      const price = Number(item.pricelatest || item.pricereal || 0);
      return price > max ? price : max;
    }, 0);

    return mostValuable.toFixed(2);
  };

  // Calculate the average worth of items
  const calculateAverageWorth = () => {
    if (!items || items.length === 0) return '0.00';

    const total = items.reduce((sum, item) => {
      const price = Number(item.pricelatest || item.pricereal || 0);
      return sum + price;
    }, 0);

    return (total / items.length).toFixed(2);
  };

  // Create a modern loading screen component
  const renderLoadingScreen = () => {
    return (
      <div className="loading-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
      }}>
        <div className="loading-content" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '500px',
          padding: '2.5rem',
          background: 'rgba(21, 28, 43, 0.8)',
          borderRadius: '20px',
          border: '1px solid rgba(51, 115, 242, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 15px rgba(51, 115, 242, 0.1)'
        }}>
          <div className="loading-spinner-container" style={{
            marginBottom: '1.5rem',
            position: 'relative',
            width: '80px',
            height: '80px'
          }}>
            {/* Outer spinning ring */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '3px solid rgba(51, 115, 242, 0.1)',
              borderTop: '3px solid #3373F2',
              borderRadius: '50%',
              animation: 'spin 1.5s linear infinite'
            }}></div>

            {/* Inner spinning ring */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              width: 'calc(100% - 30px)',
              height: 'calc(100% - 30px)',
              border: '3px solid rgba(0, 210, 255, 0.1)',
              borderBottom: '3px solid #00D2FF',
              borderRadius: '50%',
              animation: 'spin 1.2s linear infinite reverse'
            }}></div>

            {/* Center glowing dot */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3373F2, #00D2FF)',
              boxShadow: '0 0 15px rgba(0, 210, 255, 0.8)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}></div>
          </div>

          <h2 style={{
            fontSize: '1.8rem',
            background: 'linear-gradient(to right, #3373F2, #00D2FF)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '700',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>Loading Your Inventory</h2>

          <p style={{
            color: 'var(--gaming-text-medium)',
            textAlign: 'center',
            fontSize: '1rem',
            lineHeight: '1.5',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            We're fetching your CS2 items from Steam. This might take a moment...
          </p>

          <div style={{
            marginTop: '1.5rem',
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(31, 41, 61, 0.7)',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-30%',
              width: '60%',
              height: '100%',
              background: 'linear-gradient(90deg, rgba(51, 115, 242, 0), #3373F2, #00D2FF, rgba(0, 210, 255, 0))',
              animation: 'progressBar 2s ease-in-out infinite'
            }}></div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1.5rem',
            color: 'var(--gaming-text-dim)',
            fontSize: '0.85rem'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Make sure your Steam inventory is set to public
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.9); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          }
          
          @keyframes progressBar {
            0% { left: -30%; }
            50% { left: 70%; }
            100% { left: -30%; }
          }
        `}</style>
      </div>
    );
  };

  if (loading) {
    return renderLoadingScreen();
  }

  if (!user) {
    return (
      <div style={{
        textAlign: 'center',
        marginTop: '2rem',
        color: '#e2e8f0',
        padding: '2rem',
        background: 'var(--gaming-bg-dark)'
      }}>
        <h2 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Steam Authentication Required</h2>
        <p style={{
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          margin: '0 auto'
        }}>{message}</p>
      </div>
    );
  }

  if (messageType === 'error' && !message.includes('successfully')) {
    // Check if this is a private inventory error
    const isPrivateInventoryError = message.includes('inventory is private');

    return (
      <div style={{
        color: '#e2e8f0',
        padding: '30px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              style={{ margin: '0 auto' }}
              stroke={isPrivateInventoryError ? "#fbbf24" : "#f87171"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>

          <h2 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: '#f1f1f1'
          }}>
            {isPrivateInventoryError ? 'Private Inventory Detected' : 'Unable to Load Inventory'}
          </h2>

          <p style={{
            fontSize: '1rem',
            marginBottom: '1.5rem',
            color: '#d1d5db',
            maxWidth: '600px',
            margin: '0 auto 1.5rem'
          }}>
            {message}
          </p>

          {isPrivateInventoryError && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              maxWidth: '600px',
              margin: '0 auto 1.5rem'
            }}>
              <p style={{ color: '#fcd34d', marginBottom: '0.5rem' }}>
                <strong>How to fix:</strong>
              </p>
              <ol style={{
                textAlign: 'left',
                color: '#e2e8f0',
                paddingLeft: '1.5rem',
                margin: '0 0 0.5rem 0'
              }}>
                <li>Go to your Steam Profile</li>
                <li>Click "Edit Profile" and select "Privacy Settings"</li>
                <li>Set "Inventory" to "Public"</li>
                <li>Return to this page and click "Try Again"</li>
              </ol>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem'
          }}>

            <button
              onClick={fetchInventory}
              style={{
                background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              Try Again
            </button>

            <a
              href="https://steamcommunity.com/my/edit/settings"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: isPrivateInventoryError ? 'linear-gradient(to right, #f59e0b, #d97706)' : 'transparent',
                color: isPrivateInventoryError ? 'white' : '#93c5fd',
                border: isPrivateInventoryError ? 'none' : '1px solid #3b82f6',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: isPrivateInventoryError ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Steam Privacy Settings
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          {/* Add retry button for listing if needed */}
          {window.lastFailedListing && window.lastFailedListing.item && (
            <button
              id="retry-listing-button"
              style={{
                marginTop: '1rem',
                background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              Retry Listing
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container" style={{
      background: 'var(--gaming-bg-dark)',
      minHeight: '100vh',
      padding: '2rem',
      color: 'var(--gaming-text-medium)'
    }}>
      {showSellModal && selectedItem && (
        <SellModal
          item={selectedItem}
          onClose={handleCloseSellModal}
          onConfirm={listItemForSale}
        />
      )}

      {/* Show modern loading screen when loading is true */}
      {loading && renderLoadingScreen()}

      <div className="inventory-header" style={{
        maxWidth: '1400px',
        margin: '0 auto 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderRadius: '16px',
        background: 'rgba(21, 28, 43, 0.6)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(51, 115, 242, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <h1 style={{
            fontSize: '1.8rem',
            background: 'linear-gradient(to right, #4ade80, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>My Inventory</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <p style={{
              color: 'var(--gaming-text-dim)',
              margin: 0,
              fontSize: '0.95rem'
            }}>
              {items.length} item{items.length !== 1 ? 's' : ''} available to sell
            </p>
            {items.length > 0 && (
              <p style={{
                color: '#4ade80',
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Total Worth: ${calculateTotalWorth()}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={fetchInventory}
          className="refresh-button"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(to right, #3373F2, #00D2FF)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>Refresh Inventory</span>
          <svg
            style={{ width: '20px', height: '20px', position: 'relative', zIndex: 2 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to right, #3373F2, #00D2FF)',
              zIndex: 1
            }}
          />
        </button>
      </div>

      {/* Display message as notification without preventing inventory display */}
      {message && (
        <div className="inventory-notification" style={{
          textAlign: 'center',
          color: messageType === 'success' ? '#4ade80' : messageType === 'error' ? '#ef4444' : '#93c5fd',
          margin: '1rem auto 2rem',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(21, 28, 43, 0.7)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${messageType === 'success' ? 'rgba(74, 222, 128, 0.3)' :
              messageType === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                'rgba(147, 197, 253, 0.3)'
            }`,
          maxWidth: '800px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        }}>
          {messageType === 'success' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : messageType === 'error' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          <span style={{ fontSize: '0.95rem' }}>{message}</span>

          {/* Add dismiss button for messages */}
          <button
            onClick={() => {
              setMessage('');
              setMessageType('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: messageType === 'success' ? '#4ade80' :
                messageType === 'error' ? '#ef4444' : '#93c5fd',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Dismiss message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Inventory Summary */}
      {items.length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 2rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'rgba(21, 28, 43, 0.6)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(51, 115, 242, 0.15)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(31, 41, 61, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(51, 115, 242, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem',
              color: 'var(--gaming-text-dim)'
            }}>Total Items</h3>
            <p style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: 'var(--gaming-text-bright)'
            }}>{items.length}</p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(31, 41, 61, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(51, 115, 242, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem',
              color: 'var(--gaming-text-dim)'
            }}>Most Valuable</h3>
            <p style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#4ade80'
            }}>${findMostValuableItem()}</p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(31, 41, 61, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(51, 115, 242, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem',
              color: 'var(--gaming-text-dim)'
            }}>Average Value</h3>
            <p style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: 'var(--gaming-text-bright)'
            }}>${calculateAverageWorth()}</p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(31, 41, 61, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(51, 115, 242, 0.1)'
          }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem',
              color: 'var(--gaming-text-dim)'
            }}>Total Worth</h3>
            <p style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#4ade80'
            }}>${calculateTotalWorth()}</p>
          </div>
        </div>
      )}

      <div className="inventory-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="item-card"
            style={{
              position: 'relative',
              border: '1px solid rgba(51, 115, 242, 0.15)',
              borderRadius: '16px',
              overflow: 'hidden',
              backgroundColor: 'rgba(31, 43, 69, 0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.3), 0 0 15px rgba(51, 115, 242, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(51, 115, 242, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(51, 115, 242, 0.15)';
            }}
          >
            {/* Subtle background gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at top right, ${getRarityColor(item.rarity)}11, transparent 70%)`,
              pointerEvents: 'none',
              opacity: 0.7,
              transition: 'opacity 0.3s ease'
            }} />

            {/* Item image */}
            <div className="item-image" style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              height: '180px',
              backgroundColor: 'rgba(31, 41, 61, 0.8)'
            }}>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.marketname || item.markethashname}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    display: 'block',
                    borderBottom: `1px solid rgba(51, 115, 242, 0.15)`,
                    transition: 'transform 0.4s ease',
                    padding: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                />
              )}
            </div>

            {/* Item details */}
            <div className="item-details" style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              flex: 1
            }}>
              <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: 'var(--gaming-text-bright)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.marketname || item.markethashname}
              </h3>

              {/* Item info grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.8rem'
              }}>
                {/* Wear condition */}
                {(item.wear || (item.marketname || item.markethashname)?.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i)) && (
                  <div style={{
                    color: 'var(--gaming-text-medium)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
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
                  gap: '0.25rem',
                  justifySelf: 'end',
                  textAlign: 'right'
                }}>
                  <span style={{ color: 'var(--gaming-text-dim)', fontSize: '0.75rem' }}>Market Price</span>
                  <span style={{
                    color: '#4ade80',
                    fontWeight: 'bold',
                    fontSize: '0.95rem'
                  }}>
                    ${(item.pricelatest || item.pricereal || '0.00').toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Sell button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSellClick(item);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(to right, #4ade80, #22d3ee)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  marginTop: 'auto',
                  boxShadow: '0 4px 10px rgba(74, 222, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to right, #4ade80, #22d3ee)',
                  zIndex: 1
                }}></div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 2 }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span style={{ position: 'relative', zIndex: 2 }}>Sell Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && !loading && !messageType.includes('error') && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          textAlign: 'center',
          background: 'rgba(21, 28, 43, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          maxWidth: '800px',
          margin: '2rem auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(51, 115, 242, 0.15)'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#8596AD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="8" x2="8" y2="8"></line>
            <line x1="16" y1="12" x2="8" y2="12"></line>
            <line x1="16" y1="16" x2="8" y2="16"></line>
          </svg>
          <h3 style={{
            fontSize: '1.2rem',
            marginTop: '1.5rem',
            marginBottom: '0.5rem',
            color: 'var(--gaming-text-bright)'
          }}>Your inventory is empty</h3>
          <p style={{
            color: 'var(--gaming-text-dim)',
            maxWidth: '400px',
            marginBottom: '1.5rem'
          }}>
            Make sure your Steam inventory is set to public and reload to see your CS2 items here.
          </p>
          <button
            onClick={fetchInventory}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #3373F2, #00D2FF)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to right, #3373F2, #00D2FF)',
              zIndex: 1
            }}></div>
            <span style={{ position: 'relative', zIndex: 2 }}>Refresh Inventory</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Inventory;
