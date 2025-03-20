import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

// Create auth context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Add debugging
  console.log("AuthProvider mounting");

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      console.log("Checking authentication status...");
      setLoading(true);
      
      // Get token from localStorage if available
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        console.log("No auth token found in localStorage");
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Configure request with token
      const config = {
        withCredentials: true,
        params: { auth_token: authToken }
      };
      
      console.log("Making auth request to:", `${API_URL}/auth/me`);
      
      // Make request to check authentication
      const response = await axios.get(`${API_URL}/auth/me`, config);
      
      console.log("Auth response received:", response.data);
      
      if (response.data && response.data.user) {
        console.log("User authenticated:", response.data.user);
        setUser(response.data.user);
      } else {
        console.log("Auth response invalid:", response.data);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Clear invalid token if there was an error
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  // Check for auth token in URL (after Steam login)
  const checkURLAuth = () => {
    console.log("Checking URL for auth token...");
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    
    if (authToken) {
      console.log("Auth token found in URL, setting in localStorage");
      localStorage.setItem('auth_token', authToken);
      
      // Clean up URL
      if (window.history && window.history.replaceState) {
        const cleanURL = window.location.pathname;
        window.history.replaceState({}, document.title, cleanURL);
      }
      
      // Force auth check
      checkAuth();
      return true;
    }
    console.log("No auth token found in URL");
    return false;
  };

  // Handle logout
  const logout = () => {
    console.log("Logging out user");
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Initial auth check on mount
  useEffect(() => {
    console.log("AuthProvider mounted, running initial auth check");
    const hasURLToken = checkURLAuth();
    if (!hasURLToken) {
      checkAuth();
    }
  }, []);

  // Listen for localStorage changes (for cross-tab login/logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token') {
        console.log("Auth token changed in localStorage, refreshing auth state");
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
    checkAuth,
    logout
  };

  console.log("AuthProvider rendering with values:", { 
    user: user ? 'User exists' : 'No user', 
    loading, 
    authInitialized 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    console.error("useAuth was called outside of AuthProvider!");
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 