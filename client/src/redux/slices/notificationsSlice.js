import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_URL } from "../../config/constants";

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunks for notifications
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.get(`${API_URL}/user/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch notifications"
      );
    }
  }
);

export const markNotificationsRead = createAsyncThunk(
  "notifications/markNotificationsRead",
  async (notificationIds, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.put(
        `${API_URL}/user/notifications/read`,
        { notificationIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      return {
        notificationIds,
        response: response.data,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to mark notifications as read"
      );
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.put(
        `${API_URL}/user/notifications/read`,
        { all: true },
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
        error.response?.data?.error ||
          "Failed to mark all notifications as read"
      );
    }
  }
);

// Create notifications slice
const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const newNotification = action.payload;
      // Add to beginning of array
      state.notifications.unshift(newNotification);

      // Increment unread count if notification is not read
      if (!newNotification.read) {
        state.unreadCount += 1;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications || [];
        state.unreadCount =
          action.payload.unreadCount ||
          state.notifications.filter((n) => !n.read).length;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Mark notifications as read
      .addCase(markNotificationsRead.fulfilled, (state, action) => {
        const { notificationIds } = action.payload;

        // Mark each notification as read
        notificationIds.forEach((id) => {
          const notification = state.notifications.find((n) => n._id === id);
          if (notification && !notification.read) {
            notification.read = true;
            // Decrement unread count
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
      })

      // Mark all notifications as read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        // Mark all notifications as read
        state.notifications.forEach((notification) => {
          notification.read = true;
        });

        // Reset unread count
        state.unreadCount = 0;
      });
  },
});

// Export actions and reducer
export const { addNotification, clearNotifications, setUnreadCount } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;

// Selectors
export const selectAllNotifications = (state) =>
  state.notifications.notifications;
export const selectUnreadNotifications = (state) =>
  state.notifications.notifications.filter(
    (notification) => !notification.read
  );
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) =>
  state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;
