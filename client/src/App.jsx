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

// Pages
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import TradeDetailPage from './pages/TradeDetailPage';
import SteamSettingsPage from './pages/SteamSettings';

// Components
import SteamSettings from './components/SteamSettings';
import TradeHistory from './components/TradeHistory';
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
  return children;
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

            console.log("Added Steam auth token to request:", config.url);
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

      try {
        // Check for auth token in URL (Steam redirects with token in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('auth_token');

        if (authToken) {
          console.log("Found auth token in URL, storing it...");
          // Store token immediately - Steam auth model typically trusts the redirect
          localStorage.setItem('auth_token', authToken);

          // Remove token from URL to prevent bookmarking with token
          window.history.replaceState({}, document.title, window.location.pathname);

          try {
            // Fetch user details with the token
            console.log("Fetching user details with token...");
            const userResponse = await axios.get(`${API_URL}/auth/user`, {
              withCredentials: true,
              params: {
                auth_token: authToken
              },
              timeout: 5000 // Shorter timeout
            });

            console.log("User details response:", userResponse.data);

            if (userResponse.data && userResponse.data.authenticated) {
              console.log("User authenticated:", userResponse.data.user);

              // Set user state
              setUser(userResponse.data.user);

              // Show success notification
              if (window.showNotification) {
                window.showNotification(
                  'Sign In',
                  'Success',
                  'SUCCESS'
                );
              }

              clearTimeout(authCheckTimeout);
              setLoading(false);
              return;
            } else {
              console.warn("Authentication check failed, response:", userResponse.data);
              localStorage.removeItem('auth_token');
            }
          } catch (verifyError) {
            console.error("User details request failed:", verifyError);

            // If network error, keep the token for retry
            if (verifyError.code === 'ECONNABORTED' || !verifyError.response) {
              console.log("Network error, will retry on next load");
            } else {
              // If server rejected the token, remove it
              localStorage.removeItem('auth_token');
            }
          }
        }

        // Check if we have a token in localStorage
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          console.log("Found stored token, fetching user details...");

          try {
            // Use existing token to get user details
            const userResponse = await axios.get(`${API_URL}/auth/user`, {
              withCredentials: true,
              params: {
                auth_token: storedToken
              },
              timeout: 5000 // Shorter timeout
            });

            console.log("Stored token user check response:", userResponse.data);

            if (userResponse.data && userResponse.data.authenticated) {
              console.log("User authenticated with stored token:", userResponse.data.user);
              setUser(userResponse.data.user);
              clearTimeout(authCheckTimeout);
              setLoading(false);
              return;
            } else {
              console.log("Stored token is invalid, removing...");
              localStorage.removeItem('auth_token');
            }
          } catch (error) {
            console.error("Stored token check failed:", error);

            // Keep token on network errors, remove on auth rejection
            if (error.response && error.response.status === 401) {
              console.log("Server rejected stored token, removing");
              localStorage.removeItem('auth_token');
            }
          }
        }

        // If we reach here, no valid token was found
        console.log("No valid token found, user is not authenticated");
        setUser(null);
        clearTimeout(authCheckTimeout);
        setLoading(false);
      } catch (innerErr) {
        console.error('Inner auth check error:', innerErr);
        setUser(null);
        clearTimeout(authCheckTimeout);
        setLoading(false);
      }
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
            alignItems: center;
            justifyContent: center;
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
              Loading...
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
              Loading...
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

      <LiveActivityFeed />
      <Footer />
    </div>
  );
}

export default App;
