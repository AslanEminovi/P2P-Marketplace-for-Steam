import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Constants for localStorage keys (brought from Trades.jsx)
const TRADES_STORAGE_KEY = "cs2_marketplace_trades";
const TRADES_TIMESTAMP_KEY = "cs2_marketplace_trades_timestamp";
const TRADE_DETAILS_KEY_PREFIX = "cs2_trade_details_";
const TRADE_TIMESTAMP_KEY_PREFIX = "cs2_trade_timestamp_";
const CACHE_EXPIRATION = 5 * 60 * 1000; // Reduced to 5 minutes for more frequent refreshes
const TRADE_CACHE_EXPIRATION = 5 * 60 * 1000; // Reduced to 5 minutes with Redis

// Helper function to safely store in localStorage with error handling
const safeLocalStorage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to save to localStorage: ${key}`, error);
      return false;
    }
  },
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get from localStorage: ${key}`, error);
      return null;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove from localStorage: ${key}`, error);
      return false;
    }
  },
};

// Initial state
const initialState = {
  trades: [],
  activeTrades: [],
  historicalTrades: [],
  currentTrade: null,
  loading: false,
  detailsLoading: false,
  error: null,
  stats: {
    totalTrades: 0,
    activeTrades: 0,
    completedTrades: 0,
    totalValue: 0,
  },
  lastFetched: null,
};

// Async thunks for trades
export const fetchTrades = createAsyncThunk(
  "trades/fetchTrades",
  async (_, { getState, rejectWithValue }) => {
    try {
      // First check if we have cached trades in localStorage
      const cachedTrades = safeLocalStorage.getItem(TRADES_STORAGE_KEY);
      const cachedTimestamp = safeLocalStorage.getItem(TRADES_TIMESTAMP_KEY);

      // Calculate if the cache is still valid
      const now = Date.now();
      const cacheValid =
        cachedTimestamp &&
        now - parseInt(cachedTimestamp, 10) < CACHE_EXPIRATION;

      // If we have valid cache, return it immediately
      if (cachedTrades && cacheValid) {
        console.log("[tradesSlice] Loading trades from localStorage cache");
        return {
          trades: JSON.parse(cachedTrades),
          fromCache: true,
        };
      }

      // Otherwise fetch from API
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true,
      });

      if (Array.isArray(response.data)) {
        // Save to localStorage with timestamp
        safeLocalStorage.setItem(
          TRADES_STORAGE_KEY,
          JSON.stringify(response.data)
        );
        safeLocalStorage.setItem(TRADES_TIMESTAMP_KEY, now.toString());

        return {
          trades: response.data,
          fromCache: false,
        };
      } else {
        return rejectWithValue("Invalid response format from server");
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch trades"
      );
    }
  }
);
export const fetchTradesAsync = fetchTrades;

export const fetchTradeDetails = createAsyncThunk(
  "trades/fetchTradeDetails",
  async (tradeId, { getState, rejectWithValue }) => {
    try {
      // Check localStorage cache first
      const cacheKey = `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`;
      const timestampKey = `${TRADE_TIMESTAMP_KEY_PREFIX}${tradeId}`;
      const cachedTrade = safeLocalStorage.getItem(cacheKey);
      const cachedTimestamp = safeLocalStorage.getItem(timestampKey);

      // Check if cache is valid
      const now = Date.now();
      const cacheValid =
        cachedTimestamp &&
        now - parseInt(cachedTimestamp, 10) < TRADE_CACHE_EXPIRATION;

      if (cachedTrade && cacheValid) {
        console.log(
          `[tradesSlice] Loading trade ${tradeId} from localStorage cache`
        );
        return JSON.parse(cachedTrade);
      }

      // Fetch from API if no valid cache
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true,
      });

      // Save to localStorage
      safeLocalStorage.setItem(cacheKey, JSON.stringify(response.data));
      safeLocalStorage.setItem(timestampKey, now.toString());

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch trade details"
      );
    }
  }
);

export const updateTradeStatus = createAsyncThunk(
  "trades/updateTradeStatus",
  async ({ tradeId, action, data = {} }, { getState, rejectWithValue }) => {
    try {
      let endpoint;
      switch (action) {
        case "seller-initiate":
          endpoint = `${API_URL}/trades/${tradeId}/seller-initiate`;
          break;
        case "buyer-confirm":
          endpoint = `${API_URL}/trades/${tradeId}/buyer-confirm`;
          break;
        case "cancel":
          endpoint = `${API_URL}/trades/${tradeId}/cancel`;
          break;
        case "check-inventory":
          endpoint = `${API_URL}/trades/${tradeId}/verify-inventory`;
          return axios
            .get(endpoint, { withCredentials: true })
            .then((response) => response.data);
        default:
          return rejectWithValue("Invalid action type");
      }

      const response = await axios.put(endpoint, data, {
        withCredentials: true,
      });

      // Update cache in localStorage
      try {
        const cacheKey = `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`;
        const timestampKey = `${TRADE_TIMESTAMP_KEY_PREFIX}${tradeId}`;
        const cachedTrade = safeLocalStorage.getItem(cacheKey);

        if (cachedTrade) {
          const tradeData = JSON.parse(cachedTrade);
          const updatedTrade = {
            ...tradeData,
            status: response.data.trade?.status || tradeData.status,
            updatedAt: new Date().toISOString(),
          };

          // Add to status history if available
          if (response.data.trade?.statusHistory) {
            updatedTrade.statusHistory = response.data.trade.statusHistory;
          } else if (updatedTrade.statusHistory) {
            updatedTrade.statusHistory.push({
              status: updatedTrade.status,
              timestamp: new Date().toISOString(),
              note: `Status updated via ${action}`,
            });
          }

          safeLocalStorage.setItem(cacheKey, JSON.stringify(updatedTrade));
          safeLocalStorage.setItem(timestampKey, Date.now().toString());
        }
      } catch (storageError) {
        console.warn(
          `[tradesSlice] Failed to update trade cache for ${tradeId}:`,
          storageError
        );
      }

      return {
        tradeId,
        action,
        result: response.data,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || `Failed to ${action} trade`
      );
    }
  }
);

export const fetchActiveTradesAsync = createAsyncThunk(
  "trades/fetchActiveTrades",
  async (_, { getState, rejectWithValue }) => {
    try {
      // Check if we have cached active trades
      const cachedActiveTrades = safeLocalStorage.getItem(
        "cs2_marketplace_active_trades"
      );
      const cachedTimestamp = safeLocalStorage.getItem(
        "cs2_marketplace_active_trades_timestamp"
      );

      // Calculate if the cache is still valid
      const now = Date.now();
      const cacheValid =
        cachedTimestamp &&
        now - parseInt(cachedTimestamp, 10) < CACHE_EXPIRATION;

      // If we have valid cache, return it immediately
      if (cachedActiveTrades && cacheValid) {
        console.log(
          "[tradesSlice] Loading active trades from localStorage cache"
        );
        return {
          activeTrades: JSON.parse(cachedActiveTrades),
          fromCache: true,
        };
      }

      // Otherwise fetch from API
      const response = await axios.get(`${API_URL}/trades/active`, {
        withCredentials: true,
      });

      if (Array.isArray(response.data)) {
        // Save to localStorage with timestamp
        safeLocalStorage.setItem(
          "cs2_marketplace_active_trades",
          JSON.stringify(response.data)
        );
        safeLocalStorage.setItem(
          "cs2_marketplace_active_trades_timestamp",
          now.toString()
        );

        return {
          activeTrades: response.data,
          fromCache: false,
        };
      } else {
        return rejectWithValue("Invalid response format from server");
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch active trades"
      );
    }
  }
);

export const fetchTradeHistoryAsync = createAsyncThunk(
  "trades/fetchTradeHistory",
  async (_, { getState, rejectWithValue }) => {
    try {
      // Check if we have cached history trades
      const cachedHistoryTrades = safeLocalStorage.getItem(
        "cs2_marketplace_history_trades"
      );
      const cachedTimestamp = safeLocalStorage.getItem(
        "cs2_marketplace_history_trades_timestamp"
      );

      // Calculate if the cache is still valid
      const now = Date.now();
      const cacheValid =
        cachedTimestamp &&
        now - parseInt(cachedTimestamp, 10) < CACHE_EXPIRATION;

      // If we have valid cache, return it immediately
      if (cachedHistoryTrades && cacheValid) {
        console.log(
          "[tradesSlice] Loading history trades from localStorage cache"
        );
        return {
          trades: JSON.parse(cachedHistoryTrades),
          fromCache: true,
        };
      }

      // Otherwise fetch from API
      const response = await axios.get(`${API_URL}/trades/history`, {
        withCredentials: true,
      });

      if (Array.isArray(response.data)) {
        // Save to localStorage with timestamp
        safeLocalStorage.setItem(
          "cs2_marketplace_history_trades",
          JSON.stringify(response.data)
        );
        safeLocalStorage.setItem(
          "cs2_marketplace_history_trades_timestamp",
          now.toString()
        );

        return {
          trades: response.data,
          fromCache: false,
        };
      } else {
        return rejectWithValue("Invalid response format from server");
      }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch trade history"
      );
    }
  }
);

// Trades slice
const tradesSlice = createSlice({
  name: "trades",
  initialState,
  reducers: {
    updateLocalTradeStatus: (state, action) => {
      const { tradeId, status, statusHistory } = action.payload;

      // Update in all trade lists
      const updateTrade = (trade) => {
        if (trade._id === tradeId) {
          trade.status = status;
          if (statusHistory) {
            trade.statusHistory = statusHistory;
          } else if (trade.statusHistory) {
            trade.statusHistory.push({
              status,
              timestamp: new Date().toISOString(),
            });
          }
          trade.updatedAt = new Date().toISOString();
        }
        return trade;
      };

      state.trades = state.trades.map(updateTrade);
      state.activeTrades = state.activeTrades.map(updateTrade);
      state.historicalTrades = state.historicalTrades.map(updateTrade);

      if (state.currentTrade && state.currentTrade._id === tradeId) {
        state.currentTrade = updateTrade({ ...state.currentTrade });
      }

      // Update stats
      updateTradeStats(state);
    },
    socketTradeUpdate: (state, action) => {
      const tradeUpdate = action.payload;

      // Handle different types of trade updates from socket
      if (tradeUpdate.tradeId) {
        // Find trade in our lists
        const trade = state.trades.find((t) => t._id === tradeUpdate.tradeId);

        if (trade) {
          // Update trade status if provided
          if (tradeUpdate.status) {
            trade.status = tradeUpdate.status;

            // Add to status history if not already present
            const existingEntry = trade.statusHistory?.find(
              (h) =>
                h.status === tradeUpdate.status &&
                new Date(h.timestamp).getTime() > Date.now() - 5000
            );

            if (!existingEntry && trade.statusHistory) {
              trade.statusHistory.push({
                status: tradeUpdate.status,
                timestamp: tradeUpdate.timestamp || new Date().toISOString(),
                note: tradeUpdate.note || "Updated via socket",
              });
            }
          }

          // Update other relevant fields if provided
          if (tradeUpdate.item) {
            trade.item = { ...trade.item, ...tradeUpdate.item };
          }

          trade.updatedAt = tradeUpdate.timestamp || new Date().toISOString();

          // Also update currentTrade if it's the same one
          if (
            state.currentTrade &&
            state.currentTrade._id === tradeUpdate.tradeId
          ) {
            state.currentTrade = { ...trade };
          }

          // Recalculate active/historical lists
          updateTradeCategories(state);
          // Update stats
          updateTradeStats(state);
        }
      }
    },
    clearTradeError: (state) => {
      state.error = null;
    },
    resetCurrentTrade: (state) => {
      state.currentTrade = null;
      state.detailsLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTrades
      .addCase(fetchTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload.trades;
        state.lastFetched = new Date().toISOString();

        // Categorize trades
        updateTradeCategories(state);
        // Update stats
        updateTradeStats(state);
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch trades";
      })

      // fetchTradeDetails
      .addCase(fetchTradeDetails.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(fetchTradeDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentTrade = action.payload;

        // Add or update this trade in the trades list if not present
        const existingTradeIndex = state.trades.findIndex(
          (t) => t._id === action.payload._id
        );
        if (existingTradeIndex >= 0) {
          state.trades[existingTradeIndex] = action.payload;
        } else {
          state.trades.push(action.payload);
        }

        // Recategorize trades
        updateTradeCategories(state);
        // Update stats
        updateTradeStats(state);
      })
      .addCase(fetchTradeDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload || "Failed to fetch trade details";
      })

      // updateTradeStatus
      .addCase(updateTradeStatus.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(updateTradeStatus.fulfilled, (state, action) => {
        state.detailsLoading = false;

        // If we have updated trade in the result, update state
        if (action.payload.result?.trade) {
          const tradeId = action.payload.tradeId;
          const updatedTrade = action.payload.result.trade;

          // Update current trade if it's the one we're viewing
          if (state.currentTrade && state.currentTrade._id === tradeId) {
            state.currentTrade = { ...state.currentTrade, ...updatedTrade };
          }

          // Update in trades list
          const tradeIndex = state.trades.findIndex((t) => t._id === tradeId);
          if (tradeIndex >= 0) {
            state.trades[tradeIndex] = {
              ...state.trades[tradeIndex],
              ...updatedTrade,
            };
          }

          // Recategorize trades
          updateTradeCategories(state);
          // Update stats
          updateTradeStats(state);
        }
      })
      .addCase(updateTradeStatus.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload || "Failed to update trade status";
      })

      // fetchActiveTradesAsync
      .addCase(fetchActiveTradesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveTradesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrades = action.payload.activeTrades;
        state.lastFetched = new Date().toISOString();

        // Update stats
        updateTradeStats(state);
      })
      .addCase(fetchActiveTradesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch active trades";
      })

      // fetchTradeHistoryAsync
      .addCase(fetchTradeHistoryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTradeHistoryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.historicalTrades = action.payload.trades;
        state.lastFetched = new Date().toISOString();

        // Recategorize trades
        updateTradeCategories(state);
        // Update stats
        updateTradeStats(state);
      })
      .addCase(fetchTradeHistoryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch trade history";
      });
  },
});

// Helper function to categorize trades into active and historical
const updateTradeCategories = (state) => {
  state.activeTrades = state.trades.filter((trade) =>
    [
      "awaiting_seller",
      "offer_sent",
      "awaiting_confirmation",
      "created",
      "pending",
      "accepted",
    ].includes(trade?.status)
  );

  state.historicalTrades = state.trades.filter((trade) =>
    ["completed", "cancelled", "failed", "declined", "timed_out"].includes(
      trade?.status
    )
  );
};

// Helper function to update trade statistics
const updateTradeStats = (state) => {
  const stats = {
    totalTrades: state.trades.length,
    activeTrades: state.activeTrades.length,
    completedTrades: state.trades.filter(
      (trade) => trade.status === "completed"
    ).length,
    totalValue: state.trades.reduce(
      (sum, trade) => sum + (Number(trade?.price) || 0),
      0
    ),
  };

  state.stats = stats;
};

export const {
  updateLocalTradeStatus,
  socketTradeUpdate,
  clearTradeError,
  resetCurrentTrade,
} = tradesSlice.actions;

export default tradesSlice.reducer;

// Selectors
export const selectAllTrades = (state) => state.trades.trades;
export const selectActiveTrades = (state) => state.trades.activeTrades;
export const selectHistoricalTrades = (state) => state.trades.historicalTrades;
export const selectCurrentTrade = (state) => state.trades.currentTrade;
export const selectTradeStats = (state) => state.trades.stats;
export const selectTradesLoading = (state) => state.trades.loading;
export const selectTradeDetailsLoading = (state) => state.trades.detailsLoading;
export const selectTradesError = (state) => state.trades.error;
export const selectTradeLastFetched = (state) => state.trades.lastFetched;
export const selectTradeStatus = (state) => ({
  loading: state.trades.loading,
  lastFetched: state.trades.lastFetched,
});
export const selectTradeError = (state) => state.trades.error;
