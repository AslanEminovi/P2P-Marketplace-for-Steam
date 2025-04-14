import React, { createContext, useState } from "react";

const MarketplaceContext = createContext({
  listings: [],
  loading: false,
  error: null,
  filters: {},
  setFilters: () => {},
  refreshListings: () => {},
});

export const MarketplaceContextProvider = ({ children }) => {
  const [marketplaceState, setMarketplaceState] = useState({
    listings: [],
    loading: false,
    error: null,
    filters: {},
  });

  const setFilters = (filters) => {
    setMarketplaceState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters,
      },
    }));
  };

  const refreshListings = () => {
    // This would normally fetch marketplace data from an API
    setMarketplaceState((prev) => ({
      ...prev,
      loading: true,
    }));

    // Simulating API call
    setTimeout(() => {
      setMarketplaceState((prev) => ({
        ...prev,
        listings: [],
        loading: false,
        error: null,
      }));
    }, 1000);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        ...marketplaceState,
        setFilters,
        refreshListings,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export default MarketplaceContext;
