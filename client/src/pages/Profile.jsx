import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiEdit, FiSave, FiShield, FiRefreshCw } from 'react-icons/fi';
import { FaSteam, FaCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = ({ user, onBalanceUpdate }) => {
  const { user: authUser, updateUser: authUpdateUser } = useAuth();
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
  
  // Initialize form data with user profile
  const initializeFormData = useCallback((userData) => {
    if (!userData) return;
    
    setFormData({
      displayName: userData.displayName || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      country: userData.country || '',
      city: userData.city || '',
      preferredCurrency: userData.settings?.currency || 'USD',
      theme: userData.settings?.theme || 'dark',
      privacySettings: {
        showOnlineStatus: userData.settings?.privacy?.showOnlineStatus ?? true,
        showInventoryValue: userData.settings?.privacy?.showInventoryValue ?? false
      },
      notificationSettings: {
        email: userData.settings?.notifications?.email ?? true,
        push: userData.settings?.notifications?.push ?? true,
        offers: userData.settings?.notifications?.offers ?? true,
        trades: userData.settings?.notifications?.trades ?? true
      }
    });
  }, []);
  
  // Use authUser as the most up-to-date source of user data
  useEffect(() => {
    const currentUser = authUser || user;
    if (currentUser) {
      console.log("Setting profile with user data:", currentUser);
      setProfile(currentUser);
      
      // Only initialize form data if we're not already editing
      if (!isEditing) {
        initializeFormData(currentUser);
      }
      
      setLoading(false);
    }
  }, [authUser, user, initializeFormData, isEditing]);
  
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      console.log("Fetching user profile data...");
      const response = await axios.get(`${API_URL}/auth/user`, { 
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: {
          _t: new Date().getTime() // Add timestamp to bust cache
        }
      });
      console.log("Received user data:", response.data);
      
      if (response.data.authenticated) {
        const userData = response.data.user;
        console.log("Setting profile with fresh user data:", userData);
        
        // Always use server data - it's the source of truth
        setProfile(userData);
        
        // Update auth context with fresh data
        if (authUpdateUser) {
          authUpdateUser(userData);
        }
        
        // Update window global user
        if (typeof window.updateGlobalUser === 'function') {
          window.updateGlobalUser(userData);
        }
        
        // Initialize form with user data only if we're not editing
        if (!isEditing) {
          initializeFormData(userData);
        }
      } else {
        // If not authenticated, show error
        setError('Authentication error. Please log in again.');
        toast.error('Authentication error. Please log in again.');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch initial profile data
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  const refreshProfile = async () => {
    if (isEditing) {
      // Ask for confirmation before refreshing while editing
      if (!window.confirm('Refreshing will discard your unsaved changes. Continue?')) {
        return;
      }
      setIsEditing(false);
    }
    
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
      setFormData(prevData => ({
        ...prevData,
        [section]: {
          ...prevData[section],
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  const startEditing = () => {
    // Make sure form data is initialized with current profile data before editing
    initializeFormData(profile);
    setIsEditing(true);
  };
  
  const cancelEditing = () => {
    // Reset form data to current profile values
    initializeFormData(profile);
    setIsEditing(false);
  };
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    console.log('Saving profile with form data:', formData);
    
    try {
      const payload = {
        // Don't include displayName in the payload as it should be preserved from Steam
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
      
      // Get the current auth token to ensure proper authentication
      const authToken = localStorage.getItem('auth_token');
      
      // Simplified API call with better error handling and explicit configuration
      const response = await axios({
        method: 'PUT',
        url: `${API_URL}/user/settings`,
        data: payload,
        withCredentials: true,
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          // Include auth token in header if available
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        // Add auth token as query param as well (belt and suspenders approach)
        params: {
          ...(authToken ? { auth_token: authToken } : {}),
          _t: Date.now() // Add timestamp to prevent caching
        }
      });
      
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        toast.success('Profile saved successfully');
        
        // Update profile with response data but keep form data unchanged
        const updatedUser = response.data.user;
        
        // Make a copy of the updated user to ensure all fields are properly updated
        const completeUpdatedUser = {
          ...profile, // Keep any fields not returned by the API
          ...updatedUser, // Update with new data
          // Ensure settings object is complete
          settings: {
            ...(profile?.settings || {}),
            ...(updatedUser.settings || {}),
            // Ensure nested settings objects are complete
            privacy: {
              ...(profile?.settings?.privacy || {}),
              ...(updatedUser.settings?.privacy || {})
            },
            notifications: {
              ...(profile?.settings?.notifications || {}),
              ...(updatedUser.settings?.notifications || {})
            }
          }
        };
        
        console.log('Complete updated user object:', completeUpdatedUser);
        
        // Set the complete user object in state and other contexts
        setProfile(completeUpdatedUser);
        
        // Update auth context with the complete user data
        if (authUpdateUser) {
          authUpdateUser(completeUpdatedUser);
        }
        
        // Update global user state with the complete user data
        if (typeof window.updateGlobalUser === 'function') {
          window.updateGlobalUser(completeUpdatedUser);
        }
        
        // Also update local storage if it's being used (optional backup)
        try {
          if (authToken) {
            localStorage.setItem('user_data', JSON.stringify(completeUpdatedUser));
          }
        } catch (e) {
          console.error('Error updating localStorage:', e);
        }
        
        setIsEditing(false);
      } else {
        console.error('Server returned error:', response.data);
        toast.error(response.data.message || 'Failed to save profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // More detailed error logging
      const errorMessage = err.response ? 
        `Failed to save profile: ${err.response.status} - ${err.response.statusText}` :
        `Failed to save profile: ${err.message || 'Network error'}`;
        
      console.error(errorMessage);
      console.error('Error details:', err);
      
      if (err.response) {
        console.error('Response data:', err.response.data);
      }
      
      // Show a more specific error message to the user
      let userErrorMessage = 'Failed to save profile';
      
      if (err.message === 'Network Error') {
        userErrorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          userErrorMessage = 'Authentication error. Please log in again.';
        } else if (err.response.status === 400) {
          userErrorMessage = err.response.data?.error || 'Invalid data submitted.';
        } else if (err.response.status >= 500) {
          userErrorMessage = 'Server error. Please try again later.';
        }
      } else if (err.code === 'ECONNABORTED') {
        userErrorMessage = 'Request timed out. Please try again later.';
      }
      
      setError(userErrorMessage);
      toast.error(userErrorMessage);
      
      // If authentication error, refresh the token
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // Refresh token or redirect to login
        if (typeof window.location !== 'undefined') {
          setTimeout(() => {
            window.location.href = `${API_URL}/auth/steam`;
          }, 1500);
        }
      }
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
  
  // Ensure profile exists before rendering the main UI
  if (!profile) {
    return (
      <div className="profile-error">
        <p>Could not load profile information. Please try refreshing the page.</p>
        <button onClick={refreshProfile} className="profile-refresh-btn">
          <FiRefreshCw /> Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-user-info">
          <img 
            src={profile?.avatar || 'https://via.placeholder.com/150'} 
            alt="Profile" 
            className="profile-avatar"
          />
          <div className="profile-user-details">
            <h1 className="profile-username">{profile?.displayName || 'User'}</h1>
            <div className="profile-badges">
              <div className="profile-badge profile-badge-steam">
                <FaSteam /> Steam Connected
              </div>
              <div className="profile-badge profile-badge-online">
                <FaCircle /> Online
              </div>
              {profile?.verificationLevel > 0 && (
                <div className="profile-badge profile-badge-verified">
                  <FiShield /> Verified
                </div>
              )}
            </div>
            <p className="profile-steam-id">
              Steam ID: <span>{profile?.steamId || 'Not available'}</span>
            </p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="profile-refresh-btn" onClick={refreshProfile} disabled={loading}>
            <FiRefreshCw /> {loading ? 'Loading...' : 'Refresh Profile'}
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
                    onClick={startEditing}
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
                        <FiUser /> Display Name (Steam)
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        disabled
                        className="profile-input profile-input-disabled"
                        title="Display name is synced with your Steam profile"
                      />
                      <small className="input-helper-text">Your display name is synchronized with your Steam account</small>
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
                      onClick={cancelEditing}
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
              src={profile?.avatar || 'https://via.placeholder.com/80'} 
              alt="Steam Avatar" 
              className="profile-steam-avatar"
            />
            <div>
              <h3>{profile?.displayName}</h3>
              <p>Steam ID: {profile?.steamId}</p>
              <a 
                href={profile?.profileUrl || `https://steamcommunity.com/profiles/${profile?.steamId}`} 
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