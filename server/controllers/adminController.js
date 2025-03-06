const { cleanupStuckListings } = require("../../cleanup_listings");

exports.cleanupAllListings = async (req, res) => {
  try {
    console.log("Admin requested full listings cleanup");

    // Run the cleanup function
    const results = await cleanupStuckListings();

    // Return the results
    return res.json({
      success: true,
      itemsUpdated: results.itemsUpdated,
      tradesUpdated: results.tradesUpdated,
      message: "Cleanup completed successfully",
    });
  } catch (error) {
    console.error("Error in admin cleanup:", error);
    return res.status(500).json({
      error: "Failed to cleanup listings",
      details: error.message,
    });
  }
};

exports.cleanupUserListings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log(`Admin requested cleanup for user: ${userId}`);

    // Run the cleanup function for the specific user
    const results = await cleanupStuckListings(userId);

    // Return the results
    return res.json({
      success: true,
      userId,
      itemsUpdated: results.itemsUpdated,
      tradesUpdated: results.tradesUpdated,
      message: `Cleanup completed successfully for user ${userId}`,
    });
  } catch (error) {
    console.error("Error in admin user cleanup:", error);
    return res.status(500).json({
      error: "Failed to cleanup user listings",
      details: error.message,
    });
  }
};
