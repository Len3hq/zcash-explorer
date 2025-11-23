#!/bin/bash

# Zcash Explorer - ElizaOS Agent Setup Script
# This script registers the agent as a participant in the chat channel

AGENT_ID="cb11f567-f3a2-011c-bdfe-872f7453f6d1"
CHANNEL_ID="cb11f567-f3a2-011c-bdfe-872f7453f6d1"
ELIZA_URL="http://localhost:3000"

echo "🤖 Setting up Zcash Agent integration..."
echo ""
echo "Agent ID: $AGENT_ID"
echo "Channel ID: $CHANNEL_ID"
echo "ElizaOS URL: $ELIZA_URL"
echo ""

# Check if ElizaOS server is running
echo "📡 Checking if ElizaOS server is running..."
if ! curl -s "$ELIZA_URL" > /dev/null 2>&1; then
    echo "❌ Error: ElizaOS server is not running on $ELIZA_URL"
    echo ""
    echo "Please start the ElizaOS agent first:"
    echo "  cd ~/projects/zcashagent103"
    echo "  pnpm dev"
    echo ""
    exit 1
fi

echo "✅ ElizaOS server is running"
echo ""

# Add agent to channel
echo "➕ Adding agent to channel..."
RESPONSE=$(curl -s -X POST \
  "$ELIZA_URL/api/messaging/central-channels/$CHANNEL_ID/agents" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$AGENT_ID\"}")

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Agent successfully added to channel!"
    echo ""
    echo "Response: $RESPONSE"
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo "  1. Start the Zcash Explorer: npm run dev"
    echo "  2. Open http://localhost:3002"
    echo "  3. Click 'Ask Zcash Agent' and start chatting!"
    echo ""
else
    echo "⚠️  Response from server:"
    echo "$RESPONSE"
    echo ""
    echo "Note: If you see an error that the agent is already in the channel, that's OK!"
    echo "The setup is complete and you can proceed to use the chat widget."
    echo ""
fi

exit 0
