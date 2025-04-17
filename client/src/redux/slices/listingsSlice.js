import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Initial state
const initialState = {
  listings: [],
  featuredListings: [],
  recentListings: [],
  userListings: [],
  currentListing: null,
  loading: false,
  error: null,
  filters: {
    category: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "createdAt",
    sortDirection: "desc",
    search: "",
    page: 1,
    limit: 20,
  },
  pagination: {
    totalPages: 0,
    currentPage: 1,
    totalItems: 0,
  },
};

// Async thunks for listings
export const fetchListings = createAsyncThunk(
  "listings/fetchListings",
  async (params, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().listings;

      // Merge current filters with any provided params
      const queryParams = { ...filters, ...params };

      const response = await axios.get(`${API_URL}/market/listings`, {
        params: queryParams,
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch listings"
      );
    }
  }
);

export const fetchFeaturedListings = createAsyncThunk(
  "listings/fetchFeaturedListings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/market/featured`, {
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch featured listings"
      );
    }
  }
);

export const fetchRecentListings = createAsyncThunk(
  "listings/fetchRecentListings",
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/market/recent`, {
        params: { limit },
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch recent listings"
      );
    }
  }
);

export const fetchUserListings = createAsyncThunk(
  "listings/fetchUserListings",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/market/user/${userId}`, {
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch user listings"
      );
    }
  }
);

export const fetchListingById = createAsyncThunk(
  "listings/fetchListingById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/market/listings/${id}`, {
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch listing"
      );
    }
  }
);

export const createListing = createAsyncThunk(
  "listings/createListing",
  async (listingData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.post(
        `${API_URL}/market/listings`,
        listingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create listing"
      );
    }
  }
);

export const updateListing = createAsyncThunk(
  "listings/updateListing",
  async ({ id, listingData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.put(
        `${API_URL}/market/listings/${id}`,
        listingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update listing"
      );
    }
  }
);

export const deleteListing = createAsyncThunk(
  "listings/deleteListing",
  async (id, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      await axios.delete(`${API_URL}/market/listings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return id; // Return the ID for state updates
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete listing"
      );
    }
  }
);

// Create listings slice
const listingsSlice = createSlice({
  name: "listings",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset to page 1 when filters change
      state.filters.page = 1;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearListings: (state) => {
      state.listings = [];
    },
    updateListingLocally: (state, action) => {
      const updatedListing = action.payload;
      // Update in main listings array
      const index = state.listings.findIndex(
        (listing) => listing._id === updatedListing._id
      );
      if (index !== -1) {
        state.listings[index] = updatedListing;
      }

      // Update in user listings if present
      const userIndex = state.userListings.findIndex(
        (listing) => listing._id === updatedListing._id
      );
      if (userIndex !== -1) {
        state.userListings[userIndex] = updatedListing;
      }

      // Update current listing if it's the same one
      if (
        state.currentListing &&
        state.currentListing._id === updatedListing._id
      ) {
        state.currentListing = updatedListing;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch listings
      .addCase(fetchListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload.listings;
        state.pagination = {
          totalPages: action.payload.totalPages,
          currentPage: action.payload.currentPage,
          totalItems: action.payload.totalItems,
        };
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Featured listings
      .addCase(fetchFeaturedListings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeaturedListings.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredListings = action.payload;
      })
      .addCase(fetchFeaturedListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Recent listings
      .addCase(fetchRecentListings.fulfilled, (state, action) => {
        state.recentListings = action.payload;
      })

      // User listings
      .addCase(fetchUserListings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserListings.fulfilled, (state, action) => {
        state.loading = false;
        state.userListings = action.payload;
      })
      .addCase(fetchUserListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch listing by ID
      .addCase(fetchListingById.pending, (state) => {
        state.loading = true;
        state.currentListing = null;
      })
      .addCase(fetchListingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentListing = action.payload;
      })
      .addCase(fetchListingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create listing
      .addCase(createListing.fulfilled, (state, action) => {
        // Add new listing to our listings
        state.listings.unshift(action.payload);
        // Add to user listings if present
        state.userListings.unshift(action.payload);
      })

      // Update listing
      .addCase(updateListing.fulfilled, (state, action) => {
        const updatedListing = action.payload;

        // Update in listings array
        const index = state.listings.findIndex(
          (listing) => listing._id === updatedListing._id
        );
        if (index !== -1) {
          state.listings[index] = updatedListing;
        }

        // Update in user listings
        const userIndex = state.userListings.findIndex(
          (listing) => listing._id === updatedListing._id
        );
        if (userIndex !== -1) {
          state.userListings[userIndex] = updatedListing;
        }

        // Update current listing if it's the same one
        if (
          state.currentListing &&
          state.currentListing._id === updatedListing._id
        ) {
          state.currentListing = updatedListing;
        }
      })

      // Delete listing
      .addCase(deleteListing.fulfilled, (state, action) => {
        const deletedId = action.payload;

        // Remove from listings array
        state.listings = state.listings.filter(
          (listing) => listing._id !== deletedId
        );

        // Remove from user listings
        state.userListings = state.userListings.filter(
          (listing) => listing._id !== deletedId
        );

        // Clear current listing if it's the deleted one
        if (state.currentListing && state.currentListing._id === deletedId) {
          state.currentListing = null;
        }
      });
  },
});

// Export actions and reducer
export const { setFilters, resetFilters, clearListings, updateListingLocally } =
  listingsSlice.actions;

export default listingsSlice.reducer;

// Selectors
export const selectAllListings = (state) => state.listings.listings;
export const selectFeaturedListings = (state) =>
  state.listings.featuredListings;
export const selectRecentListings = (state) => state.listings.recentListings;
export const selectUserListings = (state) => state.listings.userListings;
export const selectCurrentListing = (state) => state.listings.currentListing;
export const selectListingsLoading = (state) => state.listings.loading;
export const selectListingsError = (state) => state.listings.error;
export const selectListingsFilters = (state) => state.listings.filters;
export const selectListingsPagination = (state) => state.listings.pagination;
