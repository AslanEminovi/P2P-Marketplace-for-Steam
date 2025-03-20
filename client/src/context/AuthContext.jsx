import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

// Create auth context with a default value to prevent null context issues
const AuthContext = createContext({
  user: null,
  loading: true,
  authInitialized: false,
  checkAuth: () => {},
  logout: () => {}
});

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Add debugging - always log to console AND to document body for visibility
  const debugLog = (message, data) => {
    console.log(`[AuthContext] ${message}`, data || '');
    
    // Also log to the document for visibility in case console isn't open
    if (typeof document !== 'undefined') {
      const debugElement = document.getElementById('error-display');
      if (debugElement) {
        debugElement.style.display = 'block';
        debugElement.textContent += `[AuthContext] ${message} ${data ? JSON.stringify(data) : ''}\n`;
      }
    }
  };

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      debugLog("Checking authentication status...");
      setLoading(true);
      setAuthError(null);
      
      // Get token from localStorage if available
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        debugLog("No auth token found in localStorage");
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        return;
      }
      
      // Configure request with token
      const config = {
        withCredentials: true,
        params: { auth_token: authToken }
      };
      
      debugLog("API URL for auth request:", API_URL);
      
      // Make request to check authentication
      debugLog("Making auth request to:", `${API_URL}/auth/me`);
      
      const response = await axios.get(`${API_URL}/auth/me`, config);
      
      debugLog("Auth response received:", response.data);
      
      if (response.data && response.data.user) {
        debugLog("User authenticated:", response.data.user);
        setUser(response.data.user);
      } else {
        debugLog("Auth response invalid:", response.data);
        setUser(null);
        setAuthError("Invalid authentication response");
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      debugLog("Authentication error:", error.message);
      
      // Log more details about the error
      if (error.response) {
        debugLog("Error response:", { 
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        debugLog("No response received:", {
          request: "Request was made but no response was received"
        });
      }
      
      // Clear invalid token if there was an error
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
        debugLog("Removed invalid auth token");
      }
      
      setUser(null);
      setAuthError(error.message);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  // Check for auth token in URL (after Steam login)
  const checkURLAuth = () => {
    debugLog("Checking URL for auth token...");
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');
      
      if (authToken) {
        debugLog("Auth token found in URL, setting in localStorage");
        localStorage.setItem('auth_token', authToken);
        
        // Clean up URL
        if (window.history && window.history.replaceState) {
          const cleanURL = window.location.pathname;
          window.history.replaceState({}, document.title, cleanURL);
          debugLog("Cleaned auth token from URL");
        }
        
        // Force auth check
        checkAuth();
        return true;
      }
      
      debugLog("No auth token found in URL");
      return false;
    } catch (error) {
      console.error("Error in checkURLAuth:", error);
      debugLog("Error checking URL auth:", error.message);
      return false;
    }
  };

  // Handle logout
  const logout = () => {
    debugLog("Logging out user");
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Initial auth check on mount
  useEffect(() => {
    debugLog("AuthProvider mounted, running initial auth check");
    try {
      const hasURLToken = checkURLAuth();
      if (!hasURLToken) {
        checkAuth();
      }
    } catch (error) {
      console.error("Error in initial auth check:", error);
      debugLog("Initial auth check error:", error.message);
      setLoading(false);
      setAuthInitialized(true);
      setAuthError(error.message);
    }
  }, []);

  // Listen for localStorage changes (for cross-tab login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token') {
        debugLog("Auth token changed in localStorage, refreshing auth state");
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // The value to be provided by this context
  const value = {
    user,
    loading,
    authInitialized,
    authError,
    checkAuth,
    logout
  };

  debugLog("AuthProvider rendering with values:", { 
    user: user ? 'User exists' : 'No user', 
    loading, 
    authInitialized,
    hasError: authError ? true : false
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  try {
    const context = useContext(AuthContext);
    return context;
  } catch (error) {
    console.error("Error using AuthContext:", error);
    // Return the default context value to prevent crashes
    return {
      user: null,
      loading: false,
      authInitialized: true,
      authError: "Failed to access AuthContext: " + error.message,
      checkAuth: () => {},
      logout: () => {}
    };
  }
};

export default AuthContext; 