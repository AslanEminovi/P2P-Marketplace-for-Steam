import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config/constants";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        // Store new token
        localStorage.setItem("auth_token", response.data.token);

        // Schedule the next refresh
        scheduleTokenRefresh(response.data.token);

        // Update user data if provided
        if (response.data.user) {
          setUser(response.data.user);
        }

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
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("auth_token");
      }
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);

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
        }

        const response = await axios.get(`${API_URL}/auth/user`, {
          withCredentials: true,
        });

        if (response.data.authenticated) {
          setIsAuthenticated(true);

          // Ensure profileComplete field is included
          const userData = {
            ...response.data.user,
            profileComplete: response.data.user.profileComplete || false,
            firstName: response.data.user.firstName || "",
            lastName: response.data.user.lastName || "",
            country: response.data.user.country || "",
            city: response.data.user.city || "",
          };

          setUser(userData);

          // Log user information for debugging
          console.log("User authenticated:", {
            steamId: userData.steamId,
            profileComplete: userData.profileComplete,
          });
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

    // Clean up timer on unmount
    return () => {
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }
    };
  }, []);

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

        // Schedule token refresh
        scheduleTokenRefresh(token);

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

      // Clear stored token
      localStorage.removeItem("auth_token");

      // Clear any refresh timers
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }

      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  // Update user data
  const updateUser = (userData) => {
    console.log("AuthContext: Updating user data:", userData);

    setUser((prevUser) => {
      // Create a complete user object that preserves existing fields
      // and merges in the new data properly, including nested objects
      const updatedUser = {
        ...prevUser,
        ...userData,
        // Ensure settings object is properly merged
        settings: {
          ...(prevUser?.settings || {}),
          ...(userData?.settings || {}),
          // Ensure nested settings objects are properly merged
          privacy: {
            ...(prevUser?.settings?.privacy || {}),
            ...(userData?.settings?.privacy || {}),
          },
          notifications: {
            ...(prevUser?.settings?.notifications || {}),
            ...(userData?.settings?.notifications || {}),
          },
        },
      };

      console.log("User data updated in AuthContext:", updatedUser);

      // Also update localStorage backup if available
      try {
        const authToken = localStorage.getItem("auth_token");
        if (authToken) {
          localStorage.setItem("user_data", JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.error("Error updating local storage:", e);
      }

      return updatedUser;
    });
  };

  // Context value
  const value = {
    isAuthenticated,
    user,
    loading,
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
