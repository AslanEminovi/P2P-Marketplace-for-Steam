import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { thunk } from "redux-thunk";

// Import middlewares
import socketMiddleware, {
  setupSocketListeners,
} from "./middlewares/socketMiddleware";

// Import reducers
import authReducer from "./slices/authSlice";
import listingsReducer from "./slices/listingsSlice";
import notificationsReducer from "./slices/notificationsSlice";

// Configure persist options
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "notifications"], // Only persist these reducers
  blacklist: ["listings"], // Don't persist listings (we'll fetch fresh data)
};

const rootReducer = combineReducers({
  auth: authReducer,
  listings: listingsReducer,
  notifications: notificationsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store with middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Redux Persist actions
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
        ],
      },
    }).concat(thunk, socketMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

// Set up socket listeners to dispatch Redux actions
setupSocketListeners(store);

export const persistor = persistStore(store);
