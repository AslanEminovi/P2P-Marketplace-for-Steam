import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import socketService from './services/socketService';
import { Toaster } from 'react-hot-toast';
import AdminTools from './pages/AdminTools';

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
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
        console.log("Including auth token in request:", config.url);
        // Include token in URL if it's to our API
        if (config.url && config.url.startsWith(API_URL)) {
          // Initialize params object if not exists
          config.params = config.params || {};
          // Add token to params
          config.params.auth_token = token;
        }
      }
      
      return config;
    }, error => {
      console.error("Axios request interceptor error:", error);
      return Promise.reject(error);
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
      
      // First try with localStorage token
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        console.log("Found stored token, verifying...");
        
        try {
          const verifyResponse = await axios.post(`${API_URL}/auth/verify-token`, 
            { token: storedToken }, 
            { withCredentials: true }
          );
          
          if (verifyResponse?.data?.authenticated) {
            console.log("Stored token verified, user authenticated:", verifyResponse.data.user);
            setUser(verifyResponse.data.user);
            setLoading(false);
            return;
          } else {
            console.log("Stored token is invalid, removing it");
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error("Stored token verification failed:", error);
          localStorage.removeItem('auth_token');
        }
      } else {
        console.log("No auth token found in localStorage");
      }
      
      // If we reach here, try session-based auth
      try {
        console.log("Trying session-based authentication");
        const res = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
        
        if (res?.data?.authenticated) {
          console.log("User authenticated via session:", res.data.user);
          setUser(res.data.user);
        } else {
          console.log("User not authenticated via session");
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

  // Updated to specifically handle auth_token in URL more robustly
  useEffect(() => {
    const handleAuthToken = async () => {
      console.log("Checking for auth token in URL on initial load");
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');
      
      if (authToken) {
        console.log("Found auth token in URL, storing it");
        // Store token in localStorage
        localStorage.setItem('auth_token', authToken);
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Immediately check auth status
        await checkAuthStatus();
      }
    };
    
    handleAuthToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Separate effect for general auth status check
  useEffect(() => {
    console.log("App component mounted, checking auth status");
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="app-container">
      {/* Background effects - moved to individual pages for better control */}
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace user={user} />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/trades" element={<TradeHistory />} />
        <Route path="/trade-history" element={<TradeHistory />} />
        <Route path="/settings" element={<SteamSettingsPage />} />
        <Route path="/admin" element={<AdminTools />} />
        {/* ... other routes ... */}
      </Routes>
      <Toaster />
    </div>
  );
}

export default App;
