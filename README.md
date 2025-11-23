# Zcash Explorer

A lightweight Zcash blockchain explorer built with **Next.js 14**, featuring a modern UI, live stats, comprehensive block/transaction views, and an integrated **AI Agent** powered by ElizaOS for answering Zcash-related questions.

## Data source

This explorer uses a **Zcash JSON-RPC endpoint**. You can point it at:

- A hosted provider such as **GetBlock** (recommended for quick setup), or
- Your own `zcashd` node exposing the standard JSON-RPC methods.

The backend calls these RPC methods:

- `getblockchaininfo`
- `getbestblockhash`
- `getblockhash` (by height)
- `getblock` (with verbosity for transactions)
- `getrawtransaction` (verbose)
- `getnetworkhashps` (optional, for stats)

## Prerequisites

- **Node.js** ≥ 18
- A Zcash RPC endpoint URL (e.g. from GetBlock or your own `zcashd` node)

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```bash
# Required – Zcash RPC endpoint (GetBlock URL or local zcashd URL)
ZCASH_RPC_URL=https://YOUR-ZCASH-ENDPOINT-URL

# Optional – API key header (only if your provider uses it)
# ZCASH_GETBLOCK_API_KEY=your_getblock_api_key

# ElizaOS Agent Configuration (optional)
NEXT_PUBLIC_ELIZA_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_ELIZA_AGENT_ID=cb11f567-f3a2-011c-bdfe-872f7453f6d1
```

For GetBlock, paste the full Zcash endpoint URL into `ZCASH_RPC_URL`. If GetBlock gives you a separate API key, put it in `ZCASH_GETBLOCK_API_KEY`; otherwise you can leave it unset.

## Running

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

Open:

- `http://localhost:3002`

## AI Agent Integration (Optional)

This explorer includes an optional **AI chat widget** powered by ElizaOS that can answer questions about Zcash.

### Quick Setup

1. Start the ElizaOS agent (in `~/projects/zcashagent103`):
   ```bash
   cd ~/projects/zcashagent103
   pnpm dev
   ```

2. Register the agent:
   ```bash
   cd ~/projects/zcashExplorer
   npm run setup-agent
   ```

3. The chat widget will appear in the bottom-right corner of the explorer

For detailed setup instructions, see **[QUICKSTART.md](./QUICKSTART.md)**

## Main Features

### Explorer Pages

- `GET /` – **Overview**
  - Chain info (height, verification %, best block hash)
  - Live stats: approximate TPS, blocks/hour, difficulty (auto-refresh every 10s)
  - Latest blocks table
  - Global search (block height/hash or txid)
  - Light/dark theme toggle
  - AI chat widget (optional)
- `GET /blocks` – **Blocks list**
  - Recent blocks with columns: `Height`, `Hash`, `Mined on`, `Txns`, `Size`, `Output (ZEC)`
- `GET /block/:hash` – **Block detail**
  - Hash, mined time (with “X minutes ago”), miner address (when derivable)
  - Transaction count, input/output counts, input/output totals (ZEC)
  - Links to previous/next block
- `GET /txs` – **Transactions list**
  - Recent transactions with columns: `TxID`, `Block`, `Height`, `Time`, `Inputs`, `Outputs`, `Output (ZEC)`, `Tx Type`
- `GET /tx/:txid` – **Transaction detail**
  - Summary: txid, version, locktime, input/output counts and totals (ZEC), tx type (coinbase/shielded/transparent)
  - Decoded outputs table (address, type, value)
  - Raw `vin`, `vout`, shielded fields, and full transaction JSON for inspection

### AI Chat Widget

- Real-time chat interface with ZcashAgent
- Ask questions about Zcash, privacy features, shielded transactions, etc.
- Theme-aware design (adapts to light/dark mode)
- Connection status indicator
- Typing indicators
- Persistent user identification

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for AI agent setup
- **[AGENT_INTEGRATION_GUIDE.md](./AGENT_INTEGRATION_GUIDE.md)** - Detailed agent integration guide
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Technical implementation summary

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Socket.IO** - Real-time communication with AI agent
- **ElizaOS** - AI agent framework (optional)
- **Chart.js** - Data visualization
- **CSS Variables** - Theme system
