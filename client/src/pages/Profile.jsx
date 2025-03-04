import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Wallet from '../components/Wallet';

const API_URL = 'http://localhost:5001';

const Profile = ({ user, onBalanceUpdate }) => {
  const [activeTab, setActiveTab] = useState('wallet');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Settings form
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [theme, setTheme] = useState('dark');
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    offers: true,
    trades: true
  });
  
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
          setDisplayName(response.data.user.displayName || '');
          setEmail(response.data.user.email || '');
          setPhone(response.data.user.phone || '');
          setPreferredCurrency(response.data.user.settings?.currency || 'USD');
          setTheme(response.data.user.settings?.theme || 'dark');
          setNotificationSettings({
            email: response.data.user.settings?.notifications?.email ?? true,
            push: response.data.user.settings?.notifications?.push ?? true,
            offers: response.data.user.settings?.notifications?.offers ?? true,
            trades: response.data.user.settings?.notifications?.trades ?? true
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/auth/refresh-profile`, { withCredentials: true });
      if (response.data.success) {
        fetchUserProfile(); // Reload the profile data after refresh
        if (onBalanceUpdate) {
          onBalanceUpdate(); // Update parent component if needed
        }
      } else {
        setError('Failed to refresh profile data');
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err.response?.data?.error || 'Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.put(
        `${API_URL}/user/settings`,
        {
          displayName,
          email,
          phone,
          settings: {
            currency: preferredCurrency,
            theme,
            notifications: notificationSettings
          }
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        fetchUserProfile(); // Refresh user data
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !profile) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '80vh',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          borderTopColor: '#4ade80',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ 
          color: '#e2e8f0', 
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          Loading profile...
        </p>
      </div>
    );
  }
  
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '30px',
        background: 'rgba(45, 27, 105, 0.3)',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div>
          <img 
            src={user?.avatar || 'https://via.placeholder.com/150'} 
            alt="Profile" 
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              marginRight: '25px',
              border: '4px solid #4ade80',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.4)'
            }}
          />
        </div>
        <div>
          <h1 style={{ 
            color: '#f1f1f1', 
            margin: '0 0 10px 0',
            fontSize: '1.8rem',
            background: 'linear-gradient(90deg, #4ade80, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {user?.displayName || 'User'}
          </h1>
          <p style={{ color: '#aaa', margin: '0' }}>
            Steam ID: {user?.steamId || 'Not available'}
          </p>
          <div style={{ 
            display: 'flex',
            gap: '15px',
            marginTop: '15px'
          }}>
            <span style={{ 
              background: 'rgba(74, 222, 128, 0.2)', 
              padding: '4px 12px', 
              borderRadius: '50px',
              fontSize: '0.8rem',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span>●</span>Online
            </span>
            <span style={{ 
              background: 'rgba(139, 92, 246, 0.2)', 
              padding: '4px 12px', 
              borderRadius: '50px',
              fontSize: '0.8rem',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span>{user?.verificationLevel > 0 ? '✓' : '○'}</span>
              {user?.verificationLevel > 0 ? 'Verified' : 'Unverified'}
            </span>
            
            {/* Refresh Profile Button */}
            <span style={{ 
              background: 'rgba(56, 189, 248, 0.2)', 
              padding: '4px 12px', 
              borderRadius: '50px',
              fontSize: '0.8rem',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }} 
            onClick={refreshProfile}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(56, 189, 248, 0.3)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(56, 189, 248, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
              </svg>
              Refresh Profile
            </span>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '30px',
        background: 'rgba(45, 27, 105, 0.2)',
        padding: '10px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {['wallet', 'settings', 'verification'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              backgroundColor: activeTab === tab ? '#4ade80' : 'transparent',
              color: activeTab === tab ? '#242424' : '#f1f1f1',
              border: 'none',
              padding: '14px 20px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: '600',
              borderRadius: '12px',
              margin: '0 5px',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab ? '0 4px 12px rgba(74, 222, 128, 0.3)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {tab === 'wallet' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              )}
              {tab === 'settings' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              )}
              {tab === 'verification' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {tab}
            </div>
          </button>
        ))}
      </div>
      
      {/* Error display */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(220, 38, 38, 0.2)',
          color: '#fca5a5',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
        }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}
      
      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div>
            <Wallet user={user} onBalanceUpdate={onBalanceUpdate} />
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div style={{
              background: 'rgba(45, 27, 105, 0.3)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#f1f1f1', 
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1.75rem'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Account Settings
              </h2>
          
              <form onSubmit={handleSaveSettings}>
                {/* Profile Section */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#4ade80', marginBottom: '15px' }}>Profile Information</h3>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#333',
                        border: '1px solid #555',
                        padding: '10px',
                        color: '#f1f1f1',
                        borderRadius: '4px'
                      }}
                      placeholder="Your display name"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#333',
                        border: '1px solid #555',
                        padding: '10px',
                        color: '#f1f1f1',
                        borderRadius: '4px'
                      }}
                      placeholder="Your email address"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#333',
                        border: '1px solid #555',
                        padding: '10px',
                        color: '#f1f1f1',
                        borderRadius: '4px'
                      }}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
                
                {/* Preferences Section */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#4ade80', marginBottom: '15px' }}>Preferences</h3>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                      Preferred Currency
                    </label>
                    <select
                      value={preferredCurrency}
                      onChange={(e) => setPreferredCurrency(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#333',
                        border: '1px solid #555',
                        padding: '10px',
                        color: '#f1f1f1',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="GEL">GEL</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#f1f1f1', display: 'block', marginBottom: '5px' }}>
                      Theme
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#333',
                        border: '1px solid #555',
                        padding: '10px',
                        color: '#f1f1f1',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                </div>
                
                {/* Notification Settings */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#4ade80', marginBottom: '15px' }}>Notification Settings</h3>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      color: '#f1f1f1',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          email: e.target.checked
                        })}
                        style={{ marginRight: '10px' }}
                      />
                      Email Notifications
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      color: '#f1f1f1',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={notificationSettings.push}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          push: e.target.checked
                        })}
                        style={{ marginRight: '10px' }}
                      />
                      Push Notifications
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      color: '#f1f1f1',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={notificationSettings.offers}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          offers: e.target.checked
                        })}
                        style={{ marginRight: '10px' }}
                      />
                      Offer Notifications
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      color: '#f1f1f1',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={notificationSettings.trades}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          trades: e.target.checked
                        })}
                        style={{ marginRight: '10px' }}
                      />
                      Trade Notifications
                    </label>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: '#4ade80',
                    color: '#242424',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div>
            <div style={{
              background: 'rgba(45, 27, 105, 0.3)',
              borderRadius: '16px',
              padding: '25px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ 
                color: '#f1f1f1', 
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '1.75rem'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Identity Verification
              </h2>
            
              <div style={{
                backgroundColor: '#333',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#4ade80', marginBottom: '10px' }}>Verification Status</h3>
                <p style={{ color: '#f1f1f1' }}>
                  Current verification level: {profile?.verificationLevel === 0 ? 'Not verified' : 
                  profile?.verificationLevel === 1 ? 'Email verified' :
                  profile?.verificationLevel === 2 ? 'Phone verified' :
                  profile?.verificationLevel === 3 ? 'ID verified' : 'Unknown'}
                </p>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '20px',
                  gap: '15px'
                }}>
                  <div style={{
                    flex: 1,
                    padding: '15px',
                    textAlign: 'center',
                    backgroundColor: profile?.verificationLevel >= 1 
                      ? 'rgba(74, 222, 128, 0.2)' 
                      : 'rgba(45, 27, 105, 0.2)',
                    borderRadius: '12px',
                    border: profile?.verificationLevel >= 1 
                      ? '1px solid rgba(74, 222, 128, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: profile?.verificationLevel >= 1 
                      ? '0 8px 16px rgba(74, 222, 128, 0.2)' 
                      : 'none'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '10px' 
                    }}>
                      <span style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: profile?.verificationLevel >= 1 
                          ? 'rgba(74, 222, 128, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        color: profile?.verificationLevel >= 1 ? '#4ade80' : '#9ca3af'
                      }}>
                        {profile?.verificationLevel >= 1 ? '✓' : '1'}
                      </span>
                    </div>
                    <p style={{ 
                      color: profile?.verificationLevel >= 1 ? '#4ade80' : '#f1f1f1', 
                      margin: '0',
                      fontWeight: '600'
                    }}>Level 1</p>
                    <p style={{ 
                      color: profile?.verificationLevel >= 1 ? '#4ade80' : '#aaa', 
                      margin: '5px 0 0 0', 
                      fontSize: '0.9rem' 
                    }}>Email</p>
                  </div>
                  
                  <div style={{
                    flex: 1,
                    padding: '15px',
                    textAlign: 'center',
                    backgroundColor: profile?.verificationLevel >= 2 
                      ? 'rgba(74, 222, 128, 0.2)' 
                      : 'rgba(45, 27, 105, 0.2)',
                    borderRadius: '12px',
                    border: profile?.verificationLevel >= 2 
                      ? '1px solid rgba(74, 222, 128, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: profile?.verificationLevel >= 2 
                      ? '0 8px 16px rgba(74, 222, 128, 0.2)' 
                      : 'none'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '10px' 
                    }}>
                      <span style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: profile?.verificationLevel >= 2 
                          ? 'rgba(74, 222, 128, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        color: profile?.verificationLevel >= 2 ? '#4ade80' : '#9ca3af'
                      }}>
                        {profile?.verificationLevel >= 2 ? '✓' : '2'}
                      </span>
                    </div>
                    <p style={{ 
                      color: profile?.verificationLevel >= 2 ? '#4ade80' : '#f1f1f1', 
                      margin: '0',
                      fontWeight: '600'
                    }}>Level 2</p>
                    <p style={{ 
                      color: profile?.verificationLevel >= 2 ? '#4ade80' : '#aaa', 
                      margin: '5px 0 0 0', 
                      fontSize: '0.9rem' 
                    }}>Phone</p>
                  </div>
                  
                  <div style={{
                    flex: 1,
                    padding: '15px',
                    textAlign: 'center',
                    backgroundColor: profile?.verificationLevel >= 3 
                      ? 'rgba(74, 222, 128, 0.2)' 
                      : 'rgba(45, 27, 105, 0.2)',
                    borderRadius: '12px',
                    border: profile?.verificationLevel >= 3 
                      ? '1px solid rgba(74, 222, 128, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: profile?.verificationLevel >= 3 
                      ? '0 8px 16px rgba(74, 222, 128, 0.2)' 
                      : 'none'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '10px' 
                    }}>
                      <span style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: profile?.verificationLevel >= 3 
                          ? 'rgba(74, 222, 128, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        color: profile?.verificationLevel >= 3 ? '#4ade80' : '#9ca3af'
                      }}>
                        {profile?.verificationLevel >= 3 ? '✓' : '3'}
                      </span>
                    </div>
                    <p style={{ 
                      color: profile?.verificationLevel >= 3 ? '#4ade80' : '#f1f1f1', 
                      margin: '0',
                      fontWeight: '600'
                    }}>Level 3</p>
                    <p style={{ 
                      color: profile?.verificationLevel >= 3 ? '#4ade80' : '#aaa', 
                      margin: '5px 0 0 0', 
                      fontSize: '0.9rem' 
                    }}>ID</p>
                  </div>
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#333',
                padding: '15px',
                borderRadius: '8px'
              }}>
                <h3 style={{ color: '#4ade80', marginBottom: '10px' }}>Required for higher limits</h3>
                <p style={{ color: '#f1f1f1' }}>
                  Complete identity verification to increase your wallet limits:
                </p>
                <ul style={{ color: '#f1f1f1', paddingLeft: '20px' }}>
                  <li>Level 1 (Email): $1,000 monthly limit</li>
                  <li>Level 2 (Phone): $10,000 monthly limit</li>
                  <li>Level 3 (ID): $50,000 monthly limit</li>
                </ul>
                
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
                    color: '#0f1729',
                    border: 'none',
                    padding: '15px 25px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    width: '100%',
                    marginTop: '25px',
                    fontSize: '1rem',
                    boxShadow: '0 8px 16px rgba(74, 222, 128, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  Start Verification Process
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;