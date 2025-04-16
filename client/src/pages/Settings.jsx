import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FaCog, 
  FaSteam, 
  FaChevronRight, 
  FaSave, 
  FaUser,
  FaEnvelope,
  FaPhone,
  FaDollarSign,
  FaWallet,
  FaShieldAlt,
  FaBell,
  FaLock
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './Settings.css';
import { useAuth } from '../context/AuthContext';

const Settings = ({ user, onBalanceUpdate }) => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('steam');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Settings form data
  const [formData, setFormData] = useState({
    tradeUrl: '',
    tradeUrlExpiry: null,
    notificationPreferences: {
      tradeOffers: true,
      marketUpdates: true,
      pricingAlerts: false
    },
    securitySettings: {
      twoFactorAuth: false,
      loginNotifications: true
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
          console.log("Fetched user data:", response.data.user);
          setFormData({
            tradeUrl: response.data.user.tradeUrl || '',
            tradeUrlExpiry: response.data.user.tradeUrlExpiry || null,
            notificationPreferences: {
              tradeOffers: response.data.user.settings?.notifications?.trades ?? true,
              marketUpdates: response.data.user.settings?.notifications?.market ?? true,
              pricingAlerts: response.data.user.settings?.notifications?.pricing ?? false
            },
            securitySettings: {
              twoFactorAuth: response.data.user.settings?.security?.twoFactorAuth ?? false,
              loginNotifications: response.data.user.settings?.security?.loginNotifications ?? true
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
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Log the data being sent for debugging
      console.log('Saving settings with data:', {
        tradeUrl: formData.tradeUrl,
        settings: {
          notifications: {
            trades: formData.notificationPreferences.tradeOffers,
            market: formData.notificationPreferences.marketUpdates,
            pricing: formData.notificationPreferences.pricingAlerts
          },
          security: {
            twoFactorAuth: formData.securitySettings.twoFactorAuth,
            loginNotifications: formData.securitySettings.loginNotifications
          }
        }
      });

      // Update to match the backend User model structure with nested settings
      const response = await axios.put(
        `${API_URL}/user/settings`,
        {
          tradeUrl: formData.tradeUrl,
          settings: {
            notifications: {
              trades: formData.notificationPreferences.tradeOffers,
              market: formData.notificationPreferences.marketUpdates,
              pricing: formData.notificationPreferences.pricingAlerts
            },
            security: {
              twoFactorAuth: formData.securitySettings.twoFactorAuth,
              loginNotifications: formData.securitySettings.loginNotifications
            }
          }
        },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Settings saved successfully');
        
        // Log the raw response for debugging
        console.log('Raw server response:', response.data);
        
        // Check if server returned updated user data
        if (response.data.user) {
          console.log('Server returned updated user data:', response.data.user);
          
          // Update the user data in context with complete server-returned data
          updateUser(response.data.user);
          
          // Update form data with the latest values from server
          setFormData({
            tradeUrl: response.data.user.tradeUrl || '',
            tradeUrlExpiry: response.data.user.tradeUrlExpiry || null,
            notificationPreferences: {
              tradeOffers: response.data.user.settings?.notifications?.trades ?? true,
              marketUpdates: response.data.user.settings?.notifications?.market ?? true,
              pricingAlerts: response.data.user.settings?.notifications?.pricing ?? false
            },
            securitySettings: {
              twoFactorAuth: response.data.user.settings?.security?.twoFactorAuth ?? false,
              loginNotifications: response.data.user.settings?.security?.loginNotifications ?? true
            }
          });
          
          // Log the updated user object in the context
          console.log('User data updated in context');
        } else {
          // Warn if server didn't return user data
          console.warn('Server did not return updated user data');
          // Fallback to updating with form data
          updateUser({
            ...user,
            tradeUrl: formData.tradeUrl,
            settings: {
              ...user.settings,
              notifications: {
                ...(user.settings?.notifications || {}),
                trades: formData.notificationPreferences.tradeOffers,
                market: formData.notificationPreferences.marketUpdates,
                pricing: formData.notificationPreferences.pricingAlerts
              },
              security: {
                ...(user.settings?.security || {}),
                twoFactorAuth: formData.securitySettings.twoFactorAuth,
                loginNotifications: formData.securitySettings.loginNotifications
              }
            }
          });
        }
        
        // Double-check that the user data was updated by fetching it again
        setTimeout(() => fetchUserProfile(), 1000);
      } else {
        console.error('Save response not successful:', response.data);
        toast.error(response.data?.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save settings');
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Render sidebar navigation
  const renderSidebar = () => {
    const tabs = [
      { id: 'steam', label: 'Steam Trading', icon: <FaSteam /> },
      { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
      { id: 'security', label: 'Security', icon: <FaShieldAlt /> }
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
          
          <div className="settings-nav-divider"></div>
          
          <Link to="/profile" className="settings-nav-item">
            <span className="settings-nav-icon"><FaUser /></span>
            <span className="settings-nav-label">Profile Settings</span>
            <FaChevronRight className="settings-nav-arrow" />
          </Link>
        </nav>
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
        
        <form onSubmit={handleSaveSettings} className="settings-form">
          <div className="settings-form-group">
            <label htmlFor="tradeUrl">
              <FaLock className="settings-input-icon" /> Trade URL
            </label>
            <input
              type="text"
              id="tradeUrl"
              name="tradeUrl"
              value={formData.tradeUrl}
              onChange={handleChange}
              className="settings-input"
              placeholder="Enter your Steam trade URL"
            />
            <small className="settings-input-help">
              Your Steam trade URL is needed for receiving trade offers. 
              <a 
                href="https://steamcommunity.com/my/tradeoffers/privacy" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="settings-link"
              >
                Get your trade URL
              </a>
            </small>
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
                Save Trade URL
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
          Control which notifications you receive from the marketplace.
        </p>
        
        <form onSubmit={handleSaveSettings} className="settings-form">
          <div className="settings-check-group">
            <input
              type="checkbox"
              id="tradeOffers"
              name="notificationPreferences.tradeOffers"
              checked={formData.notificationPreferences.tradeOffers}
              onChange={handleChange}
              className="settings-checkbox"
            />
            <label htmlFor="tradeOffers">
              Trade Offers and Updates
            </label>
            <small className="settings-input-help">
              Receive notifications when you receive trade offers or when trade status changes
            </small>
          </div>
          
          <div className="settings-check-group">
            <input
              type="checkbox"
              id="marketUpdates"
              name="notificationPreferences.marketUpdates"
              checked={formData.notificationPreferences.marketUpdates}
              onChange={handleChange}
              className="settings-checkbox"
            />
            <label htmlFor="marketUpdates">
              Marketplace Updates
            </label>
            <small className="settings-input-help">
              Receive notifications about new listings and marketplace news
            </small>
          </div>
          
          <div className="settings-check-group">
            <input
              type="checkbox"
              id="pricingAlerts"
              name="notificationPreferences.pricingAlerts"
              checked={formData.notificationPreferences.pricingAlerts}
              onChange={handleChange}
              className="settings-checkbox"
            />
            <label htmlFor="pricingAlerts">
              Pricing Alerts
            </label>
            <small className="settings-input-help">
              Get notified when items in your wishlist change in price
            </small>
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
                Save Notification Settings
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Render security settings
  const renderSecuritySettings = () => {
    return (
      <div className="settings-content-section">
        <h2><FaShieldAlt className="settings-title-icon" /> Security Settings</h2>
        <p className="settings-description">
          Enhance the security of your account with these settings.
        </p>
        
        <form onSubmit={handleSaveSettings} className="settings-form">
          <div className="settings-check-group">
            <input
              type="checkbox"
              id="twoFactorAuth"
              name="securitySettings.twoFactorAuth"
              checked={formData.securitySettings.twoFactorAuth}
              onChange={handleChange}
              className="settings-checkbox"
            />
            <label htmlFor="twoFactorAuth">
              Enable Two-Factor Authentication
            </label>
            <small className="settings-input-help">
              Add an extra layer of security to your account
            </small>
          </div>
          
          <div className="settings-check-group">
            <input
              type="checkbox"
              id="loginNotifications"
              name="securitySettings.loginNotifications"
              checked={formData.securitySettings.loginNotifications}
              onChange={handleChange}
              className="settings-checkbox"
            />
            <label htmlFor="loginNotifications">
              Login Notifications
            </label>
            <small className="settings-input-help">
              Receive notifications when someone logs into your account
            </small>
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
                Save Security Settings
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'steam':
        return renderSteamSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return renderSteamSettings();
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
              <FaEnvelope /> {error}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings; 