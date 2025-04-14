import axios from "axios";
import { API_URL } from "../config/constants";

// Configure global axios defaults
axios.defaults.timeout = 20000; // 20 seconds default timeout
axios.defaults.withCredentials = true; // Always include credentials for cross-domain requests

// Create a custom instance of axios
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for handling cookies/sessions
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("auth_token");

    if (token) {
      // Set up query parameters if they don't exist
      if (!config.params) {
        config.params = {};
      }

      // Add token to query params for maximum compatibility
      config.params.auth_token = token;

      // Also add token as Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
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

// Function to fetch user details
export const fetchUserDetails = async () => {
  try {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      console.log("No auth token found");
      return null;
    }

    const response = await apiClient.get("/auth/user", {
      params: { auth_token: token },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data && response.data.user) {
      return response.data.user;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user details:", error);

    // Check if the error is due to an unauthorized request
    if (error.response && error.response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem("auth_token");
    }

    return null;
  }
};

export default apiClient;
