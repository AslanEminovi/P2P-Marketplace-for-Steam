import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { API_URL } from '../config/constants';

const OfferActionMenu = ({ offer, onClose, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleClickOutside = (e) => {
    e.stopPropagation();
    onClose();
  };
  
  const handleAction = async (action) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint;
      let requestData = { offerId: offer.offerId };
      
      if (action === 'accept') {
        endpoint = `${API_URL}/offers/accept`;
      } else if (action === 'decline') {
        endpoint = `${API_URL}/offers/decline`;
      } else {
        throw new Error('Invalid action');
      }
      
      const response = await axios.post(endpoint, requestData, {
        withCredentials: true
      });
      
      // Call the parent callback with the action result
      if (onActionComplete) {
        onActionComplete(
          action === 'accept' ? 'accepted' : 'declined', 
          response.data
        );
      }
    } catch (err) {
      console.error(`Error ${action}ing offer:`, err);
      setError(err.response?.data?.error || `Failed to ${action} offer`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {/* Backdrop to catch outside clicks */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40
        }}
        onClick={handleClickOutside}
      />
      
      <div 
        style={{
          position: 'absolute',
          right: 0,
          top: '110%',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
          zIndex: 50,
          width: '160px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}
        
        <button
          onClick={() => handleAction('accept')}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'left',
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#4ade80',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'background-color 0.2s',
            opacity: loading ? 0.7 : 1
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {loading ? (
            <div 
              className="spinner"
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderTop: '2px solid #4ade80',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          )}
          Accept Offer
        </button>
        
        <button
          onClick={() => handleAction('decline')}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            textAlign: 'left',
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#f87171',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'background-color 0.2s',
            opacity: loading ? 0.7 : 1
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {loading ? (
            <div 
              className="spinner"
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderTop: '2px solid #f87171',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          )}
          Decline Offer
        </button>
      </div>
    </>
  );
};

OfferActionMenu.propTypes = {
  offer: PropTypes.shape({
    itemId: PropTypes.string.isRequired,
    offerId: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onActionComplete: PropTypes.func
};

export default OfferActionMenu; 