import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Define initial state
const initialState = {
  activeListings: 0,
  activeUsers: 0,
  registeredUsers: 0,
  completedTrades: 0,
  onlineUsers: {
    total: 0,
    authenticated: 0,
    anonymous: 0,
  },
  lastUpdated: null,
  loading: false,
  error: null,
};

// Create a thunk for fetching stats via HTTP for all users
export const fetchStats = createAsyncThunk(
  "stats/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[statsSlice] Fetching stats from API");
      const response = await axios.get(`${API_URL}/marketplace/stats`);

      console.log("[statsSlice] API returned stats:", response.data);
      return response.data;
    } catch (error) {
      console.error("[statsSlice] Error fetching stats:", error);
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch stats"
      );
    }
  }
);

// Create the statistics slice
const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    updateStats: (state, action) => {
      // Log the update
      console.log("[statsSlice] Updating stats with:", action.payload);

      // Update all stats that exist in the payload
      if (action.payload.activeListings !== undefined) {
        state.activeListings = action.payload.activeListings;
      }

      if (action.payload.activeUsers !== undefined) {
        state.activeUsers = action.payload.activeUsers;
      }

      if (action.payload.registeredUsers !== undefined) {
        state.registeredUsers = action.payload.registeredUsers;
      }

      if (action.payload.completedTrades !== undefined) {
        state.completedTrades = action.payload.completedTrades;
      }

      // Update online users if present
      if (action.payload.onlineUsers) {
        state.onlineUsers = {
          total: action.payload.onlineUsers.total || 0,
          authenticated: action.payload.onlineUsers.authenticated || 0,
          anonymous: action.payload.onlineUsers.anonymous || 0,
        };
      }

      // Update timestamp
      state.lastUpdated = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;

        // Update stats with received data
        if (action.payload.activeListings !== undefined) {
          state.activeListings = action.payload.activeListings;
        }

        if (action.payload.activeUsers !== undefined) {
          state.activeUsers = action.payload.activeUsers;
        }

        if (action.payload.registeredUsers !== undefined) {
          state.registeredUsers = action.payload.registeredUsers;
        }

        if (action.payload.completedTrades !== undefined) {
          state.completedTrades = action.payload.completedTrades;
        }

        // Update onlineUsers if present
        if (action.payload.onlineUsers) {
          state.onlineUsers = {
            total: action.payload.onlineUsers.total || 0,
            authenticated: action.payload.onlineUsers.authenticated || 0,
            anonymous: action.payload.onlineUsers.anonymous || 0,
          };
        }

        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch stats";
      });
  },
});

// Export actions
export const { updateStats } = statsSlice.actions;

// Export reducer
export default statsSlice.reducer;

// Selectors
export const selectActiveListings = (state) => state.stats.activeListings;
export const selectActiveUsers = (state) => state.stats.activeUsers;
export const selectCompletedTrades = (state) => state.stats.completedTrades;
export const selectOnlineUsers = (state) => state.stats.onlineUsers;
export const selectAllStats = (state) => state.stats;
export const selectStatsLoading = (state) => state.stats.loading;
export const selectStatsError = (state) => state.stats.error;
