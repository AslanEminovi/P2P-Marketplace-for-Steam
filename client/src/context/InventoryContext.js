import React, { createContext, useState } from "react";

const InventoryContext = createContext({
  items: [],
  loading: false,
  error: null,
  refreshInventory: () => {},
});

export const InventoryContextProvider = ({ children }) => {
  const [inventoryState, setInventoryState] = useState({
    items: [],
    loading: false,
    error: null,
  });

  const refreshInventory = () => {
    // This would normally fetch inventory data from an API
    setInventoryState((prev) => ({
      ...prev,
      loading: true,
    }));

    // Simulating API call
    setTimeout(() => {
      setInventoryState({
        items: [],
        loading: false,
        error: null,
      });
    }, 1000);
  };

  return (
    <InventoryContext.Provider
      value={{
        ...inventoryState,
        refreshInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export default InventoryContext;
