import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Define initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: localStorage.getItem("auth_token") || null,
};

// Async thunks for authentication actions
export const login = createAsyncThunk(
  "auth/login",
  async ({ steamId, token }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/steam/verify`, {
        steamId,
        token,
      });

      // Save token to localStorage
      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch profile"
      );
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    // Remove token from localStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");

    // Clear other auth-related items in localStorage
    localStorage.removeItem("user");

    return null;
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;

      // Save to localStorage
      if (token) {
        localStorage.setItem("auth_token", token);
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      // Remove from localStorage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      // Fetch User Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        // Don't reset isAuthenticated here as token might still be valid
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

// Export actions and reducer
export const { setCredentials, clearCredentials, setError } = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthLoading = (state) => state.auth.loading;
