import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import SellModal from '../components/SellModal';
import socketService from '../services/socketService';

function Inventory({ user }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
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
        
        if (!user) {
          setMessage('Please sign in through Steam to view your inventory.');
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
            const justListed = message && message.includes('listed for sale successfully');
            if (!justListed) {
              setMessage('Your CS2 inventory is empty or private. Please check your Steam inventory privacy settings.');
            }
          } else {
            setItems(res.data);
            // Keep success message if it exists, otherwise clear
            if (!message || !message.includes('success')) {
              setMessage('');
            }
          }
        } else {
          setMessage('Failed to load inventory. Please try again later.');
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
        
        const errorMessage = err.response?.data?.message || err.message;
        setMessage('Error fetching inventory: ' + errorMessage);
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

  const listItemForSale = async (itemData) => {
    try {
      setLoading(true);
      // Extract wear from marketHashName if not provided
      let itemWear = itemData.wear;
      if (!itemWear && itemData.markethashname) {
        const wearMatch = itemData.markethashname.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/i);
        if (wearMatch) {
          itemWear = wearMatch[0];
        }
      }

      // Calculate price in USD based on selected currency rate
      const priceUSD = itemData.pricelatest || itemData.pricereal || 1;

      console.log('Listing item for sale:', {
        steamItemId: itemData.classid,
        assetId: itemData.assetid || itemData.asset_id,
        marketHashName: itemData.markethashname
      });

      // Make the API call to list the item
      try {
        const response = await axios.post(`${API_URL}/marketplace/list`, {
          steamItemId: itemData.classid,
          assetId: itemData.assetid || itemData.asset_id,
          marketHashName: itemData.markethashname,
          price: priceUSD,
          imageUrl: itemData.image,
          wear: itemWear,
          currencyRate: itemData.currencyRate || 1.8,
          priceGEL: itemData.priceGEL || (priceUSD * 1.8).toFixed(2)
        }, { 
          withCredentials: true,
          timeout: 30000 // 30 second timeout
        });
        
        console.log('Item listed successfully:', response.data);
        
        // Close modal first to prevent UI issues
        setShowSellModal(false);
        setSelectedItem(null);
        
        // Always set loading to false before setting the message
        setLoading(false);
        
        // Display success message that won't prevent inventory viewing
        setMessage('Item listed for sale successfully!');
        
        // Refresh inventory without waiting
        fetchInventory().catch(error => {
          console.error('Error refreshing inventory after success:', error);
          // Even if refresh fails, user already sees success message and can manually refresh
        });
      } catch (apiError) {
        // Special handling for API errors
        console.error('API error when listing item:', apiError);
        
        // Check if we actually received a 201 Created status or similar success response
        // Some APIs return error objects even on success
        if (apiError.response && (apiError.response.status >= 200 && apiError.response.status < 300)) {
          console.log('Despite error, received success status code:', apiError.response.status);
          
          // Treat as success
          setShowSellModal(false);
          setSelectedItem(null);
          setLoading(false);
          setMessage('Item listed for sale successfully!');
          
          // Refresh inventory
          fetchInventory().catch(e => console.error('Inventory refresh error:', e));
          return;
        }
        
        // Get detailed error info
        const errorMsg = apiError.response?.data?.error || 
                         apiError.response?.data?.message || 
                         apiError.message || 
                         'Failed to list item for sale.';
                         
        // Check if the error message indicates the item was actually listed
        if (errorMsg.includes('already listed') || errorMsg.includes('successfully')) {
          // Item was actually listed despite the error
          setShowSellModal(false);
          setSelectedItem(null);
          setLoading(false);
          setMessage('Item listed for sale successfully!');
          
          // Refresh inventory
          fetchInventory().catch(e => console.error('Inventory refresh error:', e));
          return;
        }
        
        // Handle genuine error
        setShowSellModal(false);
        setSelectedItem(null);
        setLoading(false);
        
        // Save item data for retry functionality
        window.lastFailedListing = {
          item: itemData,
          timestamp: Date.now()
        };
        
        // Set error message with retry option
        setMessage(
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>Error: {errorMsg}</span>
            <button 
              onClick={() => {
                // Attempt to retry the listing
                if (window.lastFailedListing && window.lastFailedListing.item) {
                  console.log('Retrying failed listing...');
                  listItemForSale(window.lastFailedListing.item);
                }
              }}
              style={{
                background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Retry
            </button>
          </div>
        );
      }
    } catch (err) {
      // This handles any other errors outside the API call
      console.error('Unexpected error in listItemForSale:', err);
      
      // Close modal even on error
      setShowSellModal(false);
      setSelectedItem(null);
      
      // Always reset loading state
      setLoading(false);
      
      // Set error message
      setMessage('Unexpected error: ' + (err.message || 'Failed to list item'));
      
      // Try to refresh inventory anyway - the item might have been listed despite the error
      setTimeout(() => {
        console.log('Attempting inventory refresh after error');
        fetchInventory().catch(e => console.error('Inventory refresh error:', e));
      }, 1000);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
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
          if (!message || !message.includes('success')) {
            setMessage(`Item "${data.data.item.marketname || data.data.item.markethashname}" added to inventory`);
          }
        } else if (data.type === 'item_removed' && data.data && data.data.itemId) {
          // Remove a single item from the inventory without a full refresh
          setItems(prevItems => {
            const removedItem = prevItems.find(item => 
              item._id === data.data.itemId || item.assetId === data.data.assetId
            );
            const filteredItems = prevItems.filter(item => 
              item._id !== data.data.itemId && item.assetId !== data.data.assetId
            );
            
            // Show removal message if we don't already have a success message
            if (removedItem && (!message || !message.includes('success'))) {
              setMessage(`Item "${removedItem.marketname || removedItem.markethashname}" removed from inventory`);
            }
            
            return filteredItems;
          });
        }
        
        // Only set message from socket event if it's not overriding a success message
        if (data.message && (!message || !message.includes('success'))) {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Error handling socket update:', error);
      }
    };
    
    // Register the event handler
    socketService.on('inventory_update', handleInventoryUpdate);
    
    // Clean up the event handler when component unmounts
    return () => {
      isMounted = false;
      setLoading(false); // Ensure loading state is reset
      socketService.off('inventory_update', handleInventoryUpdate);
    };
  }, []);

  // Add safety mechanism to reset loading state if it gets stuck
  useEffect(() => {
    // If loading has been true for more than 8 seconds, force reset it
    let loadingTimeoutId = null;

    if (loading) {
      loadingTimeoutId = setTimeout(() => {
        console.log("Loading state timeout reached - force resetting loading state");
        setLoading(false);
        setMessage('Loading timed out. Your item may have been listed successfully. Please refresh the page.');
      }, 8000);
    }

    return () => {
      if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
      }
    };
  }, [loading]);

  if (loading) {
    return (
      <div style={{ 
        color: '#e2e8f0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        fontSize: '1.25rem',
        background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)'
      }}>
        <div style={{
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          Loading inventory...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        textAlign: 'center',
        marginTop: '2rem',
        color: '#e2e8f0',
        padding: '2rem',
        background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)'
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

  if (message && !message.includes('success')) {
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
              stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            Unable to Load Inventory
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
                background: 'transparent',
                color: '#93c5fd',
                border: '1px solid #3b82f6',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {showSellModal && selectedItem && (
        <SellModal 
          item={selectedItem} 
          onClose={handleCloseSellModal} 
          onConfirm={listItemForSale} 
        />
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={fetchInventory}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4ade80',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#22c55e';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4ade80';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.2)';
          }}
        >
          <span style={{ position: 'relative', zIndex: 1 }}>Refresh Inventory</span>
          <svg 
            style={{ width: '20px', height: '20px', position: 'relative', zIndex: 1 }} 
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
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
            pointerEvents: 'none'
          }} />
        </button>
      </div>
      
      {/* Display message as notification without preventing inventory display */}
      {message && (
        <div style={{ 
          textAlign: 'center',
          color: message.includes('success') ? '#4ade80' : '#ef4444',
          margin: '1rem 0',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${message.includes('success') ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          maxWidth: '600px',
          margin: '1rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          {message.includes('success') ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {message}
          
          {/* Add dismiss button for messages */}
          <button 
            onClick={() => setMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: message.includes('success') ? '#4ade80' : '#ef4444',
              cursor: 'pointer',
              marginLeft: '10px',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1.5rem',
        padding: '1rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ 
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '1rem',
            backgroundColor: 'rgba(45, 27, 105, 0.7)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at top right, ${getRarityColor(item.rarity)}22, transparent 70%)`,
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'relative' }}>
              {item.image && (
                <img 
                  src={item.image}
                  alt={item.marketname || item.markethashname}
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    borderRadius: '12px',
                    border: `2px solid ${getRarityColor(item.rarity)}`,
                    boxShadow: `0 0 20px ${getRarityColor(item.rarity)}33`
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              <p style={{ 
                fontSize: '0.9rem', 
                fontWeight: 'bold', 
                color: '#e2e8f0',
                marginBottom: '0.5rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {item.marketname || item.markethashname}
              </p>
              <div style={{ 
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                background: 'rgba(0,0,0,0.2)',
                padding: '0.5rem',
                borderRadius: '8px'
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
                  ${(item.pricelatest || item.pricereal || '0.00').toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSellClick(item)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#4ade80',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#22c55e';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#4ade80';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.2)';
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>Sell Now</span>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
                pointerEvents: 'none'
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;
