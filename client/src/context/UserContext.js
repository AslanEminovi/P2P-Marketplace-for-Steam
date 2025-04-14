import React, { createContext } from "react";

// Create a Context for user information
export const UserContext = createContext({
  user: null,
  setUser: () => {},
  loading: true,
  setLoading: () => {},
  refreshUser: () => {},
  walletBalance: 0,
  setWalletBalance: () => {},
  refreshWalletBalance: () => {},
});

export default UserContext;
