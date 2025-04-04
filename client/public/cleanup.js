// Clear all CS2 Marketplace related localStorage items
(function () {
  console.log("Running CS2 Marketplace localStorage cleanup...");
  const itemsToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("cs2_marketplace_trades") ||
        key.startsWith("cs2_trade_details_") ||
        key.startsWith("cs2_trade_timestamp_"))
    ) {
      itemsToRemove.push(key);
    }
  }

  // Remove the items
  itemsToRemove.forEach((key) => {
    console.log("Removing localStorage item:", key);
    localStorage.removeItem(key);
  });

  console.log(`Cleanup complete - removed ${itemsToRemove.length} items`);
})();
