/**
 * NUCLEAR OPTION: This script finds and deletes ALL trade-related data from the database
 * It will search through ALL collections and remove anything that looks like a trade
 *
 * WARNING: THIS IS DESTRUCTIVE AND CANNOT BE UNDONE
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("ERROR: No MongoDB URI found in environment variables");
  console.error("Please set MONGO_URI or MONGODB_URI in your environment");
  process.exit(1);
}

// Connect directly with MongoDB driver for more flexibility
async function nukeAllTradeData() {
  console.log("🔴 NUCLEAR OPTION: Preparing to delete ALL trade-related data");
  console.log("⚠️  WARNING: This operation cannot be undone!");
  console.log("");

  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB database");

    const db = client.db();

    // Step 1: Get a list of all collections in the database
    console.log("📊 Scanning all collections in the database...");
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    let totalDeleted = 0;

    // Step 2: Check each collection for trade-related data
    for (const collection of collections) {
      const collectionName = collection.name;
      const coll = db.collection(collectionName);

      console.log(`\n🔍 Examining collection: ${collectionName}`);

      // Common trade-related field patterns
      const tradePatterns = [
        // Known trade collections
        collectionName.toLowerCase().includes("trade"),

        // Check for standard fields in schemas that might be trade-related
        { buyer: { $exists: true } },
        { seller: { $exists: true } },
        { tradeId: { $exists: true } },
        { tradeOfferId: { $exists: true } },
        { trade: { $exists: true } },
        { status: "completed" },
        { status: "pending" },
        { status: "awaiting_seller" },
        { status: "offer_sent" },
        { status: { $regex: /trade/i } },
      ];

      // If this is a known trade collection, delete everything
      if (collectionName.toLowerCase().includes("trade")) {
        console.log(`🧨 Found trade collection: ${collectionName}`);
        const count = await coll.countDocuments();
        console.log(`   Contains ${count} documents`);

        if (count > 0) {
          const result = await coll.deleteMany({});
          console.log(
            `🗑️  Deleted ${result.deletedCount} trade records from ${collectionName}`
          );
          totalDeleted += result.deletedCount;
        }
        continue;
      }

      // Check for documents with trade-related fields
      for (const pattern of tradePatterns) {
        if (typeof pattern === "boolean") continue;

        const count = await coll.countDocuments(pattern);
        if (count > 0) {
          console.log(
            `🧨 Found ${count} trade-related documents in ${collectionName} with pattern:`,
            pattern
          );
          const result = await coll.deleteMany(pattern);
          console.log(`🗑️  Deleted ${result.deletedCount} documents`);
          totalDeleted += result.deletedCount;
        }
      }

      // Special handling for user collection to clear trade references
      if (collectionName.toLowerCase().includes("user")) {
        console.log(`🔄 Updating ${collectionName} to remove trade references`);

        // Update all users to clear any trade references
        const result = await coll.updateMany(
          {},
          {
            $unset: {
              trades: "",
              tradeHistory: "",
              lastTrade: "",
              currentTrades: "",
            },
          }
        );

        console.log(
          `✅ Updated ${result.modifiedCount} user documents to remove trade references`
        );
      }
    }

    console.log("\n📊 SUMMARY:");
    console.log(`✅ Total deleted trade records: ${totalDeleted}`);

    // Bonus: Clear any indexes that might be related to trades
    console.log("\n🧹 Checking for trade-related indexes...");
    for (const collection of collections) {
      const collectionName = collection.name;
      const coll = db.collection(collectionName);

      const indexes = await coll.indexes();
      for (const index of indexes) {
        const indexName = index.name;
        if (
          indexName.includes("trade") ||
          indexName.includes("buyer") ||
          indexName.includes("seller")
        ) {
          console.log(
            `Found trade-related index: ${indexName} in ${collectionName}`
          );
          try {
            await coll.dropIndex(indexName);
            console.log(`Dropped index ${indexName}`);
          } catch (e) {
            console.log(`Could not drop index ${indexName}: ${e.message}`);
          }
        }
      }
    }

    // Force garbage collection where possible
    if (global.gc) {
      console.log("Forcing garbage collection...");
      global.gc();
    }

    console.log("\n✅ OPERATION COMPLETE");
    console.log("All trade-related data has been removed from the database");
    console.log("You should now have a clean system with no trade history.");
  } catch (error) {
    console.error("❌ ERROR during operation:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the function
nukeAllTradeData()
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
