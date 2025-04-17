/**
 * Test script for Redis user presence
 * This is a simple script to test if Redis is working properly for user presence
 *
 * Run with: node testRedis.js
 */

require("dotenv").config();
const Redis = require("ioredis");

async function testRedis() {
  console.log("Testing Redis connection...");

  // Check if REDIS_URL is provided
  if (!process.env.REDIS_URL) {
    console.error("No REDIS_URL environment variable provided.");
    console.error(
      "Set REDIS_URL=redis://localhost:6379 or your actual Redis URL"
    );
    process.exit(1);
  }

  try {
    // Create Redis client
    const redis = new Redis(process.env.REDIS_URL, {
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis connection retry in ${delay}ms (attempt #${times})`);
        return delay;
      },
    });

    redis.on("error", (err) => {
      console.error("Redis Error:", err);
    });

    redis.on("connect", () => {
      console.log("Redis connected successfully!");
    });

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test user presence
    const testUserId = "test-user-123";

    console.log(`Testing user presence for test user: ${testUserId}`);

    // Set user as online
    console.log("Setting user as online...");
    const pipeline = redis.pipeline();
    pipeline.set(`user:${testUserId}:status`, "online", "EX", 70);
    pipeline.set(`user:${testUserId}:lastActive`, Date.now(), "EX", 70);
    await pipeline.exec();

    // Get user status
    console.log("Getting user status...");
    const [status, lastActive] = await redis.mget(
      `user:${testUserId}:status`,
      `user:${testUserId}:lastActive`
    );

    console.log("User status:", status);
    console.log("Last active:", new Date(parseInt(lastActive)));

    // Set user as offline
    console.log("Setting user as offline...");
    const pipeline2 = redis.pipeline();
    pipeline2.set(`user:${testUserId}:status`, "offline", "EX", 3600);
    pipeline2.set(`user:${testUserId}:lastActive`, Date.now(), "EX", 3600);
    await pipeline2.exec();

    // Get user status again
    console.log("Getting user status again...");
    const [status2, lastActive2] = await redis.mget(
      `user:${testUserId}:status`,
      `user:${testUserId}:lastActive`
    );

    console.log("User status:", status2);
    console.log("Last active:", new Date(parseInt(lastActive2)));

    // Clean up
    console.log("Cleaning up test data...");
    await redis.del(`user:${testUserId}:status`);
    await redis.del(`user:${testUserId}:lastActive`);

    console.log("Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

testRedis();
