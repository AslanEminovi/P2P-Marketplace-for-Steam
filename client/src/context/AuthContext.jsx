import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simple console logging for debugging
  const logDebug = (message) => {
    console.log(`[Auth] ${message}`);
  };

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      logDebug("Checking authentication...");
      
      // Get token from localStorage
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        logDebug("No auth token found in localStorage");
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Configure request with token
      const config = {
        withCredentials: true,
        params: { auth_token: authToken }
      };
      
      logDebug("Making auth request");
      const response = await axios.get(`${API_URL}/auth/me`, config);
      
      if (response.data && response.data.user) {
        logDebug("User authenticated successfully");
        setUser(response.data.user);
      } else {
        logDebug("Invalid auth response");
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      
      // Clear invalid token if unauthorized
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
      }
      
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Check for auth token in URL (after Steam login)
  const checkURLAuth = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');
      
      if (authToken) {
        logDebug("Found auth token in URL, saving to localStorage");
        localStorage.setItem('auth_token', authToken);
        
        // Clean up URL
        if (window.history && window.history.replaceState) {
          const cleanURL = window.location.pathname;
          window.history.replaceState({}, document.title, cleanURL);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in checkURLAuth:", error);
      return false;
    }
  };

  // Handle logout
  const logout = () => {
    logDebug("Logging out user");
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Initial auth check on component mount
  useEffect(() => {
    async function initialize() {
      try {
        // First check URL for token (for Steam login redirect)
        const hasURLToken = checkURLAuth();
        
        // Then check auth status
        await checkAuth();
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    }
    
    initialize();
    
    // Failsafe to prevent infinite loading
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading timeout triggered");
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Listen for localStorage changes (for cross-tab login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token') {
        logDebug("Auth token changed in another tab");
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
    checkAuth,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext; 