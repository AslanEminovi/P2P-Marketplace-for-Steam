import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import socketService from './services/socketService';
import { Toaster } from 'react-hot-toast';
import AdminTools from './pages/AdminTools';
import { css } from '@emotion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SocketConnectionIndicator from './components/SocketConnectionIndicator';
import LiveActivityFeed from './components/LiveActivityFeed';
import { AuthProvider, useAuth } from './context/AuthContext';
import SteamRegistrationModal from './components/SteamRegistrationModal';
import TradeTrackingPanelManager from './components/TradeTrackingPanelManager';
import TradePanel from './components/TradePanel';

// Pages
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import TradeDetailPage from './pages/TradeDetailPage';
import SteamSettingsPage from './pages/SteamSettings';
import Trades from './pages/Trades';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Wallet from './pages/Wallet';

// Components
import SteamSettings from './components/SteamSettings';
import NotificationCenter from './components/NotificationCenter';
import LanguageSwitcher from './components/LanguageSwitcher';
import PageWrapper from './components/PageWrapper';
import ScrollToTop from './components/ScrollToTop';
import ContactUs from './pages/ContactUs';

// Import constants
import { API_URL } from './config/constants';

// Import the axiosConfig
import apiClient, { fetchUserDetails } from './services/axiosConfig';

// Auth-protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Admin-protected route component
const AdminRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || !user || !user.isAdmin) {
    console.log("AdminRoute - Access denied, redirecting to home");
    return <Navigate to="/" replace />;
  }
  
  console.log("AdminRoute - Access granted");
  return children;
};

const loadingScreenStyles = css`
  .loading-screen-background {
    background: var(--gaming-bg-dark);
    background-image: 
      radial-gradient(circle at 20% 35%, rgba(76, 44, 166, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 60%, rgba(56, 189, 248, 0.1) 0%, transparent 40%);
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
    transition: opacity 0.5s ease-in-out;
  }
`;

