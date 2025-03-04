import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

const TradeUrlPrompt = ({ onClose, onSave }) => {
  const [tradeUrl, setTradeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tradeUrl) {
      setError('Please enter your Steam trade URL');
      return;
    }
    
    if (!tradeUrl.includes('steamcommunity.com/tradeoffer/new/') || 
        !tradeUrl.includes('partner=') || 
        !tradeUrl.includes('token=')) {
      setError('Please enter a valid Steam trade URL');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/offers/steam/trade-url`,
        { tradeUrl },
        { withCredentials: true }
      );
      
      if (window.showNotification) {
        window.showNotification(
          'Trade URL Saved',
          'Your Steam trade URL has been saved successfully.',
          'SUCCESS'
        );
      }
      
      if (onSave) {
        onSave(tradeUrl);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving trade URL:', err);
      setError(err.response?.data?.error || 'Failed to save trade URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '30px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        border: '1px solid #334155'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ×
        </button>
        
        <h2 style={{
          color: '#f1f1f1',
          marginTop: 0,
          marginBottom: '20px',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Set Your Steam Trade URL
        </h2>
        
        <p style={{
          color: '#d1d5db',
          marginBottom: '20px',
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>
          To trade items on our marketplace, you need to provide your Steam Trade URL. 
          This allows sellers to send you items directly through Steam.
        </p>
        
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="tradeUrl" 
              style={{
                display: 'block',
                color: '#e2e8f0',
                marginBottom: '8px',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}
            >
              Steam Trade URL
            </label>
            <input
              id="tradeUrl"
              type="text"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=XXXXXXX&token=XXXXXXXX"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4ade80'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
          </div>
          
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#4ade80',
                cursor: 'pointer',
                padding: '0',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {showHelp ? 'Hide help' : 'How to find your Trade URL'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showHelp ? 
                  <path d="M18 15l-6-6-6 6"/> : 
                  <path d="M6 9l6 6 6-6"/>
                }
              </svg>
            </button>
            
            <a 
              href="https://steamcommunity.com/my/tradeoffers/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              Open Steam Trade URL page
            </a>
          </div>
          
          {showHelp && (
            <div style={{
              backgroundColor: '#1a2234',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#d1d5db',
              lineHeight: '1.5'
            }}>
              <ol style={{ margin: '0', paddingLeft: '20px' }}>
                <li>Go to your <a href="https://steamcommunity.com/my/tradeoffers/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>Steam Inventory Privacy Settings</a></li>
                <li>Scroll down to "Trade URL"</li>
                <li>Click "Create New URL" if you don't have one</li>
                <li>Copy the entire URL and paste it here</li>
              </ol>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '30px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Skip for now
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4ade80',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'background-color 0.2s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#22c55e')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4ade80')}
            >
              {loading ? 'Saving...' : 'Save Trade URL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeUrlPrompt; 