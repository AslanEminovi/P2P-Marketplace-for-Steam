require("dotenv").config();
const redisConfig = require("./config/redis");

// Utility function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testRedisConnection() {
  console.log("Testing Redis connection...");
  console.log(`REDIS_URL: ${process.env.REDIS_URL}`);

  try {
    // Initialize Redis
    const { pubClient, subClient } = redisConfig.initRedis();

    // Wait for connection to establish (2 seconds)
    console.log("Waiting for connection to establish...");
    await wait(2000);

    // Check if connected
    if (redisConfig.isConnected()) {
      console.log("✅ Successfully connected to Redis!");

      // Test basic operations
      console.log("Testing basic Redis operations...");

      // Test set
      await redisConfig.setCache(
        "test:key",
        { message: "Hello from CS2 Marketplace!" },
        60
      );
      console.log("✅ Set operation successful");

      // Test get
      const result = await redisConfig.getCache("test:key");
      console.log("✅ Get operation successful:", result);

      // Test hash operations
      await redisConfig.setHashCache(
        "test:hash",
        {
          name: "CS2 User",
          online: true,
          lastSeen: new Date().toISOString(),
        },
        60
      );
      console.log("✅ Hash set operation successful");

      const hashResult = await redisConfig.getHashCache("test:hash");
      console.log("✅ Hash get operation successful:", hashResult);

      // Clean up
      await redisConfig.deleteCache("test:key");
      await redisConfig.deleteCache("test:hash");
      console.log("✅ Cleanup successful");

      // Close connections
      await redisConfig.closeConnections();
      console.log("✅ Redis test completed successfully!");
    } else {
      console.error("❌ Redis connection check failed - not ready");
      console.log("Redis pubClient status:", pubClient.status);
      console.log("Redis subClient status:", subClient.status);
    }
  } catch (error) {
    console.error("❌ Redis connection test failed with error:", error);
  }
}

testRedisConnection().catch(console.error);
