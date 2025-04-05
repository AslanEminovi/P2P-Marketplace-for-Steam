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
    console.log("ProtectedRoute - No user, redirecting to home");
    return <Navigate to="/" replace />;
  }
  console.log("ProtectedRoute - User authenticated:", user.username || user.displayName);
  // Explicitly clone the children with the user prop to ensure it's passed down
  return React.Children.map(children, child => 
    React.cloneElement(child, { user })
  );
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
            // Always initialize params object if it doesn't exist
            if (!config.params) {
              config.params = {};
            }

            // Always add token to query params - this is the most reliable way to pass it
            // especially for Steam-related authentication
            config.params.auth_token = token;

            // Always initialize headers object if it doesn't exist
            if (!config.headers) {
              config.headers = {};
            }
            
            // Always add token as Authorization header for better compatibility
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

  // Check authentication status on mount and when URL has auth token
  useEffect(() => {
    // Check for auth token in URL (Steam redirects with token in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');

    if (authToken) {
      // Immediately remove token from URL to prevent bookmarking with token
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log("Found auth token in URL, storing it and checking status...");
      localStorage.setItem('auth_token', authToken);
    }

    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      console.log("Checking auth status, API URL:", API_URL);

      // Maximum time to wait for auth check
      const authCheckTimeout = setTimeout(() => {
        console.log("Auth check timeout - forcing loading to false");
        setLoading(false);
      }, 5000);

      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.log("No auth token found, user is not authenticated");
        setUser(null);
        clearTimeout(authCheckTimeout);
        setLoading(false);
        return;
      }

      console.log("Found token, fetching user details...");
      
      try {
        // Use direct axios request with token in both header and params for maximum compatibility
        console.log(`Making auth request to ${API_URL}/auth/user with token: ${token.substring(0, 10)}...`);
        
        const userResponse = await axios.get(`${API_URL}/auth/user`, {
          withCredentials: true,
          params: { auth_token: token },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // Increased timeout
        });

        console.log("User details response:", userResponse.data);

        if (userResponse.data && userResponse.data.authenticated && userResponse.data.user) {
          console.log("User authenticated:", userResponse.data.user);
          
          // Set user state
          setUser(userResponse.data.user);
          
          // Refresh token in localStorage to ensure it's fresh
          if (userResponse.data.token) {
            console.log("Refreshing token in localStorage");
            localStorage.setItem('auth_token', userResponse.data.token);
          }
          
          // Show success notification
          if (window.showNotification) {
            window.showNotification(
              'Authentication',
              'Successfully signed in',
              'SUCCESS'
            );
          }
          
          clearTimeout(authCheckTimeout);
          setLoading(false);
          return;
        } else {
          console.warn("Authentication check failed, response:", userResponse.data);
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (error) {
        console.error("User details request failed:", error);
        
        // Only remove token if it's an auth error, not a network error
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.log("Invalid token, removing it");
          localStorage.removeItem('auth_token');
        } else {
          console.log("Network or server error, preserving token for retry");
        }
        
        setUser(null);
      }
      
      clearTimeout(authCheckTimeout);
      setLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
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

      // Clear auth token from localStorage
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
          'Sign Out',
          'Success',
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gaming-bg-dark)',
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
                  <PageWrapper><Inventory user={user} /></PageWrapper>
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
