# Zcash Explorer

A minimal blockchain explorer for Zcash that shows block and transaction details, similar to a standard block explorer.

## What APIs / services this uses

This explorer talks directly to a **local Zcash full node** (`zcashd`) via its **JSON-RPC interface**. That means:

- No third-party blockchain API is required for core functionality.
- All chain data comes from your own node.

Concretely, it uses these `zcashd` RPC methods (Bitcoin-style JSON-RPC):

- `getblockchaininfo` – basic chain status (height, best block hash, sync progress)
- `getbestblockhash` – hash of the tip block (helper)
- `getblockhash <height>` – resolve a block height to a block hash
- `getblock <hash> [verbosity]` – fetch block metadata and list of transactions
- `getrawtransaction <txid> 1` – fetch verbose transaction details by ID

If you prefer a hosted API (e.g. Blockchair, SoChain, etc.), you can adapt `zcashRpcClient.js` to call those instead, but this project is wired for `zcashd` out of the box.

## Prerequisites

1. **Node.js** (>= 14 recommended)
2. **Zcash full node (`zcashd`)** running and fully synced, with RPC enabled.

### Example `zcash.conf`

Typically in `~/.zcash/zcash.conf` (or platform equivalent):

```ini
rpcuser=zcashrpcuser
rpcpassword=some-strong-password
rpcallowip=127.0.0.1
rpcport=8232
server=1
addnode=mainnet.z.cash
```

Restart `zcashd` after editing the config.

## Project setup

From the project directory:

```bash
npm install
```

Create a `.env` file in the project root with your RPC credentials:

```bash
ZCASH_RPC_URL=http://127.0.0.1:8232
ZCASH_RPC_USER=zcashrpcuser
ZCASH_RPC_PASSWORD=some-strong-password
PORT=3000
```

> Make sure `ZCASH_RPC_USER` and `ZCASH_RPC_PASSWORD` match the values in your `zcash.conf`.

## Running the explorer

```bash
node server.js
```

Then open:

- http://localhost:3000

## Features

- **Home page**
  - Displays chain info (`getblockchaininfo`)
  - Shows a table of the latest 10 blocks (height, hash, time, tx count)
- **Search**
  - Search box accepts:
    - Block **height** (number)
    - Block **hash**
    - **Transaction ID** (txid)
- **Block page** (`/block/:hash`)
  - Basic block metadata (hash, height, timestamp, prev/next block links)
  - List of transactions in the block (links to tx detail pages)
- **Transaction page** (`/tx/:txid`)
  - TxID, version, locktime
  - Full `vin` and `vout` arrays
  - Zcash-specific fields where available (e.g. `vjoinsplit`, `valueBalance`)
  - Full raw transaction JSON

## Adapting to third-party APIs

If you do not want to run `zcashd`, you can plug in a third-party Zcash API instead of JSON-RPC by modifying `zcashRpcClient.js`:

- Replace the `rpcCall` function with HTTP calls to your chosen provider (e.g. Blockchair, SoChain, etc.).
- Implement wrappers that provide the same interface:
  - `getBlockchainInfo()`
  - `getBestBlockHash()` (optional helper)
  - `getBlockHash(height)`
  - `getBlock(blockHash)`
  - `getRawTransaction(txid, verbose)`

As long as those functions return data shaped similarly to `zcashd` RPC responses, the rest of the app will continue to work.
