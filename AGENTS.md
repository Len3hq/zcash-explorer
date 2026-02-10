# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A Next.js 14 Zcash blockchain explorer with real-time stats, shielded transaction decryption, and an AI chat assistant (ElizaOS). Uses the App Router with Server Components and TypeScript.

## Commands

```bash
# Development (runs on port 3002)
npm run dev

# Production build and start
npm run build
npm start

# Lint
npm run lint

# Register the ElizaOS agent to the chat channel (run after agent is running)
npm run setup-agent
```

## Environment Variables

The app requires configuration in `.env.local`:

- `ZCASH_RPC_URL` - Primary Zcash JSON-RPC endpoint (e.g., GetBlock.io URL)
- `ZCASH_RPC_FALLBACK_URL` - Optional fallback RPC endpoint
- `ZCASH_GETBLOCK_API_KEY` - Optional API key header for GetBlock
- `ZCASH_DECRYPT_API_URL` - Shielded transaction decryption service endpoint
- `ZCASH_SCANNER_API_URL` - Wallet scanner service endpoint
- `NEXT_PUBLIC_ELIZA_SOCKET_URL` - ElizaOS agent Socket.IO URL
- `NEXT_PUBLIC_ELIZA_AGENT_ID` - ElizaOS agent UUID

## Architecture

### Core Data Flow

```
Browser → Next.js App Router → API Routes → External Services
                                    ↓
                            lib/zcashRpcClient.ts → Zcash RPC (with fallback)
```

### Key Files

- `lib/zcashRpcClient.ts` - RPC client with automatic fallback on rate limits/errors. All blockchain data flows through here. The `shouldTryFallback()` function determines transient vs permanent errors.
- `lib/utils.ts` - Shared utilities for block fetching, transaction decoding, and time formatting. Uses parallel Promise.all for performance.
- `app/layout.tsx` - Root layout with Header, Footer, Preloader, and the AgentChatWidget (floating chat).

### API Routes (Proxies to External Services)

- `/api/decrypt` - Proxies to Rust decryption service for single shielded transactions
- `/api/scan-wallet` - Proxies to Node.js scanner service for batch block scanning
- `/api/zec-market` - Fetches market data from CoinGecko
- `/api/blockchain-info` - Returns blockchain info from RPC
- `/api/search` - Handles global search (block height/hash, txid)

### External Service Dependencies

1. **Zcash RPC** - GetBlock.io or self-hosted zcashd for blockchain data
2. **Decryption Service** (`zcashtxdecryption`) - Rust service for decrypting shielded outputs with UFVK
3. **Scanner Service** (`zcashtxdecryption/block_scanner_api`) - Node.js batch scanner with PostgreSQL caching
4. **ElizaOS Agent** (`zcashagent103`) - AI chat assistant, communicates via Socket.IO

### Socket.IO Integration (ChatClient)

The chat widget (`components/ChatClient.tsx`) uses a specific ElizaOS message protocol:
- `SOCKET_MESSAGE_TYPE.ROOM_JOINING` (1) - Join the agent's room
- `SOCKET_MESSAGE_TYPE.SEND_MESSAGE` (2) - Send user message
- Listens on `messageBroadcast` event for agent responses

User IDs are persisted in localStorage as UUIDs for session continuity.

### Styling

Uses CSS variables in `app/globals.css` with `[data-theme="dark"]` / `[data-theme="light"]` selectors. Components access theme via `useTheme()` from `components/ThemeProvider.tsx`.

## Important Patterns

- Server Components use `export const dynamic = 'force-dynamic'` for real-time data
- The RPC client automatically retries with fallback on HTTP 429/502/503/504 or network errors
- UFVK (Unified Full Viewing Keys) are never stored server-side - decryption is on-demand
- Block scanning is limited to 100 blocks maximum per request
- Zcash block time averages ~75 seconds (~48 blocks/hour)

## Related Projects

- `~/projects/zcashtxdecryption` - Decryption and scanner services
- `~/projects/zcashagent103` - ElizaOS AI agent
