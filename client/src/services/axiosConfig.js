import axios from "axios";
import { API_URL } from "../config/constants";

// Configure global axios defaults
axios.defaults.timeout = 20000; // 20 seconds default timeout
axios.defaults.withCredentials = true; // Always include credentials for cross-domain requests

// Create an axios instance with custom config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to all requests
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Add token to URL params for compatibility with all endpoints
      config.params = {
        ...config.params,
        auth_token: token,
      };

      // Also add as Authorization header for API endpoints that expect it there
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };

      // Add timestamp to bust cache
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // Add cache control headers to prevent caching issues
    config.headers = {
      ...config.headers,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    return config;
  },
  (error) => {
    console.error("API request error in interceptor:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors here (e.g., refresh token, redirect to login)
    console.error(
      "API response error:",
      error?.response?.status || error.message
    );

    // Provide more detailed error logging
    if (error.response) {
      console.error("Error data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Request setup error:", error.message);
    }

    // Pass the error along to the component
    return Promise.reject(error);
  }
);

// Retry functionality - useful for network issues
export const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      lastError = err;

      // Don't retry for certain errors
      if (err.response && [400, 401, 403, 404].includes(err.response.status)) {
        throw err;
      }

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt
      delay *= 1.5;
    }
  }

  throw lastError;
};

// Helper function to fetch user details with retry
export const fetchUserDetails = async () => {
  try {
    const response = await apiClient.get("/auth/user");
    if (response.data && response.data.authenticated) {
      return response.data.user;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
};

export default apiClient;
