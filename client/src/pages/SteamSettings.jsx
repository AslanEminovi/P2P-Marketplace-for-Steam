import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

function SteamSettingsPage() {
  const [tradeUrl, setTradeUrl] = useState('');
  const [tradeUrlExpiry, setTradeUrlExpiry] = useState(null);
  const [steamLoginSecure, setSteamLoginSecure] = useState('');
  const [loading, setLoading] = useState(false);
  const [tradeUrlMessage, setTradeUrlMessage] = useState({ type: '', text: '' });
  const [tokenMessage, setTokenMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Fetch current settings if available
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
        if (res.data.authenticated) {
          if (res.data.user.tradeUrlExpiry) {
            setTradeUrlExpiry(new Date(res.data.user.tradeUrlExpiry));
          }
          
          // Load the saved trade URL to display in the input field
          if (res.data.user.tradeUrl) {
            setTradeUrl(res.data.user.tradeUrl);
          }
          
          // We don't load the steamLoginSecure value for security reasons
          // Just show a placeholder if it exists
          if (res.data.user.steamLoginSecure) {
            setSteamLoginSecure('••••••••••••••••••••••');
          }
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  const handleUpdateTradeUrl = async (e) => {
    e.preventDefault();
    
    if (!tradeUrl || !tradeUrl.includes('steamcommunity.com/tradeoffer/new/')) {
      setTradeUrlMessage({ type: 'error', text: 'Please enter a valid Steam trade URL' });
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = { tradeUrl };
      const res = await axios.post(
        `${API_URL}/offers/steam/trade-url`,
        formData,
        { withCredentials: true }
      );
      
      setTradeUrlMessage({ type: 'success', text: res.data.message });
      setTradeUrlExpiry(new Date(res.data.expiryDate));
    } catch (error) {
      setTradeUrlMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update trade URL' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSteamLoginSecure = async (e) => {
    e.preventDefault();
    
    if (!steamLoginSecure || steamLoginSecure === '••••••••••••••••••••••') {
      setTokenMessage({ type: 'error', text: 'Please enter your Steam login secure token' });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/offers/steam/login-secure`,
        { token: steamLoginSecure },
        { withCredentials: true }
      );
      
      setTokenMessage({ type: 'success', text: 'Steam login secure token updated successfully' });
      setSteamLoginSecure('••••••••••••••••••••••'); // Mask the token for security
    } catch (error) {
      setTokenMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update Steam login secure token' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      <h1 style={{
        color: '#f1f1f1',
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5v2" />
          <path d="M15 11v2" />
          <path d="M15 17v2" />
          <path d="M5 5h14" />
          <path d="M5 11h14" />
          <path d="M5 17h14" />
        </svg>
        Steam Trading Settings
      </h1>
      
      <p style={{
        color: '#94a3b8',
        fontSize: '1rem',
        marginBottom: '30px',
        lineHeight: '1.6'
      }}>
        Configure your Steam trading settings to enable seamless trades on the marketplace.
        These settings are necessary for processing trades and receiving items from other users.
      </p>
      
      {/* Trade URL Section */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        border: '1px solid #374151'
      }}>
        <h2 style={{
          color: '#f1f1f1',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Trade URL
        </h2>
        
        <p style={{
          color: '#e2e8f0',
          fontSize: '0.9rem',
          marginBottom: '20px'
        }}>
          Your Steam trade URL is required to receive trade offers from other users.
          This URL is unique to your account and allows others to send you trade offers.
        </p>
        
        {tradeUrlMessage.text && (
          <div style={{
            backgroundColor: tradeUrlMessage.type === 'success' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            color: tradeUrlMessage.type === 'success' ? '#10b981' : '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            {tradeUrlMessage.text}
          </div>
        )}
        
        {tradeUrlExpiry && (
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#93c5fd',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Current trade URL expires on: {tradeUrlExpiry.toLocaleDateString()}
          </div>
        )}
        
        <form onSubmit={handleUpdateTradeUrl} style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="tradeUrl"
              style={{
                display: 'block',
                color: '#f1f1f1',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '8px'
              }}
            >
              Steam Trade URL
            </label>
            <input
              type="text"
              id="tradeUrl"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/..."
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f1f1f1',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
            <div style={{
              marginTop: '8px',
              fontSize: '0.8rem',
              color: '#94a3b8'
            }}>
              <a 
                href="https://steamcommunity.com/my/tradeoffers/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#60a5fa',
                  textDecoration: 'none'
                }}
              >
                Find your Trade URL here
              </a>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {loading ? 'Updating...' : 'Update Trade URL'}
          </button>
        </form>
      </div>
      
      {/* Steam Login Secure Token Section */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        border: '1px solid #374151'
      }}>
        <h2 style={{
          color: '#f1f1f1',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Steam Login Secure Token
        </h2>
        
        <p style={{
          color: '#e2e8f0',
          fontSize: '0.9rem',
          marginBottom: '20px'
        }}>
          Your Steam login secure token is required to process trades.
          This token allows the system to initiate trade offers on your behalf.
        </p>
        
        {tokenMessage.text && (
          <div style={{
            backgroundColor: tokenMessage.type === 'success' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            color: tokenMessage.type === 'success' ? '#10b981' : '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            {tokenMessage.text}
          </div>
        )}
        
        <form onSubmit={handleUpdateSteamLoginSecure} style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="steamLoginSecure"
              style={{
                display: 'block',
                color: '#f1f1f1',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '8px'
              }}
            >
              Steam Login Secure Token
            </label>
            <input
              type="text"
              id="steamLoginSecure"
              value={steamLoginSecure}
              onChange={(e) => setSteamLoginSecure(e.target.value)}
              placeholder="Enter your Steam login secure token"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f1f1f1',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                if (e.target.value === '••••••••••••••••••••••') {
                  setSteamLoginSecure('');
                }
              }}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
            <div style={{
              marginTop: '12px',
              fontSize: '0.8rem',
              color: '#94a3b8',
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid #374151'
            }}>
              <p style={{ marginBottom: '8px' }}>How to find your Steam login secure token:</p>
              <ol style={{ 
                paddingLeft: '20px',
                lineHeight: '1.6' 
              }}>
                <li>Go to steamcommunity.com and ensure you are logged in</li>
                <li>Press F12 to open Developer Tools</li>
                <li>Go to the Application tab</li>
                <li>Under "Storage" on the left, click on "Cookies"</li>
                <li>Click on "https://steamcommunity.com"</li>
                <li>Find the cookie named "steamLoginSecure" and copy its value</li>
              </ol>
              <p style={{ 
                marginTop: '12px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Warning: Never share this token with anyone else as it provides access to your Steam account!
              </p>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            {loading ? 'Updating...' : 'Update Login Token'}
          </button>
        </form>
      </div>
      
      {/* Security Tips Section */}
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '25px',
        border: '1px solid #374151'
      }}>
        <h2 style={{
          color: '#f1f1f1',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Security Tips
        </h2>
        
        <ul style={{
          color: '#e2e8f0',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          padding: '0 0 0 20px'
        }}>
          <li style={{ marginBottom: '8px' }}>Always verify the trade details before accepting any offer</li>
          <li style={{ marginBottom: '8px' }}>Check the user's reputation and trading history</li>
          <li style={{ marginBottom: '8px' }}>Enable Steam Guard Mobile Authenticator for additional security</li>
          <li style={{ marginBottom: '8px' }}>Never share your Steam credentials or authentication codes</li>
          <li style={{ marginBottom: '8px' }}>Be wary of phishing attempts and always check the URL</li>
          <li>Update your Steam login secure token regularly for enhanced security</li>
        </ul>
      </div>
    </div>
  );
}

export default SteamSettingsPage; 