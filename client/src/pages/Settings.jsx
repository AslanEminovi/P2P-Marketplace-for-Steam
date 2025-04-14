import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaWallet, 
  FaCog, 
  FaBell, 
  FaShieldAlt, 
  FaSteam, 
  FaChevronRight, 
  FaSave, 
  FaExchangeAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaDollarSign,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './Settings.css';
import Wallet from '../components/Wallet';

const Settings = ({ user, onBalanceUpdate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Settings form data
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    currency: 'USD',
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      offers: true,
      trades: true
    }
  });

  // Fetch user profile data
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
      if (response.data.authenticated) {
        setProfile(response.data.user);
        
        // Initialize form with user data
        if (response.data.user) {
          setFormData({
            displayName: response.data.user.displayName || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            currency: response.data.user.settings?.currency || 'USD',
            theme: response.data.user.settings?.theme || 'dark',
            notifications: {
              email: response.data.user.settings?.notifications?.email ?? true,
              push: response.data.user.settings?.notifications?.push ?? true,
              offers: response.data.user.settings?.notifications?.offers ?? true,
              trades: response.data.user.settings?.notifications?.trades ?? true
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent],
            [child]: checked
          }
        });
      } else {
        setFormData({
          ...formData,
          [name]: checked
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.put(
        `${API_URL}/user/settings`,
        {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          settings: {
            currency: formData.currency,
            theme: formData.theme,
            notifications: formData.notifications
          }
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success('Settings saved successfully');
        fetchUserProfile(); // Refresh user data
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings');
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Render sidebar navigation
  const renderSidebar = () => {
    const tabs = [
      { id: 'general', label: 'General Settings', icon: <FaCog /> },
      { id: 'wallet', label: 'Wallet', icon: <FaWallet /> },
      { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
      { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
      { id: 'steam', label: 'Steam Trading', icon: <FaSteam /> }
    ];

    return (
      <div className="settings-sidebar">
        <div className="settings-user-info">
          <img 
            src={user?.avatar || 'https://via.placeholder.com/150'} 
            alt={user?.displayName || 'User'} 
            className="settings-avatar"
          />
          <div className="settings-user-details">
            <h3>{user?.displayName || 'User'}</h3>
            <p>{user?.email || 'No email provided'}</p>
          </div>
        </div>

        <nav className="settings-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-nav-icon">{tab.icon}</span>
              <span className="settings-nav-label">{tab.label}</span>
              <FaChevronRight className="settings-nav-arrow" />
            </button>
          ))}
        </nav>
      </div>
    );
  };

  // Render general settings form
  const renderGeneralSettings = () => {
    return (
      <div className="settings-content-section">
        <h2><FaUser className="settings-title-icon" /> Profile Settings</h2>
        <form onSubmit={handleSaveSettings}>
          <div className="settings-form-group">
            <label htmlFor="displayName">
              <FaUser className="settings-input-icon" /> Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="settings-input"
              placeholder="Your display name"
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="email">
              <FaEnvelope className="settings-input-icon" /> Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="settings-input"
              placeholder="Your email address"
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="phone">
              <FaPhone className="settings-input-icon" /> Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="settings-input"
              placeholder="Your phone number"
            />
          </div>

          <h2 className="settings-section-title"><FaCog className="settings-title-icon" /> Preferences</h2>

          <div className="settings-form-group">
            <label htmlFor="currency">
              <FaDollarSign className="settings-input-icon" /> Preferred Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="settings-input"
            >
              <option value="USD">US Dollar (USD)</option>
              <option value="GEL">Georgian Lari (GEL)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label htmlFor="theme">
              {formData.theme === 'dark' ? 
                <FaMoon className="settings-input-icon" /> : 
                <FaSun className="settings-input-icon" />
              } Theme
            </label>
            <select
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              className="settings-input"
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>

          <button type="submit" className="settings-save-button" disabled={loading}>
            {loading ? (
              <>
                <div className="settings-spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="settings-button-icon" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Render notification settings
  const renderNotificationSettings = () => {
    return (
      <div className="settings-content-section">
        <h2><FaBell className="settings-title-icon" /> Notification Preferences</h2>
        <p className="settings-description">
          Control how and when you receive notifications about your activity on CS2 Marketplace.
        </p>

        <form onSubmit={handleSaveSettings}>
          <div className="settings-toggle-group">
            <label className="settings-toggle-label">
              <span>
                <FaEnvelope className="settings-toggle-icon" />
                Email Notifications
              </span>
              <span className="settings-toggle-description">Receive important updates via email</span>
              <div className="settings-toggle-switch">
                <input
                  type="checkbox"
                  name="notifications.email"
                  checked={formData.notifications.email}
                  onChange={handleChange}
                  className="settings-toggle-input"
                />
                <span className="settings-toggle-slider"></span>
              </div>
            </label>
          </div>

          <div className="settings-toggle-group">
            <label className="settings-toggle-label">
              <span>
                <FaBell className="settings-toggle-icon" />
                Push Notifications
              </span>
              <span className="settings-toggle-description">Receive real-time notifications in your browser</span>
              <div className="settings-toggle-switch">
                <input
                  type="checkbox"
                  name="notifications.push"
                  checked={formData.notifications.push}
                  onChange={handleChange}
                  className="settings-toggle-input"
                />
                <span className="settings-toggle-slider"></span>
              </div>
            </label>
          </div>

          <div className="settings-toggle-group">
            <label className="settings-toggle-label">
              <span>
                <FaExchangeAlt className="settings-toggle-icon" />
                Trade Notifications
              </span>
              <span className="settings-toggle-description">Get notified about trade updates and status changes</span>
              <div className="settings-toggle-switch">
                <input
                  type="checkbox"
                  name="notifications.trades"
                  checked={formData.notifications.trades}
                  onChange={handleChange}
                  className="settings-toggle-input"
                />
                <span className="settings-toggle-slider"></span>
              </div>
            </label>
          </div>

          <div className="settings-toggle-group">
            <label className="settings-toggle-label">
              <span>
                <FaDollarSign className="settings-toggle-icon" />
                Offer Notifications
              </span>
              <span className="settings-toggle-description">Get notified about new offers and price changes</span>
              <div className="settings-toggle-switch">
                <input
                  type="checkbox"
                  name="notifications.offers"
                  checked={formData.notifications.offers}
                  onChange={handleChange}
                  className="settings-toggle-input"
                />
                <span className="settings-toggle-slider"></span>
              </div>
            </label>
          </div>

          <button type="submit" className="settings-save-button" disabled={loading}>
            {loading ? (
              <>
                <div className="settings-spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="settings-button-icon" />
                Save Notification Preferences
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Render wallet section
  const renderWalletSection = () => {
    return (
      <div className="settings-content-section">
        <h2><FaWallet className="settings-title-icon" /> Wallet</h2>
        <p className="settings-description">
          Manage your wallet funds, make deposits, withdrawals, and view your transaction history.
        </p>
        
        <div className="settings-wallet-summary">
          <div className="settings-wallet-balance">
            <div className="settings-wallet-currency">
              <FaDollarSign className="settings-wallet-icon" />
              <div>
                <h3>USD Balance</h3>
                <p className="settings-balance-amount">${user?.walletBalance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="settings-wallet-currency">
              <span className="settings-currency-symbol">₾</span>
              <div>
                <h3>GEL Balance</h3>
                <p className="settings-balance-amount">{user?.walletBalanceGEL?.toFixed(2) || '0.00'} ₾</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="settings-wallet-wrapper">
          <Wallet user={user} onBalanceUpdate={onBalanceUpdate} />
        </div>
      </div>
    );
  };

  // Render security settings
  const renderSecuritySettings = () => {
    return (
      <div className="settings-content-section">
        <h2><FaShieldAlt className="settings-title-icon" /> Security Settings</h2>
        <p className="settings-description">
          Manage your account security and authentication options.
        </p>
        
        <div className="settings-security-info">
          <h3>Account Security Level</h3>
          <div className="settings-security-level">
            <div className="settings-security-progress" style={{ 
              width: `${user?.verificationLevel > 0 ? '70%' : '30%'}` 
            }}></div>
          </div>
          <p>{user?.verificationLevel > 0 ? 'Verified Account' : 'Basic Account'}</p>
        </div>
        
        <div className="settings-security-options">
          <div className="settings-security-option">
            <div>
              <h4>Password Reset</h4>
              <p>Change your account password</p>
            </div>
            <button className="settings-action-button">Reset Password</button>
          </div>
          
          <div className="settings-security-option">
            <div>
              <h4>Two-Factor Authentication</h4>
              <p>Add an extra layer of protection to your account</p>
            </div>
            <button className="settings-action-button">Setup 2FA</button>
          </div>
          
          <div className="settings-security-option">
            <div>
              <h4>Account Verification</h4>
              <p>Verify your identity to unlock all features</p>
            </div>
            <button className="settings-action-button" disabled={user?.verificationLevel > 0}>
              {user?.verificationLevel > 0 ? 'Verified' : 'Verify Now'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Steam trading settings
  const renderSteamSettings = () => {
    return (
      <div className="settings-content-section">
        <h2><FaSteam className="settings-title-icon" /> Steam Trading Settings</h2>
        <p className="settings-description">
          Configure your Steam trading settings to enable seamless trades on the marketplace.
          These settings are necessary for processing trades and receiving items from other users.
        </p>
        
        <div className="settings-steam-status">
          <div className="settings-steam-account">
            <img 
              src={user?.avatar || 'https://via.placeholder.com/50'} 
              alt="Steam Profile" 
              className="settings-steam-avatar"
            />
            <div>
              <h3>{user?.displayName || 'Steam User'}</h3>
              <p>Steam ID: {user?.steamId || 'Not connected'}</p>
            </div>
          </div>
          
          <div className="settings-steam-indicator">
            <span className="settings-status-dot online"></span>
            Connected
          </div>
        </div>
        
        <div className="settings-steam-options">
          <div className="settings-steam-option">
            <div>
              <h4>Trade URL</h4>
              <p>Your Steam trade URL is required to receive trade offers from other users</p>
            </div>
            <Link to="/steam-settings" className="settings-action-button">
              Configure Trade URL
            </Link>
          </div>
          
          <div className="settings-steam-option">
            <div>
              <h4>Trading Preferences</h4>
              <p>Configure how you want to handle incoming trade offers</p>
            </div>
            <Link to="/steam-settings" className="settings-action-button">
              Configure
            </Link>
          </div>
          
          <div className="settings-steam-option">
            <div>
              <h4>API Key Management</h4>
              <p>Manage your Steam Web API key for advanced integration</p>
            </div>
            <Link to="/steam-settings" className="settings-action-button">
              Manage Keys
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'wallet':
        return renderWalletSection();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'steam':
        return renderSteamSettings();
      default:
        return renderGeneralSettings();
    }
  };

  if (loading && !profile) {
    return (
      <div className="settings-loading">
        <div className="settings-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="settings-layout">
        {renderSidebar()}
        <div className="settings-content">
          {error && (
            <div className="settings-error">
              <FaBell /> {error}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings; 