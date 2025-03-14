import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import SellModal from '../components/SellModal';
import socketService from '../services/socketService';

function Inventory() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
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

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
      if (res.data.authenticated) {
        setUser(res.data.user);
        return true;
      }
      setMessage('Please sign in through Steam to view your inventory.');
      return false;
    } catch (err) {
      console.error('Auth check error:', err);
      setMessage('Failed to verify authentication status.');
      return false;
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setMessage('');
      const isAuthenticated = await checkAuthStatus();
      
      if (!isAuthenticated) {
        setLoading(false);
        // Keep the message set by checkAuthStatus
        return;
      }

      console.log('Fetching inventory...');
      const res = await axios.get(`${API_URL}/inventory/my`, { 
        withCredentials: true,
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Inventory response:', res.data);
      
      if (res.data && Array.isArray(res.data)) {
        if (res.data.length === 0) {
          setMessage('Your CS2 inventory is empty or private. Please check your Steam inventory privacy settings.');
        } else {
          setItems(res.data);
          setMessage('');
        }
      } else {
        setMessage('No items found in inventory.');
        setItems([]);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err.response || err);
      
      // Handle various error codes with specific messages
      const errorCode = err.response?.data?.code;
      const errorDetails = err.response?.data?.error || 'Failed to fetch inventory.';
      
      if (errorCode === 'MISSING_API_KEY') {
        setMessage('Server configuration error. Please contact administrators.');
      } else if (errorCode === 'API_AUTH_ERROR') {
        setMessage('Steam API authentication failed. Please contact administrators.');
      } else if (errorCode === 'RATE_LIMIT') {
        setMessage('Rate limit exceeded. Please wait a few minutes and try again.');
      } else if (errorCode === 'INVENTORY_NOT_FOUND') {
        setMessage('Your Steam inventory appears to be private. Please check your Steam privacy settings and ensure your inventory is set to "Public".');
      } else if (errorCode === 'TIMEOUT') {
        setMessage('Connection timed out when fetching inventory. Steam servers might be busy, please try again later.');
      } else if (errorCode === 'NETWORK_ERROR') {
        setMessage('Network error when connecting to Steam. Please check your internet connection and try again.');
      } else {
        setMessage(errorDetails);
      }
      
      setItems([]);
    } finally {
      setLoading(false);
    }
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

      await axios.post(`${API_URL}/marketplace/list`, {
        steamItemId: itemData.classid,
        assetId: itemData.assetid || itemData.asset_id,
        marketHashName: itemData.markethashname,
        price: priceUSD,
        imageUrl: itemData.image,
        wear: itemWear,
        currencyRate: itemData.currencyRate || 1.8,
        priceGEL: itemData.priceGEL || (priceUSD * 1.8).toFixed(2)
      }, { withCredentials: true });
      
      setMessage('Item listed for sale successfully!');
      setShowSellModal(false);
      setSelectedItem(null);
      fetchInventory(); // Refresh inventory after listing
    } catch (err) {
      console.error('List item error:', err);
      setMessage(err.response?.data?.error || 'Failed to list item for sale.');
    }
  };

  useEffect(() => {
    fetchInventory();
    
    // Setup WebSocket event listener for inventory updates
    const handleInventoryUpdate = (data) => {
      console.log('Inventory update received in component:', data);
      
      // Check the type of update and handle accordingly
      if (data.type === 'refresh' || data.type === 'item_added' || data.type === 'item_removed') {
        // Refresh the entire inventory
        fetchInventory();
      } else if (data.type === 'item_added' && data.data && data.data.item) {
        // Add a single item to the inventory
        setItems(prevItems => [...prevItems, data.data.item]);
      } else if (data.type === 'item_removed' && data.data && data.data.itemId) {
        // Remove a single item from the inventory
        setItems(prevItems => prevItems.filter(item => 
          item._id !== data.data.itemId && item.assetId !== data.data.assetId
        ));
      }
      
      // Display success message for inventory updates
      if (data.message) {
        setMessage(data.message);
      }
    };
    
    // Register the event handler
    const unsubscribe = socketService.on('inventory_update', handleInventoryUpdate);
    
    // Clean up the event handler when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

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

  if (message) {
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
      {message && (
        <p style={{ 
          textAlign: 'center',
          color: message.includes('success') ? '#4ade80' : '#ef4444',
          margin: '1rem 0',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(45, 27, 105, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          margin: '1rem auto'
        }}>
          {message}
        </p>
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
