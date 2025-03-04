import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SteamSettings.css';

function SteamSettings() {
  const [tradeUrl, setTradeUrl] = useState('');
  const [tradeUrlExpiry, setTradeUrlExpiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Fetch current trade URL and expiry if available
    const fetchSettings = async () => {
      try {
        const res = await axios.get('http://localhost:5001/auth/user', { withCredentials: true });
        if (res.data.authenticated) {
          if (res.data.user.tradeUrlExpiry) {
            setTradeUrlExpiry(new Date(res.data.user.tradeUrlExpiry));
          }
          
          // Load the saved trade URL to display in the input field
          if (res.data.user.tradeUrl) {
            setTradeUrl(res.data.user.tradeUrl);
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
      setMessage({ type: 'error', text: 'Please enter a valid Steam trade URL' });
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(
        'http://localhost:5001/offers/steam/trade-url',
        { tradeUrl },
        { withCredentials: true }
      );
      
      setMessage({ type: 'success', text: res.data.message });
      setTradeUrlExpiry(new Date(res.data.expiryDate));
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update trade URL' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="steam-settings">
      <h2>Steam Trading Settings</h2>
      <p className="settings-intro">
        To enable trading functionality, you need to provide your Steam trade URL.
        This allows other users to send you trade offers.
      </p>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="settings-card">
        <h3>Trade URL</h3>
        <p>Your Steam trade URL is required to receive trade offers from sellers and buyers.</p>
        
        {tradeUrlExpiry && (
          <div className="expiry-notice">
            <span>Current trade URL expires on: {tradeUrlExpiry.toLocaleDateString()}</span>
          </div>
        )}
        
        <form onSubmit={handleUpdateTradeUrl}>
          <div className="form-group">
            <label htmlFor="tradeUrl">Steam Trade URL</label>
            <input
              type="text"
              id="tradeUrl"
              value={tradeUrl}
              onChange={(e) => setTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/..."
            />
            <small className="help-text">
              <a 
                href="https://steamcommunity.com/my/tradeoffers/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Find your Trade URL here
              </a>
            </small>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Trade URL'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SteamSettings;