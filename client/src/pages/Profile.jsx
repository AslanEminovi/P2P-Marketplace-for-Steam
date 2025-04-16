import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiEdit, FiSave, FiShield } from 'react-icons/fi';
import { FaSteam, FaCircle } from 'react-icons/fa';
import './Profile.css';

const Profile = ({ user, onBalanceUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile form state
  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    preferredCurrency: 'USD',
    theme: 'dark',
    privacySettings: {
      showOnlineStatus: true,
      showInventoryValue: false
    },
    notificationSettings: {
      email: true,
      push: true,
      offers: true,
      trades: true
    }
  });
  
  useEffect(() => {
    if (user) {
      // If parent component provides updated user data, use it to initialize the form
      setProfile(user);
      
      setFormData({
        displayName: user.displayName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        country: user.country || '',
        city: user.city || '',
        preferredCurrency: user.settings?.currency || 'USD',
        theme: user.settings?.theme || 'dark',
        privacySettings: {
          showOnlineStatus: user.settings?.privacy?.showOnlineStatus ?? true,
          showInventoryValue: user.settings?.privacy?.showInventoryValue ?? false
        },
        notificationSettings: {
          email: user.settings?.notifications?.email ?? true,
          push: user.settings?.notifications?.push ?? true,
          offers: user.settings?.notifications?.offers ?? true,
          trades: user.settings?.notifications?.trades ?? true
        }
      });
      
      // Also fetch from the server to ensure we have the latest data
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
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            country: response.data.user.country || '',
            city: response.data.user.city || '',
            preferredCurrency: response.data.user.settings?.currency || 'USD',
            theme: response.data.user.settings?.theme || 'dark',
            privacySettings: {
              showOnlineStatus: response.data.user.settings?.privacy?.showOnlineStatus ?? true,
              showInventoryValue: response.data.user.settings?.privacy?.showInventoryValue ?? false
            },
            notificationSettings: {
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
  
  const refreshProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchUserProfile();
      toast.success('Profile refreshed successfully');
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err.response?.data?.error || 'Failed to refresh profile');
      toast.error('Failed to refresh profile data');
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    console.log('Saving profile with form data:', formData);
    
    try {
      const payload = {
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        settings: {
          currency: formData.preferredCurrency,
          theme: formData.theme,
          privacy: formData.privacySettings,
          notifications: formData.notificationSettings
        }
      };
      
      console.log('Sending payload to server:', payload);
      
      const response = await axios.put(
        `${API_URL}/user/settings`,
        payload,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        toast.success('Profile saved successfully');
        
        // Explicitly update the user in parent component if callback is provided
        if (typeof window.updateGlobalUser === 'function') {
          window.updateGlobalUser(response.data.user);
        }
        
        await fetchUserProfile();
        setIsEditing(false);
      } else {
        toast.error(response.data.message || 'Failed to save profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save profile');
      toast.error('Failed to save profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };
  
  if (loading && !profile) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-user-info">
          <img 
            src={user?.avatar || 'https://via.placeholder.com/150'} 
            alt="Profile" 
            className="profile-avatar"
          />
          <div className="profile-user-details">
            <h1 className="profile-username">{user?.displayName || 'User'}</h1>
            <div className="profile-badges">
              <div className="profile-badge profile-badge-steam">
                <FaSteam /> Steam Connected
              </div>
              <div className="profile-badge profile-badge-online">
                <FaCircle /> Online
              </div>
              {user?.verificationLevel > 0 && (
                <div className="profile-badge profile-badge-verified">
                  <FiShield /> Verified
                </div>
              )}
            </div>
            <p className="profile-steam-id">
              Steam ID: <span>{user?.steamId || 'Not available'}</span>
            </p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="profile-refresh-btn" onClick={refreshProfile} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Profile'}
          </button>
          <Link to="/wallet" className="profile-wallet-btn">
            View Wallet
          </Link>
        </div>
      </div>
      
      <div className="profile-content">
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser /> Personal Info
          </button>
          <button 
            className={`profile-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <FiShield /> Privacy Settings
          </button>
          <button 
            className={`profile-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <FiMail /> Notifications
          </button>
        </div>
        
        <div className="profile-tab-content">
          {activeTab === 'profile' && (
            <div className="profile-section">
              <div className="profile-section-header">
                <h2>Personal Information</h2>
                {!isEditing && (
                  <button 
                    className="profile-edit-btn" 
                    onClick={() => setIsEditing(true)}
                  >
                    <FiEdit /> Edit
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="profile-form">
                  <div className="profile-form-grid">
                    <div className="profile-form-group">
                      <label htmlFor="displayName">
                        <FiUser /> Display Name
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="firstName">
                        <FiUser /> First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="lastName">
                        <FiUser /> Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="email">
                        <FiMail /> Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="phone">
                        <FiPhone /> Phone
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="country">
                        <FiGlobe /> Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="city">
                        <FiMapPin /> City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label htmlFor="preferredCurrency">
                        Preferred Currency
                      </label>
                      <select
                        id="preferredCurrency"
                        name="preferredCurrency"
                        value={formData.preferredCurrency}
                        onChange={handleChange}
                        className="profile-select"
                      >
                        <option value="USD">USD</option>
                        <option value="GEL">GEL</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="profile-form-actions">
                    <button 
                      type="button" 
                      className="profile-cancel-btn"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="profile-save-btn"
                      disabled={saving}
                    >
                      <FiSave /> {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      <FiUser /> Display Name
                    </span>
                    <span className="profile-info-value">{profile?.displayName || '-'}</span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      <FiUser /> Full Name
                    </span>
                    <span className="profile-info-value">
                      {profile?.firstName && profile?.lastName 
                        ? `${profile.firstName} ${profile.lastName}` 
                        : '-'}
                    </span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      <FiMail /> Email
                    </span>
                    <span className="profile-info-value">{profile?.email || '-'}</span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      <FiPhone /> Phone
                    </span>
                    <span className="profile-info-value">{profile?.phone || '-'}</span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      <FiGlobe /> Location
                    </span>
                    <span className="profile-info-value">
                      {profile?.country && profile?.city 
                        ? `${profile.city}, ${profile.country}` 
                        : profile?.country || profile?.city || '-'}
                    </span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      Member Since
                    </span>
                    <span className="profile-info-value">
                      {profile?.createdAt 
                        ? new Date(profile.createdAt).toLocaleDateString() 
                        : '-'}
                    </span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      Verification Level
                    </span>
                    <span className="profile-info-value">
                      {profile?.verificationLevel === 0 && 'Not Verified'}
                      {profile?.verificationLevel === 1 && 'Email Verified'}
                      {profile?.verificationLevel === 2 && 'Phone Verified'}
                      {profile?.verificationLevel === 3 && 'Fully Verified'}
                    </span>
                  </div>
                  
                  <div className="profile-info-item">
                    <span className="profile-info-label">
                      Preferred Currency
                    </span>
                    <span className="profile-info-value">
                      {profile?.settings?.currency || 'USD'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div className="profile-section">
              <div className="profile-section-header">
                <h2>Privacy Settings</h2>
              </div>
              
              <form className="profile-privacy-form" onSubmit={handleSaveProfile}>
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="showOnlineStatus"
                    name="privacySettings.showOnlineStatus"
                    checked={formData.privacySettings.showOnlineStatus}
                    onChange={handleChange}
                  />
                  <label htmlFor="showOnlineStatus">
                    Show Online Status
                  </label>
                  <p className="profile-setting-description">
                    Allow others to see when you're online on the marketplace
                  </p>
                </div>
                
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="showInventoryValue"
                    name="privacySettings.showInventoryValue"
                    checked={formData.privacySettings.showInventoryValue}
                    onChange={handleChange}
                  />
                  <label htmlFor="showInventoryValue">
                    Show Inventory Value
                  </label>
                  <p className="profile-setting-description">
                    Allow others to see the total value of your inventory
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  className="profile-save-btn"
                  disabled={saving}
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="profile-section">
              <div className="profile-section-header">
                <h2>Notification Settings</h2>
              </div>
              
              <form className="profile-notifications-form" onSubmit={handleSaveProfile}>
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    name="notificationSettings.email"
                    checked={formData.notificationSettings.email}
                    onChange={handleChange}
                  />
                  <label htmlFor="emailNotifications">
                    Email Notifications
                  </label>
                  <p className="profile-setting-description">
                    Receive important notifications via email
                  </p>
                </div>
                
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    name="notificationSettings.push"
                    checked={formData.notificationSettings.push}
                    onChange={handleChange}
                  />
                  <label htmlFor="pushNotifications">
                    Push Notifications
                  </label>
                  <p className="profile-setting-description">
                    Receive real-time push notifications in the browser
                  </p>
                </div>
                
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="offerNotifications"
                    name="notificationSettings.offers"
                    checked={formData.notificationSettings.offers}
                    onChange={handleChange}
                  />
                  <label htmlFor="offerNotifications">
                    Offer Notifications
                  </label>
                  <p className="profile-setting-description">
                    Get notified about new offers on your listings
                  </p>
                </div>
                
                <div className="profile-checkbox-group">
                  <input
                    type="checkbox"
                    id="tradeNotifications"
                    name="notificationSettings.trades"
                    checked={formData.notificationSettings.trades}
                    onChange={handleChange}
                  />
                  <label htmlFor="tradeNotifications">
                    Trade Notifications
                  </label>
                  <p className="profile-setting-description">
                    Get notified about trade status updates
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  className="profile-save-btn"
                  disabled={saving}
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      
      <div className="profile-steam-section">
        <div className="profile-section-header">
          <h2><FaSteam /> Steam Account</h2>
        </div>
        
        <div className="profile-steam-info">
          <div className="profile-steam-status">
            <img 
              src={user?.avatar || 'https://via.placeholder.com/80'} 
              alt="Steam Avatar" 
              className="profile-steam-avatar"
            />
            <div>
              <h3>{user?.displayName}</h3>
              <p>Steam ID: {user?.steamId}</p>
              <a 
                href={user?.profileUrl || `https://steamcommunity.com/profiles/${user?.steamId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-steam-link"
              >
                View Steam Profile
              </a>
            </div>
          </div>
          
          <div className="profile-steam-actions">
            <Link to="/steam-settings" className="profile-button">
              Manage Steam Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;