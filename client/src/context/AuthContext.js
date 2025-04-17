import React, { createContext, useContext, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config/constants";
import {
  setCredentials,
  clearCredentials,
  fetchUserProfile,
  logout as logoutAction,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from "../redux/slices/authSlice";

// Create the auth context
const AuthContext = createContext();

// Helper function to decode JWT token payload
const decodeToken = (token) => {
  try {
    // JWT tokens consist of three parts: header.payload.signature
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

// Provider component that wraps the app and makes auth available
export const AuthProvider = ({ children }) => {
  // Use Redux instead of local state
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  // Reference to store the refresh timer
  const tokenRefreshTimer = useRef(null);

  // Function to get stored token
  const getStoredToken = () => localStorage.getItem("auth_token");

  // Function to schedule token refresh
  const scheduleTokenRefresh = (token) => {
    // Clear any existing timers
    if (tokenRefreshTimer.current) {
      clearTimeout(tokenRefreshTimer.current);
    }

    // If no token, don't schedule refresh
    if (!token) return;

    try {
      // Decode token to get expiration time
      const decoded = decodeToken(token);

      if (!decoded || !decoded.exp) {
        console.warn("Token does not contain expiration date");
        return;
      }

      // Calculate when the token expires in milliseconds
      const expiresAt = decoded.exp * 1000; // exp is in seconds, convert to ms
      const now = Date.now();

      // Time until expiration in milliseconds
      const timeUntilExpiry = expiresAt - now;

      // If token is already expired, don't schedule refresh
      if (timeUntilExpiry <= 0) {
        console.warn("Token already expired");
        return;
      }

      // Schedule refresh at 90% of the token's lifetime
      // This gives us a buffer before actual expiration
      const refreshTime = timeUntilExpiry * 0.9;

      console.log(
        `Token will be refreshed in ${Math.floor(
          refreshTime / 1000 / 60
        )} minutes`
      );

      // Set timer to refresh token
      tokenRefreshTimer.current = setTimeout(() => {
        refreshToken();
      }, refreshTime);
    } catch (error) {
      console.error("Error scheduling token refresh:", error);
    }
  };

  // Function to refresh the token
  const refreshToken = async () => {
    try {
      console.log("Refreshing auth token...");

      // Get current token
      const currentToken = getStoredToken();
      if (!currentToken) {
        console.warn("No token to refresh");
        return;
      }

      // Call refresh token endpoint
      const response = await axios.post(
        `${API_URL}/auth/refresh-token`,
        { token: currentToken },
        { withCredentials: true }
      );

      if (response.data && response.data.token) {
        // Store new token and update Redux state
        localStorage.setItem("auth_token", response.data.token);

        // Update Redux state with new credentials
        dispatch(
          setCredentials({
            token: response.data.token,
            user: response.data.user || user,
          })
        );

        // Schedule the next refresh
        scheduleTokenRefresh(response.data.token);

        console.log("Token refreshed successfully");
      } else {
        console.warn("Token refresh did not return a new token");
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);

      // If refresh fails due to invalid token, log the user out
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        console.log("Token refresh unauthorized, logging out");
        dispatch(clearCredentials());
      }
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for auth token in URL (Steam redirects with token in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get("auth_token");

        if (authToken) {
          // Immediately remove token from URL to prevent bookmarking with token
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          console.log("Found auth token in URL, storing it");
          localStorage.setItem("auth_token", authToken);
        }

        // Get stored token
        const token = getStoredToken();

        if (token) {
          // Schedule refresh for this token
          scheduleTokenRefresh(token);

          // Fetch user profile
          dispatch(fetchUserProfile());
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuthStatus();

    // Clean up timer on unmount
    return () => {
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }
    };
  }, [dispatch]);

  // Login function - not used directly since we authenticate via Steam
  // but included for completeness
  const login = async (token) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-token`, {
        token,
      });
      if (response.data.authenticated) {
        // Store token
        localStorage.setItem("auth_token", token);

        // Update Redux store
        dispatch(
          setCredentials({
            user: response.data.user,
            token: token,
          })
        );

        // Schedule token refresh
        scheduleTokenRefresh(token);

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

      // Dispatch logout action to Redux
      dispatch(logoutAction());

      // Clear any refresh timers
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }

      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");

      // Still clear credentials on error
      dispatch(clearCredentials());
    }
  };

  // Update user info
  const updateUser = (userData) => {
    console.log("AuthContext - updating user with:", userData);

    if (!user) return;

    // Create merged user data
    const mergedUser = {
      ...user,
      ...userData,
      // Make sure email is explicitly updated
      email: userData.email || user.email,
      // Ensure settings objects get merged rather than replaced
      settings: {
        ...(user.settings || {}),
        ...(userData.settings || {}),
      },
    };

    console.log("AuthContext - merged user data:", mergedUser);

    // Update Redux store with merged user data
    dispatch(
      setCredentials({
        user: mergedUser,
        token: getStoredToken(),
      })
    );

    // Update localStorage backup
    try {
      localStorage.setItem("user_data_backup", JSON.stringify(mergedUser));
    } catch (err) {
      console.error("Failed to backup user data to localStorage:", err);
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    refreshToken,
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
