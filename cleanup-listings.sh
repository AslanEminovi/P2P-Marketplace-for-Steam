#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Check if a user ID was provided
if [ "$1" ]; then
    echo "Running cleanup for specific user: $1"
    node cleanup_listings.js "$1"
else
    echo "Running cleanup for all listings"
    node cleanup_listings.js
fi

echo "Cleanup process complete" 