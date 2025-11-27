#!/bin/bash
# Start the Zcash Transaction Decryption Scanner Service

echo "Starting Zcash Block Scanner API..."
echo "Location: ~/projects/zcashtxdecryption/block_scanner_api"
echo "Port: 3005"
echo ""

cd /home/realist/projects/zcashtxdecryption/block_scanner_api

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if dist directory exists (compiled TypeScript)
if [ ! -d "dist" ]; then
    echo "Building TypeScript..."
    npm run build
fi

echo ""
echo "Starting scanner service..."
echo "Press Ctrl+C to stop"
echo ""

npm start
