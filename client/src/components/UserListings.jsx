import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

const UserListings = ({ show, onClose, userId }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/marketplace/my-listings`, {
        withCredentials: true
      });
      setListings(response.data);
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
    }
  }, [show]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '320px',
      backgroundColor: 'rgba(45, 27, 105, 0.95)',
      backdropFilter: 'blur(10px)',
      boxShadow: '-5px 0 20px rgba(0, 0, 0, 0.5)',
      zIndex: 100,
      padding: '1.5rem 1rem',
      overflowY: 'auto',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      transform: show ? 'translateX(0)' : 'translateX(100%)',
      opacity: show ? 1 : 0,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRight: 'none',
      borderTopLeftRadius: '16px',
      borderBottomLeftRadius: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          margin: 0,
          color: '#e2e8f0',
          fontWeight: 'bold'
        }}>
          Your Listings
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#e2e8f0',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.target.style.color = '#ef4444';
            e.target.style.transform = 'rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.target.style.color = '#e2e8f0';
            e.target.style.transform = 'rotate(0deg)';
          }}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div style={{
          color: '#e2e8f0',
          textAlign: 'center',
          padding: '2rem 0'
        }}>
          Loading your listings...
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
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          color: '#e2e8f0',
          textAlign: 'center',
          padding: '2rem 0'
        }}>
          You don't have any active listings
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {listings.map(item => (
            <div key={item._id} style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <img
                  src={item.imageUrl}
                  alt={item.marketHashName}
                  style={{
                    width: '50px',
                    height: '50px',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
                <div style={{
                  flex: 1,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: '#e2e8f0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.marketHashName}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    ${item.price.toFixed(2)} USD
                    {item.priceGEL && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#9ca3af'
                      }}>
                        | ₾{parseFloat(item.priceGEL).toFixed(2)} GEL
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    Listed: {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.5rem'
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
                
                <button
                  onClick={() => cancelListing(item._id)}
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ef4444';
                  }}
                >
                  Cancel Listing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserListings;