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
import { Spinner } from 'react-bootstrap';

// Pages
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import TradeDetailPage from './pages/TradeDetailPage';
import SteamSettingsPage from './pages/SteamSettings';
import Trades from './pages/Trades';

// Components
import SteamSettings from './components/SteamSettings';
import NotificationCenter from './components/NotificationCenter';
import LanguageSwitcher from './components/LanguageSwitcher';
import PageWrapper from './components/PageWrapper';
import ScrollToTop from './components/ScrollToTop';

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
  // Return children in a special container that won't include the footer
  return (
    <div className="admin-route-container">
      {children}
    </div>
  );
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

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showConnectionIndicator, setShowConnectionIndicator] = useState(false);
  const navigate = useNavigate();

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

  // Replace the existing route change effect with this more comprehensive one
  useEffect(() => {
    const handleRouteChange = () => {
      // Make sure loading state is reset when navigating
      console.log("Route changed, resetting loading state");
      setLoading(false);

      // Also hide any socket connection indicators
      setShowConnectionIndicator(false);

      // Reset any stuck background styles
      document.body.style.backgroundColor = '';

      // Remove any lingering modal-related classes from the body
      document.body.classList.remove('modal-open');

      // Reset any overflow styles that might have been set by modals
      document.body.style.overflow = '';

      // Clear any backdrop or overlay elements
      const backdrops = document.querySelectorAll('.modal-backdrop, .overlay, .backdrop');
      backdrops.forEach(backdrop => {
        if (backdrop && backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
      });

      // Reset any fixed positioning that was applied to the main content
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.style.position = '';
        mainContent.style.top = '';
        mainContent.style.width = '';
      }
    };

    // Listen for navigation events - both History API events and direct clicks
    window.addEventListener('popstate', handleRouteChange);

    // Use a mutation observer to detect when React Router changes the URL without triggering popstate
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          handleRouteChange();
          break;
        }
      }
    });

    // Observe the document body for changes that might indicate a route change
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Add safety: call handleRouteChange immediately when component mounts
    handleRouteChange();

    // Add click listener to detect navigation via direct link clicks
    const handleDocumentClick = (e) => {
      // Find closest anchor element
      let element = e.target;
      while (element && element.tagName !== 'A') {
        element = element.parentElement;
      }

      // If we found an anchor and it's an internal link
      if (element && element.href && element.href.startsWith(window.location.origin)) {
        // Schedule a handleRouteChange after the navigation occurs
        setTimeout(handleRouteChange, 50);
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('click', handleDocumentClick);
      observer.disconnect();
    };
  }, []);

  // Add a new useEffect to clear loading state periodically to prevent stuck states
  useEffect(() => {
    // Immediately clear loading state for initial render
    const initialLoadingClear = setTimeout(() => {
      if (loading) {
        console.log("Initial safety: forcing loading state to false");
        setLoading(false);
      }
    }, 3000); // Give it 3 seconds on first load

    // Safety timeout to reset loading state if it gets stuck
    const safetyResetInterval = setInterval(() => {
      if (loading) {
        console.log("Safety mechanism: resetting stuck loading state");
        setLoading(false);
      }

      // Check for other stuck states
      if (document.body.classList.contains('modal-open') && !document.querySelector('.modal.show')) {
        console.log("Safety mechanism: removing stuck modal-open class");
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }

      // Check for lingering red background
      const computedStyle = window.getComputedStyle(document.body);
      if (computedStyle.backgroundColor === 'rgb(255, 0, 0)' ||
        computedStyle.backgroundColor === 'red' ||
        computedStyle.backgroundColor.includes('rgba(255, 0, 0')) {
        console.log("Safety mechanism: resetting red background");
        document.body.style.backgroundColor = '';
      }
    }, 5000); // Reduce to 5 seconds for faster recovery

    return () => {
      clearTimeout(initialLoadingClear);
      clearInterval(safetyResetInterval);
    };
  }, [loading]);

  // Add more detailed logging in the useEffect for hash handling
  useEffect(() => {
    setLoading(true);
    
    // Debug auth state on page load
    console.log('Initial page load - checking auth state');
    console.log('authToken exists:', !!localStorage.getItem('authToken'));
    console.log('auth_token exists:', !!localStorage.getItem('auth_token'));
    console.log('userFullyAuthenticated:', localStorage.getItem('userFullyAuthenticated'));
    
    // Fix Steam authentication if needed
    const authFixed = fixSteamAuthPersistence();
    if (authFixed) {
      console.log('Auth fix applied successfully');
      return; // Let the fix process handle everything
    }
    
    // Parse hash from URL if present (for auth token)
    const hash = window.location.hash;
    if (hash && hash.includes('auth_token')) {
      try {
        console.log('Found auth token in URL hash, storing it and checking status...');
        // Parse token from hash format (e.g. #auth_token=abc)
        let authToken;
        const authTokenMatch = hash.match(/auth_token=([^&]+)/);
        if (authTokenMatch && authTokenMatch[1]) {
          authToken = authTokenMatch[1];
          console.log('Successfully extracted token from hash');
        } else {
          throw new Error('Could not extract token from hash');
        }
        
        localStorage.setItem('authToken', authToken);
        
        // Remove hash from URL
        window.history.replaceState(null, null, window.location.pathname);
        
        // Check auth status with new token
        checkAuthStatus();
      } catch (err) {
        console.error('Error parsing auth token from URL hash:', err);
        setLoading(false);
      }
    } else {
      // Also check URL params for auth_token
      const urlParams = new URLSearchParams(window.location.search);
      const paramToken = urlParams.get('auth_token');
      
      if (paramToken) {
        console.log('Found auth token in URL params, storing it and checking status...');
        localStorage.setItem('authToken', paramToken);
        
        // Remove params from URL
        window.history.replaceState(null, null, window.location.pathname);
        
        checkAuthStatus();
      } else {
        // No tokens in URL, just check current auth status
        checkAuthStatus();
      }
    }
  }, []);

  // Check authentication status on mount and when URL has auth token
  useEffect(() => {
    // Check for auth token in URL (Steam redirects with token in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');

    if (authToken) {
      // Immediately remove token from URL to prevent bookmarking with token
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log("Found auth token in URL, storing it and checking status...");
      localStorage.setItem('authToken', authToken); // Use consistent key name
      checkAuthStatus();
    }
  }, []);

  // Add a function to fix the authentication issue
  const fixSteamAuthPersistence = () => {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    const steamAuthRetry = localStorage.getItem('steamAuthRetry');
    
    // Handle legacy token if exists
    if (localStorage.getItem('auth_token')) {
      localStorage.setItem('authToken', localStorage.getItem('auth_token'));
      console.log('Migrated legacy auth_token to authToken');
    }
    
    // If we have an auth token but the app still thinks we need authentication
    if (authToken && (steamAuthRetry === 'true' || !user)) {
      console.log('Fixing Steam auth persistence, reusing existing token');
      checkAuthStatus(); // Re-check auth with existing token
      return true;
    }
    return false;
  };

  // Also modify checkAuthStatus function
  const checkAuthStatus = async () => {
    console.log('Checking auth status, API URL:', API_URL);
    
    // Get token from localStorage (try both key formats)
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Always clear the steamAuthRetry flag when checking auth
    localStorage.removeItem('steamAuthRetry');
    
    if (token) {
      console.log('Found token, fetching user details...');
      try {
        // Set the authorization header for this specific request
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const response = await axios.get(`${API_URL}/auth/user`, {
          withCredentials: true,
          params: { auth_token: token } // Add token as query param too
        });
        
        console.log('User details response:', response.data);
        
        if (response.data && response.data.user) {
          // Ensure we're setting the user correctly on authentication
          setUser(response.data.user);
          setIsAuthenticated(true);
          console.log('User authenticated:', response.data.user);
          
          // Set a flag to indicate successful authentication
          localStorage.setItem('userFullyAuthenticated', 'true');
          
          // Ensure token is stored in the new consistent location
          localStorage.setItem('authToken', token);
          
          // Initialize socket after successful auth
          socketService.initializeSocket(token);
          
          // Set the authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          console.error('Invalid user data in response');
          handleLogout();
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        // Only clear if there's a 401 error (invalid token)
        if (error.response && error.response.status === 401) {
          console.error('Authentication failed with 401');
          handleLogout();
        } else {
          // For connection errors, don't clear the token
          console.log('Connection error but keeping token');
        }
      } finally {
        setLoading(false);
      }
    } else {
      console.log('No auth token found');
      // Clear any partial auth state
      handleLogout();
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userFullyAuthenticated');
    
    // Reset application state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear any authorization headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Disconnect socket if needed
    if (socketService) {
      socketService.disconnect();
    }
    
    console.log('User logged out, auth data cleared');
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

  // Add a handleLogin method that will be passed to the Navbar
  const handleLogin = () => {
    console.log('Login initiated from App component');
    const authUrl = `${API_URL}/auth/steam`;
    console.log('Redirecting to Steam auth:', authUrl);
    
    // Set a flag to retry authentication when we get redirected back
    localStorage.setItem('steamAuthRetry', 'true');
    
    // Redirect to the Steam authentication endpoint
    window.location.href = authUrl;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gaming-bg-dark)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.5s ease-out'
    }}>
      <Navbar user={user} onLogout={handleLogout} onLogin={handleLogin} />

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
      <SocketConnectionIndicator
        isConnected={socketConnected}
        show={showConnectionIndicator}
      />

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
          .loading-dot {
            animation: pulse 1.4s ease-in-out infinite;
            display: inline-block;
            transform-origin: center;
          }
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
              Loading...
            </p>
          </div>
        </div>
      }>
        {loading ? (
          <div className="loading-screen-background">
            <Spinner variant="light" animation="border" role="status" />
            <p className="text-white mt-3">Loading...</p>
          </div>
        ) : (
          <>
            <Routes>
              <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
              <Route path="/inventory" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><Inventory /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={<PageWrapper><Marketplace /></PageWrapper>} />
              <Route path="/my-listings" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><MyListings /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><Profile /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/trades" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><Trades /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/trades/:tradeId" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><TradeDetailPage /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/tools" element={
                <AdminRoute user={user}>
                  <AdminTools />
                </AdminRoute>
              } />
              <Route path="/steam/settings" element={
                <ProtectedRoute user={user}>
                  <PageWrapper><SteamSettingsPage /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        )}
      </Suspense>

      <LiveActivityFeed />
      <Footer />
    </div>
  );
}

export default App;
