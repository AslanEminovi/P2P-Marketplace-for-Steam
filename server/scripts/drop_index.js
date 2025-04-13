/**
 * Script to drop the problematic owner_1_assetId_1_isListed_1 index from the Items collection
 * This resolves the duplicate key errors occurring with item cancellation
 *
 * Run this script once on your MongoDB database
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "MongoDB URI is required. Please set MONGO_URI in your environment."
  );
  process.exit(1);
}

async function dropProblemIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Get the Items collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: "items" }).toArray();

    if (collections.length === 0) {
      console.log("Items collection not found");
      return;
    }

    console.log("Items collection found, getting indexes...");

    // List all indexes on the Items collection
    const indexes = await db.collection("items").indexes();
    console.log("Current indexes:", indexes);

    // Look for the problematic index
    const problematicIndex = indexes.find(
      (index) =>
        index.name === "owner_1_assetId_1_isListed_1" ||
        (index.key &&
          index.key.owner === 1 &&
          index.key.assetId === 1 &&
          index.key.isListed === 1)
    );

    if (problematicIndex) {
      console.log("Found problematic unique index:", problematicIndex);

      // Drop the index
      await db.collection("items").dropIndex(problematicIndex.name);
      console.log(`Successfully dropped index '${problematicIndex.name}'`);

      // Create non-unique replacement indexes as needed
      await db.collection("items").createIndex({ owner: 1, assetId: 1 });
      await db.collection("items").createIndex({ isListed: 1, createdAt: -1 });

      console.log("Created new non-unique indexes for better performance");
    } else {
      console.log("Problematic index not found. Checking all indexes:");
      indexes.forEach((index) => {
        console.log(" - ", index.name, JSON.stringify(index.key));
      });
    }

    // List updated indexes
    const updatedIndexes = await db.collection("items").indexes();
    console.log("Updated indexes:", updatedIndexes);

    console.log("Index operation complete.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the function
dropProblemIndex();
