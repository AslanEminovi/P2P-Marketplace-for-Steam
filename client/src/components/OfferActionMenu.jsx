import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/constants';

const OfferActionMenu = ({ offer, onClose, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAcceptOffer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(
        `${API_URL}/offers/${offer.itemId}/${offer.offerId}/accept`,
        {},
        { withCredentials: true }
      );
      
      if (window.showNotification) {
        window.showNotification(
          'Offer Accepted',
          'You have accepted the offer. A Steam trade offer has been sent.',
          'SUCCESS'
        );
      }
      
      if (onActionComplete) {
        onActionComplete('accepted', response.data);
      }
      
      // Navigate to the trade page if available
      if (response.data.tradeId) {
        navigate(`/trades/${response.data.tradeId}`);
      }
      
      onClose();
    } catch (err) {
      console.error('Error accepting offer:', err);
      setError(err.response?.data?.error || 'Failed to accept offer');
      
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to accept offer',
          'ERROR'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(
        `${API_URL}/offers/${offer.itemId}/${offer.offerId}/decline`,
        {},
        { withCredentials: true }
      );
      
      if (window.showNotification) {
        window.showNotification(
          'Offer Declined',
          'You have declined the offer.',
          'SUCCESS'
        );
      }
      
      if (onActionComplete) {
        onActionComplete('declined', response.data);
      }
      
      onClose();
    } catch (err) {
      console.error('Error declining offer:', err);
      setError(err.response?.data?.error || 'Failed to decline offer');
      
      if (window.showNotification) {
        window.showNotification(
          'Error',
          err.response?.data?.error || 'Failed to decline offer',
          'ERROR'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/marketplace/item/${offer.itemId}`);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: '0',
      backgroundColor: '#1e293b',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      width: '200px',
      overflow: 'hidden',
      border: '1px solid #334155'
    }}>
      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#7f1d1d',
          color: '#f87171',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      <div style={{
        padding: '10px 15px',
        borderBottom: '1px solid #334155',
        fontSize: '14px',
        fontWeight: '600',
        color: '#e2e8f0'
      }}>
        Offer Actions
      </div>
      
      <button
        onClick={handleViewDetails}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px 15px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '1px solid #334155',
          color: '#e2e8f0',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        View Details
      </button>
      
      <button
        onClick={handleAcceptOffer}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px 15px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '1px solid #334155',
          color: '#4ade80',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: '14px',
          transition: 'background-color 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#334155')}
        onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {loading ? 'Processing...' : 'Accept Offer'}
      </button>
      
      <button
        onClick={handleDeclineOffer}
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px 15px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#f87171',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: '14px',
          transition: 'background-color 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#334155')}
        onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {loading ? 'Processing...' : 'Decline Offer'}
      </button>
    </div>
  );
};

export default OfferActionMenu; 