import React, { useState, useEffect, Suspense, createContext, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import socketService from './services/socketService';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import TradeDetailPage from './pages/TradeDetailPage';
import Notifications from './pages/Notifications';
import TradeUrlPrompt from './components/TradeUrlPrompt';
import NotificationPopup from './components/NotificationPopup';

// Components
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

// Page wrapper (removed animations)
const PageWrapper = ({ children }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

// Create contexts
export const UserContext = createContext(null);
export const SocketContext = createContext(null);
export const NotificationContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showTradeUrlPrompt, setShowTradeUrlPrompt] = useState(false);
  const socketRef = useRef(null);
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

  // Initialize Socket.IO connection
  useEffect(() => {
    const fetchUserAndConnectSocket = async () => {
      try {
        setLoading(true);
        
        // Try to get user info using token
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          const response = await axios.get(`${API_URL}/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setUser(response.data);
            
            // Check if user has a tradeUrl set
            if (response.data.settings && !response.data.settings.tradeUrl) {
              setShowTradeUrlPrompt(true);
            }
            
            // Connect Socket.IO with token
            if (!socketRef.current) {
              const socketConnection = io(API_URL, {
                query: { token },
                transports: ['websocket', 'polling']
              });
              
              socketConnection.on('connect', () => {
                console.log('Socket.IO connected');
              });
              
              socketConnection.on('disconnect', () => {
                console.log('Socket.IO disconnected');
              });
              
              socketConnection.on('notification', (data) => {
                console.log('Received notification:', data);
                showNotification(data.title, data.message, data.type);
              });
              
              socketRef.current = socketConnection;
              setSocket(socketConnection);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndConnectSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);
  
  // Function to handle user authentication callback
  const handleAuthCallback = async (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      try {
        const response = await axios.get(`${API_URL}/user/profile`);
        setUser(response.data);
        
        // Check if user has a tradeUrl set
        if (response.data.settings && !response.data.settings.tradeUrl) {
          setShowTradeUrlPrompt(true);
        }
      } catch (error) {
        console.error('Error fetching user profile after auth:', error);
      }
    }
  };
  
  // Create a global notification function
  const showNotification = (title, message, type = 'INFO') => {
    setNotification({
      id: Date.now(),
      title,
      message,
      type
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };
  
  // Add showNotification to window for global access
  useEffect(() => {
    window.showNotification = showNotification;
    
    return () => {
      delete window.showNotification;
    };
  }, []);
  
  // Handle trade URL update
  const handleTradeUrlSave = async (tradeUrl) => {
    if (user) {
      try {
        // Update user state locally to reflect the new trade URL
        setUser(prevUser => ({
          ...prevUser,
          settings: {
            ...prevUser.settings,
            tradeUrl
          }
        }));
        
        showNotification('Trade URL Saved', 'Your Steam trade URL has been saved successfully.', 'SUCCESS');
      } catch (error) {
        console.error('Error updating user with trade URL:', error);
      }
    }
  };
  
  // Check URL for token param on load
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');
    
    if (token) {
      handleAuthCallback(token);
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // AuthCallback component that handles redirects with token
  const AuthCallback = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
      const queryParams = new URLSearchParams(window.location.search);
      const token = queryParams.get('token');
      
      if (token) {
        handleAuthCallback(token);
        navigate('/');
      } else {
        navigate('/');
      }
    }, [navigate]);
    
    return <div className="loading">Authenticating...</div>;
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <SocketContext.Provider value={socket}>
        <NotificationContext.Provider value={{ showNotification }}>
          <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Navbar user={user} onLogout={handleLogout} />
            
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
              `}
            </style>
            
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '80vh'
              }}>
                <div 
                  className="spinner"
                  style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    borderTopColor: '#4ade80',
                    animation: 'spin 1s linear infinite'
                  }}
                />
              </div>
            }>
              {loading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '80vh',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  <div 
                    className="spinner"
                    style={{
                      width: '80px',
                      height: '80px',
                      border: '4px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%',
                      borderTopColor: '#4ade80',
                      borderRightColor: 'rgba(56, 189, 248, 0.5)',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <p
                    style={{ 
                      color: '#e2e8f0', 
                      fontSize: '1.2rem',
                      fontWeight: '500',
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
                  
                  <Route path="/notifications" element={
                    <ProtectedRoute user={user}>
                      <PageWrapper key="notifications">
                        <Notifications />
                      </PageWrapper>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </Suspense>
            
            {/* Notification Popup */}
            {notification && (
              <NotificationPopup
                id={notification.id}
                title={notification.title}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(null)}
              />
            )}
            
            {/* Trade URL Prompt */}
            {showTradeUrlPrompt && (
              <TradeUrlPrompt
                onClose={() => setShowTradeUrlPrompt(false)}
                onSuccess={handleTradeUrlSave}
              />
            )}
          </div>
        </NotificationContext.Provider>
      </SocketContext.Provider>
    </UserContext.Provider>
  );
}

export default App;