function AppContent() {
  const { user, isAuthenticated, loading, logout, updateUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showConnectionIndicator, setShowConnectionIndicator] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const navigate = useNavigate();
  const [userState, setUserState] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradePanelAction, setTradePanelAction] = useState(null);
  const [tradePanelItem, setTradePanelItem] = useState(null);

  // Function to show a notification
  window.showNotification = (title, message, type = 'INFO', timeout = 5000) => {
    const id = Date.now().toString();
    const notification = { id, title, message, type, timeout };
    setNotifications(prev => [...prev, notification]);
    return id;
  };

  // Function to close a notification
  window.closeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Function to handle opening the TradePanel programmatically from anywhere
  const openTradePanel = (options = {}) => {
    console.log('Opening TradePanel with options:', options);
    
    // Set the appropriate state based on options
    setTradePanelItem(options.item || null);
    setTradePanelAction(options.action || 'offers');
    
    // If there's a specific tab to focus on, store it for the TradePanel
    if (options.activeTab) {
      localStorage.setItem('tradePanelActiveTab', options.activeTab);
    }
    
    // Open the panel
    setTradePanelOpen(true);
  };
  
  // Attach the function to the window object to allow global access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openTradePanel = openTradePanel;
      
      // Also listen for custom events to open the panel
      const handleOpenTradePanelEvent = (event) => {
        if (event.detail) {
          openTradePanel(event.detail);
        }
      };
      
      window.addEventListener('openTradePanel', handleOpenTradePanelEvent);
      
      return () => {
        // Clean up
        delete window.openTradePanel;
        window.removeEventListener('openTradePanel', handleOpenTradePanelEvent);
      };
    }
  }, []);
  
  // Listen for socket events that should trigger the trade panel to open
  useEffect(() => {
    if (socketService.isConnected() && isAuthenticated) {
      const handleOfferUpdate = (data) => {
        console.log('Socket offer update received in App:', data);
        
        // Automatically open the trade panel for new offers if it's not already open
        if (data.type === 'new_offer_received' && !tradePanelOpen) {
          // Show notification first
          window.showNotification(
            'New Offer Received',
            `You received a new offer for ${data.itemName || 'an item'}`,
            'INFO',
            10000, // longer timeout
            () => openTradePanel({ action: 'offers', activeTab: 'received' })
          );
        }
        
        // For counter offers, also show a notification with option to open panel
        if (data.type === 'counter_offer') {
          window.showNotification(
            'Counter Offer Received',
            `${data.senderName || 'Someone'} has made a counter offer of ${data.counterAmount} ${data.counterCurrency || 'USD'}`,
            'INFO',
            10000,
            () => openTradePanel({ action: 'offers', activeTab: 'received' })
          );
        }
      };
      
      socketService.on('offer_update', handleOfferUpdate);
      
      return () => {
        socketService.off('offer_update', handleOfferUpdate);
      };
    }
  }, [socketService, isAuthenticated, tradePanelOpen]);

  // Setup Axios interceptors
  useEffect(() => {
    // Request interceptor for API calls
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        // Only add token to requests to our API
        if (config.url && config.url.startsWith(API_URL)) {
          const token = localStorage.getItem('auth_token');
          console.log("Axios interceptor - token exists:", !!token);

          if (token) {
            // Set up query parameters if they don't exist
            if (!config.params) {
              config.params = {};
            }

            // Add token to query params - this is the most reliable way to pass it
            // especially for Steam-related authentication
            config.params.auth_token = token;

            // Also add token as Authorization header for better compatibility
            if (!config.headers) {
              config.headers = {};
            }
            config.headers.Authorization = `Bearer ${token}`;

            console.log("Added auth token to request:", config.url);
          } else {
            console.log("No auth token available for request:", config.url);
          }

          // Always ensure this is set for CORS
          config.withCredentials = true;
        }
        return config;
      },
      error => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for API calls
    const responseInterceptor = axios.interceptors.response.use(
      response => {
        return response;
      },
      async error => {
        // Handle 401 Unauthorized errors, which might indicate an invalid token
        if (error.response && error.response.status === 401) {
          console.error('Authentication error (401):', error.response.data);

          // Check if this is the /auth/user endpoint
          if (error.config.url && error.config.url.includes('/auth/user')) {
            console.log('User not authenticated. Please log in with Steam.');
          } else {
            // Show error message for other endpoints
            window.showNotification(
              'Error',
              'Session expired. Please log in again.',
              'ERROR'
            );
          }
        }
        return Promise.reject(error);
      }
    );

    // Initialize socket connection
    if (!socketService.isConnected) {
      socketService.init();
    }

    // Cleanup function to remove interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Handle socket connection status
  useEffect(() => {
    const handleConnectionStatus = (status) => {
      console.log('Socket connection status update:', status);
      setSocketConnected(status.connected);

      // Only show connection indicator when disconnected
      if (!status.connected && !status.connecting) {
        setShowConnectionIndicator(true);
      } else if (status.connected) {
        // Hide indicator after a delay when connected
        setTimeout(() => {
          setShowConnectionIndicator(false);
        }, 3000);
      }
    };

    // Set up socket notification listener
    const handleNotification = (data) => {
      if (data && data.title && data.message) {
        window.showNotification(
          data.title,
          data.message,
          data.type || 'INFO',
          data.timeout || 5000
        );
      }
    };

    // Register listeners
    socketService.on('connection_status', handleConnectionStatus);
    socketService.on('notification', handleNotification);

    // Initial connection if needed
    if (!socketService.isConnected()) {
      // Add a small delay before initial connection to prevent race conditions
      setTimeout(() => {
        socketService.connect();
      }, 100);
    }

    // Cleanup on unmount
    return () => {
      socketService.off('connection_status', handleConnectionStatus);
      socketService.off('notification', handleNotification);
      // Don't disconnect on unmount as it might be a route change
      // Only disconnect if the app is actually being closed
      if (window.isUnloading) {
        socketService.disconnect();
      }
    };
  }, []);

  // Add window unload handler
  useEffect(() => {
    const handleUnload = () => {
      window.isUnloading = true;
      socketService.disconnect();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Refresh wallet balance (Used by Wallet and Profile pages)
  const refreshWalletBalance = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/wallet/balance`, { 
        withCredentials: true 
      });
      
      if (response.data && response.data.success) {
        // Update user balance in state with the new balance
        updateUser({
          walletBalance: response.data.balance,
          walletBalanceGEL: response.data.balanceGEL,
        });
      }
    } catch (error) {
      console.error('Error refreshing wallet balance:', error);
    }
  };

  // Check if user needs to complete registration after Steam auth
  useEffect(() => {
    if (user && user.steamId && !user.profileComplete && isAuthenticated) {
      setShowRegistrationModal(true);
    } else {
      setShowRegistrationModal(false);
    }
  }, [user, isAuthenticated]);

  // Handle registration completion
  const handleRegistrationComplete = (updatedUser) => {
    updateUser(updatedUser);
    setShowRegistrationModal(false);
  };

  // Set up global function to update user state from anywhere in the app
  useEffect(() => {
    // Create a function to update user state globally
    window.updateGlobalUser = (updatedUserData) => {
      console.log("Global user update called with:", updatedUserData);
      
      // Create a complete merged user object that preserves all fields
      const completeUser = {
        ...(user || {}),
        ...updatedUserData,
        // Explicitly handle email updates as these are most likely to be problematic
        email: updatedUserData.email || user?.email
      };
      
      console.log("Setting user state to:", completeUser);
      
      // Update local state
      setUserState(completeUser);
      
      // Update context if available
      if (updateUser) {
        updateUser(completeUser);
      }
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem('user_data_backup', JSON.stringify(completeUser));
      } catch (err) {
        console.error("Failed to store user data in localStorage:", err);
      }
      
      return completeUser; // Return the updated user object
    };
    
    // Component cleanup
    return () => {
      delete window.updateGlobalUser;
    };
  }, [user, updateUser]);
  
  // Function to fetch user profile data directly
  const fetchUserProfile = async () => {
    try {
      console.log("App: Fetching fresh user data");
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
      
      if (response.data && response.data.authenticated && response.data.user) {
        console.log("App: Received fresh user data:", response.data.user);
        const freshUserData = response.data.user;
        
        // Update user in AuthContext
        if (updateUser) {
          updateUser(freshUserData);
        }
        
        // Update local state
        setUserState(prevState => ({
          ...prevState,
          ...freshUserData
        }));
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Function to close trade panel
  const closeTradePanelHandler = () => {
    setTradePanelOpen(false);
  };

  return (
    <PageWrapper>
      <ScrollToTop />
      <div css={loadingScreenStyles}>
        {loading && (
          <div className="loading-screen-background">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        )}
      </div>
      <div className="app-container">
        <Toaster position="top-right" />
        <Navbar user={user} onLogout={handleLogout} openOffersPanel={openTradePanel} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/inventory" element={<ProtectedRoute>
              <Inventory user={user} />
            </ProtectedRoute>} />
            <Route path="/marketplace" element={<Marketplace user={user} />} />
            <Route path="/my-listings" element={<ProtectedRoute>
              <MyListings user={user} />
            </ProtectedRoute>} />
            <Route path="/settings/steam" element={<ProtectedRoute>
              <SteamSettings user={user} />
            </ProtectedRoute>} />
            <Route path="/trades" element={<ProtectedRoute>
              <Trades user={user} />
            </ProtectedRoute>} />
            <Route path="/trades/:tradeId" element={<ProtectedRoute>
              <TradeDetailPage user={user} />
            </ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute>
              <Profile user={user} onBalanceUpdate={refreshWalletBalance} />
            </ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute>
              <Settings user={user} onBalanceUpdate={refreshWalletBalance} />
            </ProtectedRoute>} />
            <Route path="/steam-settings" element={<ProtectedRoute>
              <SteamSettingsPage />
            </ProtectedRoute>} />
            <Route path="/admin/tools" element={<AdminRoute>
              <AdminTools />
            </AdminRoute>} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/wallet" element={<ProtectedRoute>
              <Wallet user={user} onBalanceUpdate={refreshWalletBalance} />
            </ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <LiveActivityFeed />
      
      {/* Steam Registration Modal */}
      {showRegistrationModal && user && (
        <SteamRegistrationModal 
          user={user}
          onClose={() => setShowRegistrationModal(false)} 
          onComplete={handleRegistrationComplete}
        />
      )}
      
      {/* Trade Tracking Panel Manager */}
      <TradeTrackingPanelManager />

      {/* Trade Panel */}
      <TradePanel
        isOpen={tradePanelOpen}
        onClose={closeTradePanelHandler}
        item={tradePanelItem}
        action={tradePanelAction}
        onComplete={(data) => {
          // Handle completion (e.g., show notification)
          setTradePanelOpen(false);
        }}
      />
    </PageWrapper>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
