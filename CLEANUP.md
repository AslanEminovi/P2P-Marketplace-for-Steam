# Marketplace Cleanup Tools

This document describes the tools available for cleaning up stuck listings and trades in the CS2 Marketplace system.

## Quick Cleanup

To clean up all stuck listings and trades, run:

```bash
./cleanup-listings.sh
```

This will:

- Find all items marked as listed and set them to not listed
- Update any trades that are stuck in a non-terminal state to "cancelled"

## Targeted Cleanup

If you want to cleanup listings for a specific user, you can pass their MongoDB User ID:

```bash
./cleanup-listings.sh 60f8a1b2e1234567890abcde
```

## Using the Force Cancel Option

For individual listings that show errors when trying to cancel them through the UI, you can:

1. On the My Listings page, attempt to cancel the listing
2. If you get an error, the system will automatically try a "force cancel"
3. If that still fails, you can run the cleanup script above to remove all stuck listings

## Troubleshooting

If you encounter issues with the cleanup script:

1. Make sure your .env file has the correct MONGO_URI setting
2. Ensure Node.js can access your MongoDB database
3. Check the server logs for any connection errors

## Developer Usage

The cleanup functionality is also available through the npm scripts:

```bash
cd server
npm run cleanup-listings
```

You can also import the cleanup function in other scripts:

```javascript
const { cleanupStuckListings } = require("./cleanup_listings");

// Clean up all listings
cleanupStuckListings();

// Or for a specific user
cleanupStuckListings("60f8a1b2e1234567890abcde");
```
