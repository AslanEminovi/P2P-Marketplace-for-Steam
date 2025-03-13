import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import socketService from './services/socketService';
import { Toaster } from 'react-hot-toast';
import AdminTools from './pages/AdminTools';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

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
import ItemDetails from './components/ItemDetails';
import TradeDetails from './components/TradeDetails';

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        
        // Verify token with backend
        const verifyResponse = await axios.post(`${API_URL}/auth/verify-token`, { token: authToken }, { withCredentials: true });
        
        if (verifyResponse.data.authenticated) {
          console.log("Token verified, user authenticated:", verifyResponse.data.user);
          setUser(verifyResponse.data.user);
          
          // Store token in localStorage for future use
          localStorage.setItem('auth_token', authToken);
          
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
        }
      }
      
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        console.log("Found stored token, verifying...");
        
        try {
          const verifyResponse = await axios.post(`${API_URL}/auth/verify-token`, { token: storedToken }, { withCredentials: true });
          
          if (verifyResponse.data.authenticated) {
            console.log("Stored token verified, user authenticated:", verifyResponse.data.user);
            setUser(verifyResponse.data.user);
            setLoading(false);
            return;
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error("Stored token verification failed:", error);
          localStorage.removeItem('auth_token');
        }
      }
      
      // If we reach here, try the regular session-based auth as fallback
      try {
        const res = await axios.get(`${API_URL}/auth/user`, { 
          withCredentials: true 
        })
        .then(response => {
          console.log("Auth response:", response.data);
          return response;
        })
        .catch(error => {
          console.error("Auth request failed:", error.message);
          if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
            console.error("Response headers:", error.response.headers);
          }
          throw error;
        });
        
        if (res.data.authenticated) {
          console.log("User authenticated via session:", res.data.user);
          setUser(res.data.user);
        } else {
          console.log("User not authenticated");
        }
      } catch (err) {
        console.error("Session auth check failed:", err);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true });
      setUser(null);
      
      // Clear token from localStorage
      localStorage.removeItem('auth_token');
      
      navigate('/');
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          t('common.signOut'),
          t('common.success'),
          'SUCCESS'
        );
      }
    } catch (err) {
      console.error('Logout error:', err);
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
          setWalletBalance(response.data.balance.USD);
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

      // Clean up function to remove all listeners when component unmounts
      return () => {
        unsubscribeConnectionStatus();
        unsubscribeNotification();
        unsubscribeTradeUpdate();
        unsubscribeInventoryUpdate();
        unsubscribeWalletUpdate();
        unsubscribeMarketUpdate();
        
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Navbar user={user} onLogout={handleLogout} walletBalance={walletBalance} />
      
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
      
      {/* WebSocket connection indicator */}
      {user && (
        <div 
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: socketConnected ? '#4ade80' : '#ef4444',
            boxShadow: `0 0 10px ${socketConnected ? 'rgba(74, 222, 128, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
          title={socketConnected ? 'Real-time connection active' : 'Real-time connection inactive'}
        />
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
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), 
                      repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.05) 0px, rgba(99, 102, 241, 0.05) 1px, transparent 1px, transparent 10px);
          }
          .loading-logo {
            animation: pulse 2s ease-in-out infinite;
          }
          .gradient-border {
            position: relative;
          }
          .gradient-border::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #C026D3 100%);
            border-radius: 50%;
            z-index: -1;
            animation: gradientFlow 3s ease infinite;
            background-size: 200% 200%;
          }
        `}
      </style>
      
      {/* These UI controls will be moved to the Navbar */}
      
      <Suspense fallback={
        <div className="loading-screen-background" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100vh',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999
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
            gap: '30px'
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
                  <Inventory />
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
                  <MyListings />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/settings/steam" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="steam-settings">
                  <SteamSettings />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/trades" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trades">
                  <TradeHistory />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/trades/:tradeId" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trade-detail">
                  <TradeDetailPage />
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
            
            <Route path="/item/:id" element={<ItemDetails user={user} />} />
            <Route path="/trade/:id" element={<TradeDetails user={user} />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Suspense>
      
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
