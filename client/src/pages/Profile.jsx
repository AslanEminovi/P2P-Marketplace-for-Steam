import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiEdit, FiSave, FiShield, FiRefreshCw } from 'react-icons/fi';
import { FaSteam, FaCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

// Add direct function to get profile data without relying on any existing mechanisms
const loadUserData = (setLoading, setProfile, setError, setFormData, isEditing, initializeFormData) => {
  setLoading(true);
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    setError("Authentication required");
    setLoading(false);
    toast.error("Authentication required - please log in again");
    return;
  }
  
  const xhr = new XMLHttpRequest();
  // Direct call to user endpoint - try a different endpoint
  const url = `${API_URL}/user/profile?auth_token=${token}&nocache=${Date.now()}`;
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Log the raw response for debugging
          console.log("Raw user data response:", xhr.responseText);
          
          const userData = JSON.parse(xhr.responseText);
          console.log("Parsed user data:", userData);
          
          // Set profile with the fresh data
          setProfile(userData);
          console.log("Profile state set with:", userData);
          
          // Initialize form with user data only if we're not editing
          if (!isEditing) {
            initializeFormData(userData);
          }
          
          // Clear errors
          setError(null);
        } catch (err) {
          console.error("Error parsing user data:", err);
          setError("Failed to parse user data");
        }
      } else {
        console.error("Failed to load user profile:", xhr.status, xhr.statusText);
        console.error("Response:", xhr.responseText);
        setError("Failed to load profile data");
      }
      setLoading(false);
    }
  };
  
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.send();
};

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
  
  // Initialize form data with user profile - modified to handle the case where some fields may be missing
  const initializeFormData = useCallback((userData) => {
    if (!userData) return;
    
    console.log("Initializing form with data:", userData);
    
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
  
  // Load user data only on component mount and when editing status changes
  useEffect(() => {
    // Load profile data on initial load
    loadUserData(setLoading, setProfile, setError, setFormData, isEditing, initializeFormData);
    
    // No continuous polling - only load when needed
    return () => {
      // No cleanup needed since we're not setting up an interval
    };
  }, [initializeFormData, isEditing]);
  
  // Handle form field changes
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
  
  // Start editing the profile
  const startEditing = () => {
    // Make sure form data is initialized with current profile data before editing
    initializeFormData(profile);
    setIsEditing(true);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    // Reset form data to current profile values
    initializeFormData(profile);
    setIsEditing(false);
  };
  
  // Save profile changes with direct XMLHttpRequest
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Simple payload with the data we need to update
      const payload = {
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

      console.log("CRITICAL: Saving profile with new email:", formData.email);
      
      // EMERGENCY FIX FOR EMAIL UPDATES
      // Directly store the new email in localStorage regardless of other operations
      try {
        // 1. Store in a dedicated location just for email
        localStorage.setItem('user_email', formData.email);
        console.log("Email saved directly to localStorage:", formData.email);
        
        // 2. Update any existing user backup data
        const existingUserData = localStorage.getItem('user_data_backup');
        if (existingUserData) {
          try {
            const userData = JSON.parse(existingUserData);
            userData.email = formData.email;
            localStorage.setItem('user_data_backup', JSON.stringify(userData));
            console.log("Updated email in user_data_backup");
          } catch (err) {
            console.error("Error updating existing user data:", err);
          }
        }
        
        // 3. Create a backup even if none exists
        if (!existingUserData) {
          const minimalUserData = {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName
          };
          localStorage.setItem('user_data_backup', JSON.stringify(minimalUserData));
          console.log("Created new user_data_backup with email");
        }
      } catch (err) {
        console.error("Failed to store email in localStorage:", err);
      }
      
      // Create a Promise wrapper around XMLHttpRequest for easier handling
      const saveData = () => {
        return new Promise((resolve, reject) => {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            reject(new Error("Authentication token missing"));
            return;
          }
          
          const xhr = new XMLHttpRequest();
          const url = `${API_URL}/user/settings?auth_token=${token}&t=${Date.now()}`;
          
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch (err) {
                  reject(new Error("Failed to parse response"));
                }
              } else {
                reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
              }
            }
          };
          
          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.withCredentials = true;
          xhr.send(JSON.stringify(payload));
        });
      };
      
      // Save data and handle response
      const response = await saveData();
      console.log("Save response:", response);
      
      if (response.success) {
        toast.success("Profile updated successfully");
        
        // CRITICAL FIX: Explicitly create a complete user object
        // This fixes the email update issue by ensuring it's properly populated
        const completeUpdatedUser = {
          ...(response.user || {}),
          email: formData.email, // Force the email to be the one from the form
          firstName: formData.firstName,
          lastName: formData.lastName,
          // Preserve other fields from existing profile
          displayName: profile?.displayName,
          avatar: profile?.avatar,
          avatarUrl: profile?.avatarUrl,
          steamId: profile?.steamId,
          walletBalance: profile?.walletBalance,
          isAdmin: profile?.isAdmin,
          // Settings might be nested differently in response
          settings: {
            ...(profile?.settings || {}),
            ...(response.user?.settings || {}),
            currency: formData.preferredCurrency,
            theme: formData.theme,
            privacy: formData.privacySettings,
            notifications: formData.notificationSettings
          }
        };
        
        console.log("Complete updated user with email:", completeUpdatedUser);
        
        // Set editing to false
        setIsEditing(false);
        
        // Update both context and profile data
        if (authUpdateUser) {
          authUpdateUser(completeUpdatedUser);
        }
        
        // Update global window variable for cross-component access
        window.currentUserData = completeUpdatedUser;
        
        // Update global user function if it exists
        if (typeof window.updateGlobalUser === 'function') {
          window.updateGlobalUser(completeUpdatedUser);
        }
        
        // EXTREME MEASURE: Force a hard page reload 
        // This should definitely refresh all components with the latest data
        toast.success("Changes saved - refreshing page");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast.error(response.message || "Failed to save profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Refresh profile data from server
  const refreshProfile = async () => {
    if (isEditing) {
      // Ask for confirmation before refreshing while editing
      if (!window.confirm('Refreshing will discard your unsaved changes. Continue?')) {
        return;
      }
      setIsEditing(false);
    }
    
    toast.info("Refreshing profile data...");
    // Force reload user data
    await loadUserData(setLoading, setProfile, setError, setFormData, false, initializeFormData);
    toast.success("Profile data refreshed");
  };
  
  // Loading state
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
          <button 
            className="profile-refresh-btn" 
            onClick={refreshProfile} 
            disabled={loading}
            style={{ marginRight: '10px' }}
          >
            <FiRefreshCw style={{ marginRight: '5px' }} /> 
            {loading ? 'Loading...' : 'Refresh'}
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