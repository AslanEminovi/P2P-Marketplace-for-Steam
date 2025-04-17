#!/bin/bash
# Restart script for CS2 Marketplace with Redis fixes

echo "Stopping existing server processes..."
pkill -f "node server.js" || true

echo "Cleaning up any Redis locks..."
redis-cli -u "redis://default:5YV0Wl46DoaYDEvoaiD3q3RPhgTn7KdC@redis-17080.crce198.eu-central-1-3.ec2.redns.redis-cloud.com:17080" FLUSHDB

# Wait a moment for resources to be freed
sleep 2

# Start server
echo "Starting server..."
cd server
node server.js > ../server.log 2>&1 &

echo "Server restarted! Check server.log for output."
echo "Tail the log file with: tail -f server.log" 