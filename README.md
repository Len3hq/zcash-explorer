# Zcash Explorer

A lightweight Zcash blockchain explorer built with **Next.js 14**, featuring a modern UI, live stats, and comprehensive block/transaction views.

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

PORT=3000
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

- `http://localhost:3000`

## Main routes / UI

- `GET /` – **Overview**
  - Chain info (height, verification %, best block hash)
  - Live stats: approximate TPS, blocks/hour, difficulty (auto-refresh every 10s)
  - Latest blocks table
  - Global search (block height/hash or txid)
  - Light/dark theme toggle
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
