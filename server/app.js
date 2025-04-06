// Set up socket events
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle test activity request
  socket.on("request_test_activity", () => {
    console.log(`Received test activity request from ${socket.id}`);

    // Create a test market activity
    const testActivity = {
      type: "listing",
      user: "TestUser",
      userAvatar: "/avatars/default.png",
      itemName: "AWP | Dragon Lore (Factory New)",
      itemImage: "/item-images/awp-dragon-lore.png",
      price: 1999.99,
      timestamp: new Date().toISOString(),
    };

    // Emit only to the requesting client
    socket.emit("market_activity", testActivity);

    console.log("Emitted test market activity");
  });
});
