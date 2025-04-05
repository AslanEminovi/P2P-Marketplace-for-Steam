import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { motion, AnimatePresence } from 'framer-motion';

const UserListings = ({ show, onClose }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/marketplace/user-listings`, {
        withCredentials: true
      });
      console.log('Fetched user listings:', response.data);
      setListings(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (itemId) => {
    try {
      await axios.put(`${API_URL}/marketplace/cancel/${itemId}`, {}, {
        withCredentials: true
      });
      // Update the listings list
      fetchUserListings();
    } catch (err) {
      console.error('Error cancelling listing:', err);
      setError('Failed to cancel listing');
    }
  };

  useEffect(() => {
    if (show) {
      fetchUserListings();
      console.log("UserListings panel should be OPEN now");
      
      // Force the body style to prevent scrolling when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      console.log("UserListings panel should be CLOSED now");
      document.body.style.overflow = '';
    }
    
    return () => {
      // Reset overflow when component unmounts
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  console.log("Rendering UserListings panel - OPEN");

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0, 
      right: 0,
      bottom: 0,
      zIndex: 9999999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'flex-end',
      backdropFilter: 'blur(5px)',
    }}>
      <div 
        style={{
          position: 'relative',
          width: '360px',
          height: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          boxShadow: '-5px 0 20px rgba(0, 0, 0, 0.5)',
          padding: '1.5rem 1rem',
          overflowY: 'auto',
          borderLeft: '2px solid rgba(99, 102, 241, 0.6)',
        }}
      >
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
          <button
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
            }}
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
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
              {listings.map((item, index) => (
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
                        {item.marketHashName}
                      </div>
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
                    justifyContent: 'space-between'
                  }}>
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
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => cancelListing(item._id)}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
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
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      Cancel Listing
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserListings;