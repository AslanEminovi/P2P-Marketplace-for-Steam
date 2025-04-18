import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Constants for localStorage keys (copied from Trades.jsx)
const TRADES_STORAGE_KEY = "cs2_marketplace_trades";
const TRADES_TIMESTAMP_KEY = "cs2_marketplace_trades_timestamp";
const TRADE_DETAILS_KEY_PREFIX = "cs2_trade_details_";
const TRADE_TIMESTAMP_KEY_PREFIX = "cs2_trade_timestamp_";
const CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes

// Initial state
const initialState = {
  trades: [],
  activeTrades: [],
  completedTrades: [],
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
  filters: {
    roleFilter: "all", // 'all', 'sent', 'received'
    searchTerm: "",
    sortOrder: "newest", // 'newest', 'oldest', 'highest', 'lowest'
    activeTab: "active", // 'active', 'history'
  },
  createTradeLoading: false,
  createTradeError: null,
};

// Async thunks for trades
export const fetchTrades = createAsyncThunk(
  "trades/fetchTrades",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/trades`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch trades"
      );
    }
  }
);

export const fetchTradeById = createAsyncThunk(
  "trades/fetchTradeById",
  async (tradeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch trade details"
      );
    }
  }
);

export const createTrade = createAsyncThunk(
  "trades/createTrade",
  async (tradeData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/trades`, tradeData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create trade"
      );
    }
  }
);

export const updateTradeStatus = createAsyncThunk(
  "trades/updateTradeStatus",
  async ({ tradeId, status }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${API_URL}/trades/${tradeId}/status`,
        { status },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update trade status"
      );
    }
  }
);

export const cancelTrade = createAsyncThunk(
  "trades/cancelTrade",
  async ({ tradeId, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/cancel`,
        { reason },
        { withCredentials: true }
      );

      return { tradeId, response: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to cancel trade"
      );
    }
  }
);

export const sellerApproveTrade = createAsyncThunk(
  "trades/sellerApproveTrade",
  async (tradeId, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/seller-approve`,
        {},
        { withCredentials: true }
      );

      return { tradeId, response: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to approve trade"
      );
    }
  }
);

export const sellerInitiateTrade = createAsyncThunk(
  "trades/sellerInitiateTrade",
  async (tradeId, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/seller-initiate`,
        {},
        { withCredentials: true }
      );

      return { tradeId, response: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to initiate trade"
      );
    }
  }
);

export const buyerConfirmReceipt = createAsyncThunk(
  "trades/buyerConfirmReceipt",
  async (tradeId, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/buyer-confirm`,
        {},
        { withCredentials: true }
      );

      return { tradeId, response: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to confirm receipt"
      );
    }
  }
);

export const updateTradePriceThunk = createAsyncThunk(
  "trades/updateTradePriceThunk",
  async ({ tradeId, price }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/update-price`,
        { price },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update trade price"
      );
    }
  }
);

