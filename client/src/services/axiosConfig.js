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
      console.log("Axios interceptor - token exists:", true);
      console.log("Added auth token to request:", config.url);

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
    } else {
      console.log("No auth token found for request:", config.url);
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
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized access (401):", error.response.data);

      // Check if this is already a retry to prevent infinite loops
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        // Try to refresh the token or redirect to login
        console.log("Token might be expired, attempting to refresh...");

        try {
          // Check if there's a refresh token available
          const refreshToken = localStorage.getItem("refresh_token");

          if (refreshToken) {
            // Try to get a new token using the refresh token
            const response = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken,
            });

            if (response.data && response.data.token) {
              // Save the new token
              localStorage.setItem("auth_token", response.data.token);

              // Update the Authorization header
              originalRequest.headers[
                "Authorization"
              ] = `Bearer ${response.data.token}`;

              // Retry the original request
              return axios(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }

        // If refresh failed or no refresh token, redirect to login
        console.log("Token refresh failed. Redirecting to login...");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");

        // Don't redirect if we're already on the home/login page
        if (
          window.location.pathname !== "/" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
      }
    }

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
