# Quick Start: Zcash Explorer with AI Agent

## Setup (One-time)

### 1. Start ElizaOS Agent
```bash
cd ~/projects/zcashagent103
pnpm dev
```

Wait for the server to be ready on port 3000.

### 2. Register Agent in Channel
```bash
cd ~/projects/zcashExplorer
npm run setup-agent
```

**Output:** ✅ Agent successfully added to channel!

### 3. Start Zcash Explorer
```bash
npm run dev
```

**Output:** ✓ Ready on http://localhost:3002

## Using the Chat Widget

1. Open http://localhost:3002
2. Click **"Ask Zcash Agent"** button (bottom-right corner)
3. Wait for green connection indicator
4. Start chatting!

## Example Questions

- "What is Zcash?"
- "How do shielded transactions work?"
- "Explain zero-knowledge proofs"
- "How do I decrypt a transaction?"
- "What are the privacy features of Zcash?"

## Troubleshooting

### Agent Not Responding?
Run the setup script again:
```bash
npm run setup-agent
```

### Can't Connect?
Check if ElizaOS agent is running:
```bash
lsof -i :3000
```

### Still Having Issues?
See detailed troubleshooting in `AGENT_INTEGRATION_GUIDE.md`

## Architecture

```
┌─────────────────────┐
│ Zcash Explorer      │  Port 3002
│ (Next.js)           │
└──────────┬──────────┘
           │ Socket.IO
           ▼
┌─────────────────────┐
│ ElizaOS Agent       │  Port 3000
│ (ZcashAgent)        │
└─────────────────────┘
```

## Files

- `QUICKSTART.md` - This file
- `AGENT_INTEGRATION_GUIDE.md` - Detailed setup guide
- `INTEGRATION_SUMMARY.md` - Technical summary
- `setup-agent.sh` - Agent registration script
- `components/ChatClient.tsx` - Chat implementation
- `components/AgentChatWidget.tsx` - Chat widget UI

## Support

For detailed documentation, see:
- `AGENT_INTEGRATION_GUIDE.md`
- ElizaOS docs: https://elizaos.github.io/eliza/docs
