import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import socketService from './services/socketService';
import { Toaster } from 'react-hot-toast';
import AdminTools from './pages/AdminTools';
import { css } from '@emotion/react';

// Pages
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import TradeDetailPage from './pages/TradeDetailPage';
import SteamSettingsPage from './pages/SteamSettings';

// Components
import Navbar from './components/Navbar';
import SteamSettings from './components/SteamSettings';
import TradeHistory from './components/TradeHistory';
import NotificationCenter from './components/NotificationCenter';
import LanguageSwitcher from './components/LanguageSwitcher';

// Import constants
import { API_URL } from './config/constants';

// Auth-protected route component
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Admin-protected route component
const AdminRoute = ({ user, children }) => {
  console.log("AdminRoute check - User:", user);
  console.log("AdminRoute check - isAdmin:", user?.isAdmin);

  if (!user || !user.isAdmin) {
    console.log("AdminRoute - Access denied, redirecting to home");
    return <Navigate to="/" replace />;
  }
  console.log("AdminRoute - Access granted");
  return children;
};

// Page wrapper (removed animations)
const PageWrapper = ({ children }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

const loadingScreenStyles = css`
  .loading-screen-background {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)),
                url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23374151' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: opacity 0.5s ease-in-out; /* Longer transition */
  }
`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showConnectionIndicator, setShowConnectionIndicator] = useState(true);

  // Configure Axios to include auth token with all requests
  useEffect(() => {
    // Add request interceptor to include token with all requests
    const interceptor = axios.interceptors.request.use(config => {
      // Always include withCredentials
      config.withCredentials = true;

      // Get token from localStorage
      const token = localStorage.getItem('auth_token');

      // If token exists, include it in query params
      if (token) {
        // Include token in URL if it's to our API
        if (config.url.startsWith(API_URL)) {
          // Initialize params object if not exists
          config.params = config.params || {};
          // Add token to params
          config.params.auth_token = token;
        }
      }

      return config;
    });

    // Remove interceptor on cleanup
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      console.log("Checking auth status, API URL:", API_URL);

      // Check for auth token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');

      if (authToken) {
        console.log("Found auth token in URL, verifying...");
        // Remove token from URL to prevent bookmarking with token
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          // Verify token with backend
          console.log("Verifying token with backend...");
          const verifyResponse = await axios.post(
            `${API_URL}/auth/verify-token`, 
            { token: authToken }, 
            { 
              withCredentials: true,
              timeout: 10000 // 10 second timeout for token verification
            }
          );
          
          console.log("Token verification response:", verifyResponse.data);

          if (verifyResponse.data && verifyResponse.data.authenticated) {
            console.log("Token verified, user authenticated:", verifyResponse.data.user);
            
            // Store token in localStorage first
            localStorage.setItem('auth_token', authToken);
            
            // Then set user state
            setUser(verifyResponse.data.user);

            // Show success notification
            if (window.showNotification) {
              window.showNotification(
                t('common.signIn'),
                t('common.success'),
                'SUCCESS'
              );
            }

            setLoading(false);
            return;
          } else {
            console.warn("Token verification failed, response:", verifyResponse.data);
            // Token verification failed but still returned a response
            localStorage.removeItem('auth_token');
          }
        } catch (verifyError) {
          console.error("Token verification request failed:", verifyError);
          
          // If there was a network error, we can't be sure if the token is valid or not
          // Store the token anyway and we'll verify it on the next page load
          if (verifyError.code === 'ECONNABORTED' || !verifyError.response) {
            console.log("Network error during verification, storing token for retry");
            localStorage.setItem('auth_token', authToken);
            
            // Force a page reload to retry with the stored token
            console.log("Reloading page to retry authentication...");
            window.location.reload();
            return;
          }
          
          // Otherwise, clear the token
          localStorage.removeItem('auth_token');
        }
      }

      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        console.log("Found stored token, verifying...");

        try {
          console.log("Verifying stored token with backend...");
          const verifyResponse = await axios.post(
            `${API_URL}/auth/verify-token`, 
            { token: storedToken }, 
            { 
              withCredentials: true,
              timeout: 10000 // 10 second timeout for token verification
            }
          );
          
          console.log("Stored token verification response:", verifyResponse.data);

          if (verifyResponse.data && verifyResponse.data.authenticated) {
            console.log("Stored token verified, user authenticated:", verifyResponse.data.user);
            setUser(verifyResponse.data.user);
            setLoading(false);
            return;
          } else {
            // Token is invalid, remove it
            console.log("Stored token is invalid, removing...");
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error("Stored token verification failed:", error);
          
          // Only remove the token if we got a clear rejection from the server
          if (error.response && error.response.status >= 400) {
            localStorage.removeItem('auth_token');
          } else {
            // For network errors, we'll try the session-based auth as fallback
            console.log("Network error during stored token verification, trying session auth...");
          }
        }
      }

      // If we reach here, try the regular session-based auth as fallback
      try {
        console.log("Trying session-based auth as fallback...");
        const res = await axios.get(`${API_URL}/auth/user`, {
          withCredentials: true,
          timeout: 10000 // 10 second timeout
        });
        
        console.log("Auth response:", res.data);

        if (res.data && res.data.authenticated) {
          console.log("User authenticated via session:", res.data.user);
          // Make sure avatar property is available for the Navbar component
          const userData = {
            ...res.data.user,
            // Add any missing properties if needed
          };
          console.log("Setting user data:", userData);
          setUser(userData);
        } else {
          console.log("User not authenticated");
          setUser(null);
        }
      } catch (err) {
        console.error("Session auth check failed:", err);
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("Logout process started");
      
      // Set loading state to true to prevent double-clicks
      setLoading(true);
      
      // Disconnect all websockets first
      console.log("Disconnecting websockets...");
      socketService.disconnect();
      
      // Clear all auth tokens from localStorage
      console.log("Clearing localStorage tokens...");
      localStorage.removeItem('auth_token');
      
      // Reset user state to null
      console.log("Resetting user state...");
      setUser(null);
      
      // Make the logout API call to clear server-side session and cookies
      console.log("Sending logout request to server...");
      try {
        await axios.get(`${API_URL}/auth/logout`, { 
          withCredentials: true,
          timeout: 5000 // 5 second timeout
        });
        console.log("Server logout successful");
      } catch (apiError) {
        console.error('Logout API error:', apiError);
        // Continue with client-side logout even if server request fails
      }
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          t('common.signOut'),
          t('common.success'),
          'SUCCESS'
        );
      }

      // Force a complete page reload rather than using React Router
      // This ensures all React state is completely reset
      console.log("Redirecting to homepage...");
      setTimeout(() => {
        window.location.href = '/';
      }, 300); // Slightly longer delay to ensure notification is seen
      
    } catch (err) {
      console.error('Logout error:', err);
      
      // Even if there's an error, still force logout
      console.log("Disconnecting websockets due to error...");
      socketService.disconnect();
      
      localStorage.removeItem('auth_token');
      setUser(null);
      
      // Force reload with slight delay
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } finally {
      // Ensure loading state is reset if the page doesn't reload for some reason
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Get wallet balance from API
  const refreshWalletBalance = async () => {
    if (user) {
      try {
        const response = await axios.get(`${API_URL}/wallet/balance`, { withCredentials: true });
        if (response.data) {
          setUser({
            ...user,
            walletBalance: response.data.balance.USD,
            walletBalanceGEL: response.data.balance.GEL
          });
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    }
  };

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize WebSocket connection
      socketService.init();

      // Setup event listeners
      const handleConnectionStatus = (status) => {
        setSocketConnected(status.connected);
        console.log('WebSocket connection status:', status);
      };

      const handleNotification = (notification) => {
        // Add the notification to state
        setNotifications(prevNotifications => [notification, ...prevNotifications]);

        // Show notification UI if available
        if (window.showNotification) {
          window.showNotification(
            notification.title,
            notification.message,
            notification.type === 'trade' ? 'INFO' : 'SUCCESS'
          );
        }
      };

      const handleTradeUpdate = (tradeData) => {
        console.log('Trade update:', tradeData);

        // Create a notification with a valid type
        const notification = {
          type: 'trade',
          title: 'Trade Update',
          message: `Your trade #${tradeData.tradeId} status has been updated to: ${tradeData.status}`,
          read: false,
          link: `/trades/${tradeData.tradeId}`,
          createdAt: new Date()
        };

        // Add the notification to state
        setNotifications(prevNotifications => [notification, ...prevNotifications]);

        // Show notification UI if available
        if (window.showNotification) {
          window.showNotification(
            notification.title,
            notification.message,
            'INFO'
          );
        }

        // Implement trade update logic - you might need to update the trade list
        // or refresh data in the current page if it's a trade page
      };

      const handleInventoryUpdate = (inventoryData) => {
        console.log('Inventory update:', inventoryData);
        // If user is on the inventory page, you might want to trigger a refresh
      };

      const handleWalletUpdate = (walletData) => {
        console.log('Wallet update:', walletData);
        // Update user's wallet balance
        setUser(prevUser => ({
          ...prevUser,
          walletBalance: walletData.balance,
          walletBalanceGEL: walletData.balanceGEL
        }));
      };

      const handleMarketUpdate = (marketData) => {
        console.log('Market update:', marketData);
        // If user is on the marketplace page, you might want to trigger a refresh
        // or update specific items in the list
      };

      // Register all event listeners
      const unsubscribeConnectionStatus = socketService.on('connection_status', handleConnectionStatus);
      const unsubscribeNotification = socketService.on('notification', handleNotification);
      const unsubscribeTradeUpdate = socketService.on('trade_update', handleTradeUpdate);
      const unsubscribeInventoryUpdate = socketService.on('inventory_update', handleInventoryUpdate);
      const unsubscribeWalletUpdate = socketService.on('wallet_update', handleWalletUpdate);
      const unsubscribeMarketUpdate = socketService.on('market_update', handleMarketUpdate);

      // Add a heartbeat to check connection status periodically
      const connectionCheckInterval = setInterval(() => {
        const isConnected = socketService.isSocketConnected();
        if (!isConnected) {
          console.log('Connection check: WebSocket disconnected, attempting to reconnect...');
          socketService.reconnect();
        } else {
          console.log('Connection check: WebSocket connected');
        }
      }, 30000); // Check every 30 seconds

      // Clean up function to remove all listeners when component unmounts
      return () => {
        unsubscribeConnectionStatus();
        unsubscribeNotification();
        unsubscribeTradeUpdate();
        unsubscribeInventoryUpdate();
        unsubscribeWalletUpdate();
        unsubscribeMarketUpdate();

        // Clear the heartbeat interval
        clearInterval(connectionCheckInterval);

        // Disconnect socket when user logs out or component unmounts
        socketService.disconnect();
      };
    }
  }, [user]);

  // Fetch wallet balance when user is loaded
  useEffect(() => {
    if (user) {
      refreshWalletBalance();
    }
  }, [user]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.5s ease-out'
    }}>
      <Navbar user={user} onLogout={handleLogout} />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: {
              background: '#166534',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#991b1b',
              color: '#fff',
            },
          },
          warning: {
            duration: 4000,
            style: {
              background: '#854d0e',
              color: '#fff',
            },
          },
        }}
      />

      {/* Connection status indicator */}
      {showConnectionIndicator && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
            backgroundColor: socketConnected ? '#4ade80' : 'rgba(239, 68, 68, 0.7)', // Make red less harsh with transparency
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            transition: 'all 0.5s ease',
            opacity: showConnectionIndicator ? 0.8 : 0,
            pointerEvents: 'auto', // Changed from 'none' to 'auto' to allow clicks
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{socketConnected ? t('app.connected') : t('app.disconnected')}</span>
          {!socketConnected && (
            <button
              onClick={() => {
                console.log("Manual reconnection requested by user");
                socketService.reconnect();
              }}
              style={{
                background: 'none',
                border: '1px solid white',
                borderRadius: '3px',
                padding: '1px 4px',
                fontSize: '10px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {t('app.reconnect')}
            </button>
          )}
        </div>
      )}

      {/* Background patterns */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(74, 222, 128, 0.05) 0%, transparent 60%), radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1); }
          }
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .loading-text {
            animation: pulse 2s ease-in-out infinite;
          }
          .loading-screen-background {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)),
                        url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23374151' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: opacity 0.5s ease-in-out; /* Longer transition */
          }
        `}
      </style>

      {/* These UI controls will be moved to the Navbar */}

      <Suspense fallback={
        <div className="loading-screen-background" style={{
          opacity: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          transition: 'opacity 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px'
          }}>
            <div className="gradient-border" style={{
              width: '80px',
              height: '80px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '15px',
              borderRadius: '50%',
              background: '#0F172A'
            }}>
              <div
                className="spinner"
                style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  borderTopColor: '#4ade80',
                  borderRightColor: 'rgba(124, 58, 237, 0.7)',
                  boxShadow: '0 0 15px rgba(124, 58, 237, 0.3)'
                }}
              />
            </div>
            <p className="loading-text" style={{
              color: '#e2e8f0',
              fontSize: '1.2rem',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              {t('common.loading')}
            </p>
          </div>
        </div>
      }>
        {loading ? (
          <div className="loading-screen-background" style={{
            opacity: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            flexDirection: 'column',
            gap: '30px',
            transition: 'opacity 0.3s ease-out'
          }}>
            <div className="loading-logo" style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 20px rgba(124, 58, 237, 0.3)'
            }}>
              CS2 Marketplace
            </div>
            <div className="gradient-border" style={{
              width: '90px',
              height: '90px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '15px',
              borderRadius: '50%',
              background: '#0F172A'
            }}>
              <div
                className="spinner"
                style={{
                  width: '70px',
                  height: '70px',
                  border: '4px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  borderTopColor: '#4ade80',
                  borderRightColor: 'rgba(124, 58, 237, 0.7)',
                  borderBottomColor: 'rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)'
                }}
              />
            </div>
            <p className="loading-text"
              style={{
                color: '#e2e8f0',
                fontSize: '1.5rem',
                fontWeight: '600',
                letterSpacing: '0.05em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
              }}
            >
              {t('common.loading')}
            </p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={
              <PageWrapper key="home">
                <Home user={user} />
              </PageWrapper>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="inventory">
                  <Inventory user={user} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/marketplace" element={
              <PageWrapper key="marketplace">
                <Marketplace user={user} />
              </PageWrapper>
            } />

            <Route path="/my-listings" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="my-listings">
                  <MyListings user={user} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/settings/steam" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="steam-settings">
                  <SteamSettings user={user} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/trades" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trades">
                  <TradeHistory user={user} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/trades/:tradeId" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trade-detail">
                  <TradeDetailPage user={user} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="profile">
                  <Profile user={user} onBalanceUpdate={refreshWalletBalance} />
                </PageWrapper>
              </ProtectedRoute>
            } />

            <Route path="/steam-settings" element={
              <ProtectedRoute>
                <SteamSettingsPage />
              </ProtectedRoute>
            } />

            <Route path="/admin/tools" element={
              <AdminRoute user={user}>
                <PageWrapper key="admin-tools">
                  <AdminTools />
                </PageWrapper>
              </AdminRoute>
            } />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Suspense>

      {/* Audio elements will be added later */}
    </div>
  );
}

export default App;
