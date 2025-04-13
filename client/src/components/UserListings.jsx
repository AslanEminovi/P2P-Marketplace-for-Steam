import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { motion, AnimatePresence } from 'framer-motion';

// Add a style element with keyframes animation for the spinner
const spinKeyframes = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Mapping for wear names
const wearFullNames = {
  'fn': 'Factory New',
  'mw': 'Minimal Wear',
  'ft': 'Field-Tested',
  'ww': 'Well-Worn',
  'bs': 'Battle-Scarred'
};

const UserListings = ({ show, onClose }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newExchangeRate, setNewExchangeRate] = useState('');
  
  // Available exchange rates
  const exchangeRates = [
    { label: '1.8 GEL/USD', value: 1.8 },
    { label: '1.9 GEL/USD', value: 1.9 },
    { label: '2.0 GEL/USD', value: 2.0 },
    { label: 'Custom', value: 'custom' }
  ];

  const fetchUserListings = async () => {
    try {
      console.log('Fetching user listings from:', `${API_URL}/marketplace/my-listings`);
      setLoading(true);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      console.log('Auth token exists:', !!token);
      
      // Using both withCredentials AND Authorization header for maximum compatibility
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
        withCredentials: true,
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      console.log('User listings response:', response.data);
      
      if (Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} listings`);
        setListings(response.data);
        setError('');
      } else {
        console.warn('API returned non-array data:', response.data);
        setListings([]);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      
      // More detailed error info
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        
        if (err.response.status === 401) {
          setError('Authentication error. Please log in again.');
        } else {
          setError(`Server error: ${err.response.status}. Try refreshing the page.`);
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('No response from server. Please check your connection.');
      } else {
        setError('Failed to load your listings. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (itemId) => {
    try {
      console.log('Cancelling listing:', itemId);
      setCancellingItemId(itemId);
      
      // Get fresh token
      const token = localStorage.getItem('auth_token');
      if (!token || token.length < 10) {
        console.warn('Auth token invalid or missing');
        window.showNotification(
          "Authentication Error",
          "Please refresh the page and try again.",
          "ERROR"
        );
        setCancellingItemId(null);
        return;
      }

      // Create cancel controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await axios({
          method: 'put',
          url: `${API_URL}/marketplace/cancel/${itemId}`,
          data: {},
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true,
          signal: controller.signal,
          timeout: 15000
        });

        clearTimeout(timeoutId);

        if (response.data.success) {
          // Update local state immediately
          setListings(prevListings => prevListings.filter(item => item._id !== itemId));
          
          // Show success notification
          window.showNotification(
            "Success",
            "Listing has been successfully cancelled",
            "SUCCESS"
          );

          // Refresh listings in background
          fetchUserListings().catch(console.error);
        } else {
          throw new Error(response.data.error || 'Failed to cancel listing');
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    } catch (err) {
      console.error('Error cancelling listing:', err);
      
      // Log detailed error information
      if (err.response) {
        console.error('Error response:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      }

      // Handle specific error cases
      let errorMessage = 'Failed to cancel listing. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please refresh the page and try again.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.error || 'Invalid request. Please try again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Listing not found. It may have been already cancelled.';
        // Remove from local state if not found
        setListings(prevListings => prevListings.filter(item => item._id !== itemId));
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }

      // Show error notification
      window.showNotification(
        "Error",
        errorMessage,
        "ERROR"
      );

      // If error is recoverable, retry fetching listings
      if (err.response?.status !== 401) {
        fetchUserListings().catch(console.error);
      }
    } finally {
      setCancellingItemId(null);
    }
  };

  const startEditingPrice = (item) => {
    setEditingItemId(item._id);
    // Set exact price from the item
    setNewPrice(item.price.toFixed(2));
    // Set the exchange rate from the item or default to 1.8
    setNewExchangeRate(item.currencyRate?.toString() || '1.8');
  };

  const cancelEditingPrice = () => {
    setEditingItemId(null);
    setNewPrice('');
    setNewExchangeRate('');
  };

  const handleExchangeRateChange = (e) => {
    const value = e.target.value;
    setNewExchangeRate(value);
  };

  const handleCustomRateChange = (e) => {
    setNewExchangeRate(e.target.value);
  };

  const saveNewPrice = async (itemId) => {
    try {
      if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
        alert('Please enter a valid price');
        return;
      }
      
      // Validate exchange rate
      let exchangeRate = parseFloat(newExchangeRate);
      if (isNaN(exchangeRate) || exchangeRate <= 0) {
        alert('Please enter a valid exchange rate');
        return;
      }

      const token = localStorage.getItem('auth_token');
      
      console.log(`Updating price for item ${itemId} to $${newPrice} with exchange rate ${exchangeRate}`);
      
      await axios.put(`${API_URL}/marketplace/update-price/${itemId}`, 
        { 
          price: parseFloat(newPrice),
          currencyRate: exchangeRate
        }, 
        {
          withCredentials: true,
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      );
      
      // Update successful, refresh listings
      fetchUserListings();
      setEditingItemId(null);
      setNewPrice('');
      setNewExchangeRate('');
      
    } catch (err) {
      console.error('Error updating price:', err);
      alert('Failed to update price. Please try again.');
    }
  };

  // Helper function to extract wear code from item name
  const getFullWearName = (name) => {
    // Common wear codes in CS items
    const wearCodes = ['fn', 'mw', 'ft', 'ww', 'bs'];
    const nameLower = name.toLowerCase();
    
    for (const code of wearCodes) {
      if (nameLower.includes(`(${code})`)) {
        // Return the full wear name from our mapping
        return wearFullNames[code] || code.toUpperCase();
      }
    }
    
    // Return null if no wear code found
    return null;
  };
  
  // Helper function to get clean item name without wear
  const getCleanItemName = (name) => {
    // Remove the wear code and parentheses if present
    return name.replace(/\s*\([^)]*\)\s*$/, '');
  };

  useEffect(() => {
    if (show) {
      fetchUserListings();
      
      // Force the body style to prevent scrolling when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      // Reset overflow when component unmounts
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '-5px 0 20px rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            padding: '1.5rem 1rem',
            overflowY: 'auto',
            border: '2px solid rgba(99, 102, 241, 0.6)',
            borderRight: 'none',
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px'
          }}
        >
          {/* Add the keyframes style element */}
          <style>{spinKeyframes}</style>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              margin: 0,
              color: 'white',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #4F46E5, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Your Listings
            </h2>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
              }}
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
          </div>

          {loading ? (
            <div style={{
              color: '#e2e8f0',
              textAlign: 'center',
              padding: '2rem 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{
                width: '40px', 
                height: '40px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                borderTopColor: '#8b5cf6',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Loading your listings...</span>
            </div>
          ) : error ? (
            <div style={{
              color: '#ef4444',
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px'
            }}>
              {error}
              <button 
                onClick={fetchUserListings}
                style={{
                  display: 'block',
                  margin: '10px auto 0',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Try Again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div style={{
              color: '#e2e8f0',
              textAlign: 'center',
              padding: '2rem 0'
            }}>
              <svg 
                width="60" 
                height="60" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  margin: '0 auto 15px',
                  opacity: 0.5
                }}
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <p>You don't have any active listings</p>
              <button 
                onClick={() => window.location.href = '/inventory'}
                style={{
                  marginTop: '15px',
                  backgroundColor: 'rgba(124, 58, 237, 0.2)',
                  color: '#a78bfa',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                List Items from Inventory
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <AnimatePresence>
                {listings.map((item, index) => {
                  const wearName = getFullWearName(item.marketHashName);
                  const cleanName = getCleanItemName(item.marketHashName);
                  
                  return (
                    <motion.div 
                      key={item._id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      style={{
                        backgroundColor: 'rgba(17, 24, 39, 0.6)',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        border: '1px solid rgba(55, 65, 81, 0.5)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          position: 'relative',
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(55, 65, 81, 0.3)'
                        }}>
                          <img
                            src={item.imageUrl}
                            alt={item.marketHashName}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        <div style={{
                          flex: 1,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            color: '#f1f1f1',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {cleanName}
                          </div>
                          
                          {wearName && (
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#9ca3af',
                              marginTop: '2px'
                            }}>
                              {wearName}
                            </div>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginTop: '4px'
                          }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#4ade80'
                            }}>
                              ${item.price?.toFixed(2)}
                            </div>
                            {item.priceGEL && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                marginLeft: '5px'
                              }}>
                                (₾{item.priceGEL?.toFixed(2)})
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap'
                      }}>
                        {editingItemId === item._id ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            width: '100%'
                          }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                              <span style={{ 
                                position: 'absolute', 
                                left: '8px', 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                color: '#9ca3af'
                              }}>$</span>
                              <input
                                type="number"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.5rem 0.5rem 1.5rem',
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  borderRadius: '4px',
                                  color: 'white',
                                  fontSize: '0.875rem'
                                }}
                                min="0.01"
                                step="0.01"
                                autoFocus
                              />
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              width: '100%',
                              alignItems: 'center'
                            }}>
                              <select
                                value={newExchangeRate}
                                onChange={handleExchangeRateChange}
                                style={{
                                  flex: 1,
                                  padding: '0.5rem',
                                  backgroundColor: 'rgba(31, 41, 61, 0.8)',
                                  color: 'white',
                                  border: '1px solid rgba(51, 115, 242, 0.3)',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundSize: '0.8rem',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                              >
                                {exchangeRates.map(rate => (
                                  <option 
                                    key={rate.value} 
                                    value={rate.value}
                                    style={{ 
                                      backgroundColor: 'rgba(31, 41, 61, 1)',
                                      color: 'white', 
                                      padding: '0.5rem'
                                    }}
                                  >
                                    {rate.label}
                                  </option>
                                ))}
                              </select>
                              
                              {newExchangeRate === 'custom' && (
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input
                                    type="number"
                                    placeholder="Custom rate"
                                    onChange={handleCustomRateChange}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      borderRadius: '4px',
                                      color: 'white',
                                      fontSize: '0.875rem'
                                    }}
                                    min="0.01"
                                    step="0.01"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.5rem', 
                              justifyContent: 'flex-end',
                              marginTop: '0.5rem'
                            }}>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => saveNewPrice(item._id)}
                                style={{
                                  backgroundColor: 'rgba(74, 222, 128, 0.2)',
                                  color: '#4ade80',
                                  border: '1px solid rgba(74, 222, 128, 0.3)',
                                  borderRadius: '4px',
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                Save
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={cancelEditingPrice}
                                style={{
                                  backgroundColor: 'rgba(156, 163, 175, 0.2)',
                                  color: '#d1d5db',
                                  border: '1px solid rgba(156, 163, 175, 0.3)',
                                  borderRadius: '4px',
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.offers && item.offers.some(offer => offer.status === 'pending') && (
                              <div style={{
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                color: '#a78bfa',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#a78bfa'
                                }}></span>
                                {item.offers.filter(offer => offer.status === 'pending').length} offers
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => startEditingPrice(item)}
                                style={{
                                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                  color: '#93c5fd',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9"></path>
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                                Edit Price
                              </motion.button>
                              
                              <motion.button
                                whileHover={cancellingItemId !== item._id ? { scale: 1.05 } : {}}
                                whileTap={cancellingItemId !== item._id ? { scale: 0.95 } : {}}
                                onClick={() => cancellingItemId === null && cancelListing(item._id)}
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  cursor: cancellingItemId === item._id ? 'wait' : 'pointer',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  opacity: cancellingItemId === item._id ? 0.7 : 1
                                }}
                                disabled={cancellingItemId === item._id}
                              >
                                {cancellingItemId === item._id ? (
                                  <div 
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      border: '2px solid transparent',
                                      borderTopColor: 'currentColor',
                                      animation: 'spin 1s linear infinite'
                                    }}
                                  />
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                )}
                                {cancellingItemId === item._id ? 'Cancelling...' : 'Cancel Listing'}
                              </motion.button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserListings;