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
import statsReducer from "./slices/statsSlice";
import tradesReducer from "./slices/tradesSlice";

// Configure persist options
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "notifications"], // Only persist these reducers
  blacklist: ["listings", "stats", "trades"], // Don't persist these (we'll fetch fresh data or use localStorage directly)
};

const rootReducer = combineReducers({
  auth: authReducer,
  listings: listingsReducer,
  notifications: notificationsReducer,
  stats: statsReducer,
  trades: tradesReducer,
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

// Create a function to set up the socket listeners after the store is fully initialized
export const initializeSocketListeners = () => {
  // Set up socket listeners with a small delay to ensure store is ready
  setTimeout(() => {
    setupSocketListeners(store);
  }, 500);
};

// Setup socket listeners when the app loads
// The short delay ensures that auth state is already rehydrated
setTimeout(() => {
  setupSocketListeners(store);
  console.log("[store] Socket listeners initialized");
}, 1000);

export const persistor = persistStore(store);