export const sellerSentItem = createAsyncThunk(
  "trades/sellerSentItem",
  async ({ tradeId, steamOfferUrl }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_URL}/trades/${tradeId}/seller-sent`,
        { steamOfferUrl },
        { withCredentials: true }
      );

      return { tradeId, response: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to mark item as sent"
      );
    }
  }
);

// Create the trades slice
const tradesSlice = createSlice({
  name: "trades",
  initialState,
  reducers: {
    updateLocalTradeStatus: (state, action) => {
      const { tradeId, status, statusHistory } = action.payload;

      // Update in trades array
      const tradeIndex = state.trades.findIndex((t) => t._id === tradeId);
      if (tradeIndex !== -1) {
        state.trades[tradeIndex].status = status;
        if (statusHistory) {
          state.trades[tradeIndex].statusHistory = statusHistory;
        }
      }

      // Update current trade if it's the one being modified
      if (state.currentTrade && state.currentTrade._id === tradeId) {
        state.currentTrade.status = status;
        if (statusHistory) {
          state.currentTrade.statusHistory = statusHistory;
        }
      }

      // Update the localStorage cache for this trade
      try {
        const cachedTrade = localStorage.getItem(
          `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`
        );
        if (cachedTrade) {
          const trade = JSON.parse(cachedTrade);
          trade.status = status;
          if (statusHistory) {
            trade.statusHistory = statusHistory;
          }
          localStorage.setItem(
            `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`,
            JSON.stringify(trade)
          );
          localStorage.setItem(
            `${TRADE_TIMESTAMP_KEY_PREFIX}${tradeId}`,
            Date.now().toString()
          );
        }
      } catch (error) {
        console.warn("Failed to update trade in localStorage", error);
      }

      // Recalculate trade categories
      state.activeTrades = state.trades.filter((t) =>
        [
          "awaiting_seller",
          "offer_sent",
          "awaiting_confirmation",
          "created",
          "pending",
        ].includes(t.status)
      );

      state.completedTrades = state.trades.filter((t) =>
        ["completed"].includes(t.status)
      );

      // Update stats
      state.stats = {
        totalTrades: state.trades.length,
        activeTrades: state.activeTrades.length,
        completedTrades: state.completedTrades.length,
        totalValue: state.trades.reduce(
          (sum, trade) => sum + (Number(trade?.price) || 0),
          0
        ),
      };
    },
    updateTradePrice: (state, action) => {
      const { tradeId, newPrice, previousPrice, updatedBy } = action.payload;

      // Update in trades array
      const tradeIndex = state.trades.findIndex((t) => t._id === tradeId);
      if (tradeIndex !== -1) {
        // Save the previous price in history if not already done
        if (!state.trades[tradeIndex].priceHistory) {
          state.trades[tradeIndex].priceHistory = [];
        }

        state.trades[tradeIndex].priceHistory.push({
          price: previousPrice,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy || "system",
        });

        // Update the current price
        state.trades[tradeIndex].price = newPrice;
      }

      // Update current trade if it's the one being modified
      if (state.currentTrade && state.currentTrade._id === tradeId) {
        // Save the previous price in history if not already done
        if (!state.currentTrade.priceHistory) {
          state.currentTrade.priceHistory = [];
        }

        state.currentTrade.priceHistory.push({
          price: previousPrice,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy || "system",
        });

        // Update the current price
        state.currentTrade.price = newPrice;
      }

      // Update the localStorage cache for this trade
      try {
        const cachedTrade = localStorage.getItem(
          `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`
        );
        if (cachedTrade) {
          const trade = JSON.parse(cachedTrade);

          // Save price history
          if (!trade.priceHistory) {
            trade.priceHistory = [];
          }

          trade.priceHistory.push({
            price: previousPrice,
            updatedAt: new Date().toISOString(),
            updatedBy: updatedBy || "system",
          });

          // Update price
          trade.price = newPrice;

          localStorage.setItem(
            `${TRADE_DETAILS_KEY_PREFIX}${tradeId}`,
            JSON.stringify(trade)
          );
          localStorage.setItem(
            `${TRADE_TIMESTAMP_KEY_PREFIX}${tradeId}`,
            Date.now().toString()
          );
        }
      } catch (error) {
        console.warn("Failed to update trade price in localStorage", error);
      }

      // Update stats - recalculate total value
      state.stats.totalValue = state.trades.reduce(
        (sum, trade) => sum + (Number(trade?.price) || 0),
        0
      );
    },
    setTradeFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetTradeFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearTradeError: (state) => {
      state.error = null;
    },
    loadCachedTrades: (state) => {
      try {
        // Load cached trades from localStorage
        const cachedTrades = localStorage.getItem(TRADES_STORAGE_KEY);
        const cachedTimestamp = localStorage.getItem(TRADES_TIMESTAMP_KEY);

        const now = Date.now();
        const cacheValid =
          cachedTimestamp &&
          now - parseInt(cachedTimestamp, 10) < CACHE_EXPIRATION;

        if (cachedTrades && cacheValid) {
          const parsedTrades = JSON.parse(cachedTrades);
          state.trades = parsedTrades;

          // Categorize trades
          state.activeTrades = parsedTrades.filter((t) =>
            [
              "awaiting_seller",
              "offer_sent",
              "awaiting_confirmation",
              "created",
              "pending",
            ].includes(t.status)
          );

          state.completedTrades = parsedTrades.filter((t) =>
            ["completed"].includes(t.status)
          );

          // Update stats
          state.stats = {
            totalTrades: parsedTrades.length,
            activeTrades: state.activeTrades.length,
            completedTrades: state.completedTrades.length,
            totalValue: parsedTrades.reduce(
              (sum, trade) => sum + (Number(trade?.price) || 0),
              0
            ),
          };
        }
      } catch (error) {
        console.warn("Failed to load cached trades from localStorage", error);
      }
    },
    resetTradeErrors: (state) => {
      state.error = null;
      state.createTradeError = null;
    },
    clearCurrentTrade: (state) => {
      state.currentTrade = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Trades
      .addCase(fetchTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload;

        // Categorize trades
        state.activeTrades = action.payload.filter((t) =>
          [
            "awaiting_seller",
            "offer_sent",
            "awaiting_confirmation",
            "created",
            "pending",
          ].includes(t.status)
        );

        state.completedTrades = action.payload.filter((t) =>
          ["completed"].includes(t.status)
        );

        // Update stats
        state.stats = {
          totalTrades: action.payload.length,
          activeTrades: state.activeTrades.length,
          completedTrades: state.completedTrades.length,
          totalValue: action.payload.reduce(
            (sum, trade) => sum + (Number(trade?.price) || 0),
            0
          ),
        };
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Trade By ID
      .addCase(fetchTradeById.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(fetchTradeById.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentTrade = action.payload;

        // Also update this trade in the trades array if it exists
        const tradeIndex = state.trades.findIndex(
          (t) => t._id === action.payload._id
        );
        if (tradeIndex !== -1) {
          state.trades[tradeIndex] = action.payload;
        }
      })
      .addCase(fetchTradeById.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload;
      })

      // Cancel Trade
      .addCase(cancelTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelTrade.fulfilled, (state, action) => {
        state.loading = false;
        const { tradeId } = action.payload;

        // Update trade status in both arrays and current trade
        const tradeIndex = state.trades.findIndex((t) => t._id === tradeId);
        if (tradeIndex !== -1) {
          state.trades[tradeIndex].status = "cancelled";
          state.trades[tradeIndex].statusHistory =
            state.trades[tradeIndex].statusHistory || [];
          state.trades[tradeIndex].statusHistory.push({
            status: "cancelled",
            timestamp: new Date().toISOString(),
            note: "Cancelled by user",
          });
        }

        if (state.currentTrade && state.currentTrade._id === tradeId) {
          state.currentTrade.status = "cancelled";
          state.currentTrade.statusHistory =
            state.currentTrade.statusHistory || [];
          state.currentTrade.statusHistory.push({
            status: "cancelled",
            timestamp: new Date().toISOString(),
            note: "Cancelled by user",
          });
        }

        // Recategorize trades
        state.activeTrades = state.trades.filter((t) =>
          [
            "awaiting_seller",
            "offer_sent",
            "awaiting_confirmation",
            "created",
            "pending",
          ].includes(t.status)
        );

        // Update stats
        state.stats.activeTrades = state.activeTrades.length;
      })
      .addCase(cancelTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle other trade actions (similar pattern for all)
      .addCase(sellerApproveTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sellerApproveTrade.fulfilled, (state, action) => {
        state.loading = false;
        // We don't directly update the trade here as we'll get a socket update
      })
      .addCase(sellerApproveTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(sellerInitiateTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sellerInitiateTrade.fulfilled, (state, action) => {
        state.loading = false;
        // We don't directly update the trade here as we'll get a socket update
      })
      .addCase(sellerInitiateTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(buyerConfirmReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(buyerConfirmReceipt.fulfilled, (state, action) => {
        state.loading = false;
        // We don't directly update the trade here as we'll get a socket update
      })
      .addCase(buyerConfirmReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create trade
      .addCase(createTrade.pending, (state) => {
        state.createTradeLoading = true;
        state.createTradeError = null;
      })
      .addCase(createTrade.fulfilled, (state, action) => {
        state.createTradeLoading = false;
        state.trades.push(action.payload);
      })
      .addCase(createTrade.rejected, (state, action) => {
        state.createTradeLoading = false;
        state.createTradeError = action.payload;
      })

      // Update trade status
      .addCase(updateTradeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTradeStatus.fulfilled, (state, action) => {
        state.loading = false;

        // Update both currentTrade and the trade in the trades array
        if (
          state.currentTrade &&
          state.currentTrade._id === action.payload._id
        ) {
          state.currentTrade = action.payload;
        }

        const index = state.trades.findIndex(
          (trade) => trade._id === action.payload._id
        );
        if (index !== -1) {
          state.trades[index] = action.payload;
        }
      })
      .addCase(updateTradeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update trade price
      .addCase(updateTradePriceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTradePriceThunk.fulfilled, (state, action) => {
        state.loading = false;

        // Update trade price in the current trade if it matches
        if (
          state.currentTrade &&
          state.currentTrade._id === action.payload.trade._id
        ) {
          state.currentTrade.price = action.payload.trade.price;
          state.currentTrade.priceHistory = action.payload.trade.priceHistory;
        }

        // Update trade price in the trades array
        const tradeIndex = state.trades.findIndex(
          (t) => t._id === action.payload.trade._id
        );
        if (tradeIndex !== -1) {
          state.trades[tradeIndex].price = action.payload.trade.price;
          state.trades[tradeIndex].priceHistory =
            action.payload.trade.priceHistory;
        }

        // Recalculate stats total value
        state.stats.totalValue = state.trades.reduce(
          (sum, trade) => sum + (Number(trade?.price) || 0),
          0
        );
      })
      .addCase(updateTradePriceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Seller Sent Item
      .addCase(sellerSentItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sellerSentItem.fulfilled, (state, action) => {
        state.loading = false;
        // We don't directly update the trade here as we'll get a socket update
      })
      .addCase(sellerSentItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  updateLocalTradeStatus,
  updateTradePrice,
  setTradeFilters,
  resetTradeFilters,
  clearTradeError,
  loadCachedTrades,
  resetTradeErrors,
  clearCurrentTrade,
} = tradesSlice.actions;

export default tradesSlice.reducer;

// Selectors
export const selectAllTrades = (state) => state.trades.trades;
export const selectActiveTrades = (state) => state.trades.activeTrades;
export const selectCompletedTrades = (state) => state.trades.completedTrades;
export const selectCurrentTrade = (state) => state.trades.currentTrade;
export const selectTradesLoading = (state) => state.trades.loading;
export const selectTradeDetailsLoading = (state) => state.trades.detailsLoading;
export const selectTradesError = (state) => state.trades.error;
export const selectTradeStats = (state) => state.trades.stats;
export const selectTradeFilters = (state) => state.trades.filters;

// Filtered trades selector
export const selectFilteredTrades = (state) => {
  const { trades } = state.trades;
  const { roleFilter, searchTerm, sortOrder, activeTab } = state.trades.filters;

  // First filter by active/completed
  let filtered =
    activeTab === "active"
      ? trades.filter((t) =>
          [
            "awaiting_seller",
            "offer_sent",
            "awaiting_confirmation",
            "created",
            "pending",
          ].includes(t.status)
        )
      : trades;

  // Then by role
  if (roleFilter === "sent") {
    filtered = filtered.filter(
      (t) => t.buyer && t.buyer._id === state.auth.user?._id
    );
  } else if (roleFilter === "received") {
    filtered = filtered.filter(
      (t) => t.seller && t.seller._id === state.auth.user?._id
    );
  }

  // Then by search term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.itemName && t.itemName.toLowerCase().includes(term)) ||
        (t.seller &&
          t.seller.displayName &&
          t.seller.displayName.toLowerCase().includes(term)) ||
        (t.buyer &&
          t.buyer.displayName &&
          t.buyer.displayName.toLowerCase().includes(term))
    );
  }

  // Finally sort
  filtered.sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortOrder === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortOrder === "highest") {
      return (Number(b?.price) || 0) - (Number(a?.price) || 0);
    } else {
      // lowest
      return (Number(a?.price) || 0) - (Number(b?.price) || 0);
    }
  });

  return filtered;
};
