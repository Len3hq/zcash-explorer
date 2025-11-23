# Zcash Explorer ↔ ElizaOS Agent Integration Guide

This guide explains how to connect the Zcash Explorer chat widget to the ElizaOS agent.

## Architecture

```
┌─────────────────────────────────┐
│   Zcash Explorer (Next.js)      │
│   Port: 3002                    │
│                                 │
│   ┌─────────────────────────┐   │
│   │  AgentChatWidget        │   │
│   │  (Floating Button)      │   │
│   │         ↓               │   │
│   │  ChatClient             │   │
│   │  (Socket.IO Client)     │   │
│   └─────────────────────────┘   │
└─────────────┬───────────────────┘
              │ Socket.IO
              │ (WebSocket/Polling)
              ↓
┌─────────────────────────────────┐
│   ElizaOS Agent Server          │
│   Port: 3000                    │
│                                 │
│   ┌─────────────────────────┐   │
│   │  Socket.IO Server       │   │
│   │         ↓               │   │
│   │  ZcashAgent Character   │   │
│   │  (AI Agent)             │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

## Prerequisites

1. **ElizaOS Agent** running at `http://localhost:3000`
2. **Zcash Explorer** with Socket.IO client installed
3. **Agent ID**: `cb11f567-f3a2-011c-bdfe-872f7453f6d1`

## Configuration

### Environment Variables

File: `.env.local` (Zcash Explorer)

```env
NEXT_PUBLIC_ELIZA_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_ELIZA_AGENT_ID=cb11f567-f3a2-011c-bdfe-872f7453f6d1
```

## Starting the Services

### 1. Start ElizaOS Agent

```bash
cd ~/projects/zcashagent103
pnpm dev
```

**Expected output:**
- ✓ Database migrations complete
- ✓ Socket.IO server listening on port 3000
- ✓ ZcashAgent character initialized

### 2. Register Agent in Channel

**Important:** The agent must be registered as a participant in the channel to receive and respond to messages.

```bash
cd ~/projects/zcashExplorer
./setup-agent.sh
```

**Expected output:**
```
✅ Agent successfully added to channel!
🎉 Setup complete!
```

**Note:** You only need to run this once. If the agent is already registered, you'll see a message indicating that.

**Manual method (if script fails):**
```bash
curl -X POST http://localhost:3000/api/messaging/central-channels/cb11f567-f3a2-011c-bdfe-872f7453f6d1/agents \
  -H "Content-Type: application/json" \
  -d '{"agentId": "cb11f567-f3a2-011c-bdfe-872f7453f6d1"}'
```

### 3. Start Zcash Explorer

```bash
cd ~/projects/zcashExplorer
npm run dev
```

**Expected output:**
- ✓ Next.js dev server running on http://localhost:3002

## Testing the Connection

### 1. Open the Explorer

Navigate to: `http://localhost:3002`

### 2. Open Chat Widget

Click the "Ask Zcash Agent" button in the bottom-right corner.

### 3. Check Connection Status

- **Green dot** = Connected to agent
- **Red dot** = Disconnected (check agent is running)

### 4. Send Test Messages

Try these test prompts:

1. **"What is Zcash?"**
   - Tests basic agent response

2. **"How do shielded transactions work?"**
   - Tests technical knowledge

3. **"Help me decrypt a transaction"**
   - Tests agent's specialized functionality

### 5. Browser Console Logs

Open DevTools Console (F12) and look for:

```
[ChatClient] Initializing Socket.IO connection to: http://localhost:3000
[ChatClient] Agent/Room ID: cb11f567-f3a2-011c-bdfe-872f7453f6d1
[SUCCESS] Connected to Eliza, socket ID: <socket-id>
[SENT] Room join request for room: cb11f567-f3a2-011c-bdfe-872f7453f6d1
[SENDING] Message: {...}
[RECEIVED] Broadcast: {...}
[SUCCESS] Message is for our room!
```

## Features

### Chat Widget UI

- ✅ Floating button with hover effects
- ✅ Slide-up animation when opened
- ✅ New message indicator (red dot)
- ✅ Connection status (online/offline)
- ✅ Typing indicator (animated dots)
- ✅ Error messages for connection issues
- ✅ Welcome message when empty
- ✅ Auto-scroll to latest message

### Socket.IO Integration

- ✅ Proper room joining (ROOM_JOINING message type)
- ✅ Message broadcasting (messageBroadcast event)
- ✅ Reconnection handling
- ✅ Connection error handling
- ✅ Message filtering by room ID
- ✅ Debug logging for troubleshooting

## Message Flow

1. **User sends message** → ChatClient
2. **ChatClient emits** → Socket.IO (type: SEND_MESSAGE)
3. **ElizaOS receives** → Processes with AI
4. **ElizaOS broadcasts** → Socket.IO (event: messageBroadcast)
5. **ChatClient receives** → Filters by room ID
6. **UI updates** → Display agent response

## Troubleshooting

### Agent Not Connecting

**Problem:** Red dot, "Cannot connect to agent" error

**Solutions:**
1. Check ElizaOS agent is running: `lsof -i :3000`
2. Check agent logs for errors
3. Verify `.env.local` has correct URL
4. Check CORS settings on agent

### Messages Not Being Received

**Problem:** User message sent, but no response

**Solutions:**
1. **Check if agent is registered in channel** (most common issue):
   ```bash
   cd ~/projects/zcashExplorer
   ./setup-agent.sh
   ```
2. Check browser console for `[RECEIVED]` logs
3. Verify room ID matches: `cb11f567-f3a2-011c-bdfe-872f7453f6d1`
4. Check agent server logs for message processing
5. Ensure room joining was successful
6. Look for "Agent is not a participant" errors in agent logs

### TypeScript Errors

**Problem:** Build fails with type errors

**Solutions:**
1. Install Socket.IO types: `npm install --save-dev @types/socket.io-client`
2. Check `onNewMessage` prop is properly typed

## Code Reference

### Key Files

```
zcashExplorer/
├── components/
│   ├── AgentChatWidget.tsx    # Floating button & container
│   └── ChatClient.tsx          # Socket.IO client & chat UI
├── .env.local                  # Configuration
└── app/layout.tsx              # Widget integration

zcashagent103/
└── src/
    ├── character.ts            # Agent character definition
    └── index.ts                # Agent entry point
```

### Socket.IO Message Types

```typescript
enum SOCKET_MESSAGE_TYPE {
  ROOM_JOINING = 1,   // Join a room/channel
  SEND_MESSAGE = 2,   // Send a message
  MESSAGE = 3,        // Generic message
  ACK = 4,           // Acknowledgment
  THINKING = 5,      // Agent is thinking
  CONTROL = 6        // Control messages
}
```

## Production Deployment

### Environment Variables

Update `.env.local` for production:

```env
NEXT_PUBLIC_ELIZA_SOCKET_URL=https://your-agent-domain.com
NEXT_PUBLIC_ELIZA_AGENT_ID=cb11f567-f3a2-011c-bdfe-872f7453f6d1
```

### Security Considerations

1. **CORS**: Configure proper CORS on ElizaOS server
2. **Rate Limiting**: Add rate limiting for messages
3. **Authentication**: Consider adding user authentication
4. **SSL/TLS**: Use HTTPS for production Socket.IO

## Support

For issues or questions:
- ElizaOS Documentation: https://elizaos.github.io/eliza/docs
- Socket.IO Documentation: https://socket.io/docs/v4/
