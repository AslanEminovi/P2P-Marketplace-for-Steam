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
  FaWallet
} from 'react-icons/fa';
import { API_URL } from '../config/constants';
import './Settings.css';
import { useAuth } from '../context/AuthContext';

const Settings = ({ user, onBalanceUpdate }) => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
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
    firstName: '',
    lastName: '',
    country: '',
    city: ''
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
            displayName: response.data.user.displayName || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            country: response.data.user.country || '',
            city: response.data.user.city || '',
            currency: response.data.user.settings?.currency || 'USD'
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Log the data being sent for debugging
      console.log('Saving settings with data:', {
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country,
        city: formData.city,
        settings: {
          currency: formData.currency
        }
      });

      // Update to match the backend User model structure with nested settings
      const response = await axios.put(
        `${API_URL}/user/settings`,
        {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          country: formData.country,
          city: formData.city,
          settings: {
            currency: formData.currency
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
            displayName: response.data.user.displayName || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            country: response.data.user.country || '',
            city: response.data.user.city || '',
            currency: response.data.user.settings?.currency || 'USD'
          });
          
          // Log the updated user object in the context
          console.log('User data updated in context');
        } else {
          // Warn if server didn't return user data
          console.warn('Server did not return updated user data');
          // Fallback to updating with form data
          updateUser({
            ...user,
            displayName: formData.displayName,
            email: formData.email,
            phone: formData.phone,
            firstName: formData.firstName,
            lastName: formData.lastName,
            country: formData.country,
            city: formData.city,
            settings: {
              ...user.settings,
              currency: formData.currency
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
      { id: 'general', label: 'General Settings', icon: <FaCog /> },
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
              disabled={true}
            />
            <small className="settings-input-help">Display name is synchronized with your Steam profile</small>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label htmlFor="firstName">
                <FaUser className="settings-input-icon" /> First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="settings-input"
                placeholder="Your first name"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="lastName">
                <FaUser className="settings-input-icon" /> Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="settings-input"
                placeholder="Your last name"
              />
            </div>
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

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label htmlFor="country">
                <FaUser className="settings-input-icon" /> Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="settings-input"
                placeholder="Your country"
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="city">
                <FaUser className="settings-input-icon" /> City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="settings-input"
                placeholder="Your city"
              />
            </div>
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
        
        <div className="settings-steam-card">
          <h3>Trade URL</h3>
          <p>Your Steam trade URL is required to receive trade offers from other users</p>
          <a 
            href="https://steamcommunity.com/my/tradeoffers/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="settings-action-button steam-external"
          >
            Get Steam Trade URL
          </a>
          <Link to="/settings/steam" className="settings-action-button">
            Configure Trade Settings
          </Link>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'general':
        return renderGeneralSettings();
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