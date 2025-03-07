import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import '../utils/theme.css';

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
    <div className="page-container dark-theme">
      {/* Background elements */}
      <div className="bg-elements">
        <div className="grid-pattern"></div>
        <div className="noise-overlay"></div>
        <div className="scan-lines"></div>
      </div>
      
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5v2" />
              <path d="M15 11v2" />
              <path d="M15 17v2" />
              <path d="M5 5h14" />
              <path d="M5 11h14" />
              <path d="M5 17h14" />
            </svg>
            Steam Trading Settings
          </h1>
          <p className="settings-description">
            Configure your Steam trading settings to enable seamless trades on the marketplace.
            These settings are necessary for processing trades and receiving items from other users.
          </p>
        </div>
        
        {/* Trade URL Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <h2>Trade URL</h2>
          </div>
          
          <p className="settings-info">
            Your Steam trade URL is required to receive trade offers from other users.
            This URL is unique to your account and allows others to send you trade offers.
          </p>
          
          {tradeUrlMessage.text && (
            <div className={`alert ${tradeUrlMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {tradeUrlMessage.text}
            </div>
          )}
          
          {tradeUrlExpiry && (
            <div className="alert alert-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Current trade URL expires on: {tradeUrlExpiry.toLocaleDateString()}
            </div>
          )}
          
          <form onSubmit={handleUpdateTradeUrl} className="settings-form">
            <div className="form-group">
              <label htmlFor="tradeUrl">Steam Trade URL</label>
              <input
                type="text"
                id="tradeUrl"
                value={tradeUrl}
                onChange={(e) => setTradeUrl(e.target.value)}
                placeholder="https://steamcommunity.com/tradeoffer/new/..."
                className="form-input"
              />
              <div className="form-help">
                <a 
                  href="https://steamcommunity.com/my/tradeoffers/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link-text"
                >
                  Find your Steam Trade URL
                </a>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm"></span>
                  Updating...
                </>
              ) : 'Update Trade URL'}
            </button>
          </form>
        </div>
        
        {/* Steam Login Secure Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h2>Steam Login Secure Token</h2>
          </div>
          
          <p className="settings-info">
            <span className="warning-text">Advanced setting:</span> The Steam login secure token is used for automating trades without user interaction.
            This is optional and only recommended for advanced users.
          </p>
          
          {tokenMessage.text && (
            <div className={`alert ${tokenMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {tokenMessage.text}
            </div>
          )}
          
          <form onSubmit={handleUpdateSteamLoginSecure} className="settings-form">
            <div className="form-group">
              <label htmlFor="steamLoginSecure">Steam Login Secure Token</label>
              <input
                type="password"
                id="steamLoginSecure"
                value={steamLoginSecure}
                onChange={(e) => setSteamLoginSecure(e.target.value)}
                placeholder="Enter your Steam login secure token"
                className="form-input"
              />
              <div className="form-help warning-text">
                Never share this token with anyone. It provides full access to your Steam account trading capabilities.
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-secondary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-sm"></span>
                  Updating...
                </>
              ) : 'Update Token'}
            </button>
          </form>
        </div>
        
        {/* Help Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12" y2="17"></line>
            </svg>
            <h2>Need Help?</h2>
          </div>
          
          <p className="settings-info">
            If you're having trouble setting up your Steam trading settings, please check our 
            <a href="#" className="link-text"> FAQ</a> or contact our 
            <a href="#" className="link-text"> support team</a> for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SteamSettingsPage; 