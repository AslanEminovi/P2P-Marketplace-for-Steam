import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config/constants";

// Create the auth context
const AuthContext = createContext();

// Provider component that wraps the app and makes auth available
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/auth/user`, {
          withCredentials: true,
        });

        if (response.data.authenticated) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function - not used directly since we authenticate via Steam
  // but included for completeness
  const login = async (token) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-token`, {
        token,
      });
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true });
      setIsAuthenticated(false);
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...userData,
    }));
  };

  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
