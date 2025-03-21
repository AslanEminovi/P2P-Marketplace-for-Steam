require("dotenv").config();
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to Redis!");

  // Test setting a value
  redis.set("test", "Hello Redis!").then(() => {
    console.log("Successfully set test value");

    // Test getting the value
    redis.get("test").then((value) => {
      console.log("Retrieved test value:", value);
      process.exit(0);
    });
  });
});

redis.on("error", (err) => {
  console.error("Redis Error:", err);
  process.exit(1);
});
