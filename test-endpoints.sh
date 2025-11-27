#!/bin/bash

echo "================================"
echo "Testing Single Transaction API"
echo "================================"
echo "URL: https://zcashshieldedtxdecryption-production.up.railway.app/decrypt"
echo ""

# Test with a real transaction (you'll need to provide valid txid and ufvk)
curl -X POST https://zcashshieldedtxdecryption-production.up.railway.app/decrypt \
  -H "Content-Type: application/json" \
  -d '{"txid":"test","ufvk":"test"}' \
  --max-time 10 \
  -w "\nStatus: %{http_code}\n" \
  2>&1

echo ""
echo ""
echo "================================"
echo "Testing Block Scanner API"
echo "================================"
echo "URL: https://zcashblockdecryption-production.up.railway.app/scan"
echo ""

curl -X POST https://zcashblockdecryption-production.up.railway.app/scan \
  -H "Content-Type: application/json" \
  -d '{"blockHeights":[2700000],"ufvk":"test"}' \
  --max-time 10 \
  -w "\nStatus: %{http_code}\n" \
  2>&1

echo ""
echo ""
echo "================================"
echo "Testing via Next.js API Routes"
echo "================================"
echo ""
echo "Starting Next.js server..."
