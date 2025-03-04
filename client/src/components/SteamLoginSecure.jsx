import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

const SteamLoginSecure = ({ onClose, onSave }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setError('Please enter your Steam login secure token');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/offers/steam/login-secure`,
        { token },
        { withCredentials: true }
      );
      
      if (window.showNotification) {
        window.showNotification(
          'Steam Login Token Saved',
          'Your Steam login secure token has been saved successfully.',
          'SUCCESS'
        );
      }
      
      if (onSave) {
        onSave(token);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving Steam login secure token:', err);
      setError(err.response?.data?.error || 'Failed to save Steam login secure token');
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
        
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            color: '#f1f1f1',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '10px'
          }}>
            Update Steam Login Secure Token
          </h2>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.875rem'
          }}>
            Your Steam login secure token is required to process trades.
          </p>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: '#ef4444',
            borderRadius: '4px',
            padding: '10px 16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="token"
              style={{
                display: 'block',
                color: '#f1f1f1',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '8px'
              }}
            >
              Steam Login Secure Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Steam login secure token"
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#f1f1f1',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
            <div style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}>
              <p style={{ marginBottom: '4px' }}>How to find your Steam login secure token:</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Go to steamcommunity.com and ensure you are logged in</li>
                <li>Press F12 to open Developer Tools</li>
                <li>Go to the Application tab</li>
                <li>Under "Storage" on the left, click on "Cookies"</li>
                <li>Click on "https://steamcommunity.com"</li>
                <li>Find the cookie named "steamLoginSecure" and copy its value</li>
              </ol>
              <p style={{ marginTop: '8px', color: '#ef4444' }}>
                Warning: Never share this token with anyone else as it provides access to your Steam account!
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f1f1f1',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#334155';
                e.currentTarget.style.borderColor = '#64748b';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#475569';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {loading ? 'Saving...' : 'Save Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SteamLoginSecure; 