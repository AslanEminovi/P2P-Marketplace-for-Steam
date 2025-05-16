import { createSlice } from "@reduxjs/toolkit";

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
};

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
