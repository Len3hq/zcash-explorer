# Zcash Explorer

<div align="center">

![Zcash Explorer](https://img.shields.io/badge/Zcash-Explorer-F3B724?style=for-the-badge&logo=zcash&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A modern, privacy-focused Zcash blockchain explorer with AI-powered assistance**

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Connected Projects](#connected-projects) • [Documentation](#documentation)

</div>

---

## 🌟 Overview

Zcash Explorer is a comprehensive blockchain explorer built specifically for the Zcash ecosystem. It provides real-time insights into the Zcash blockchain with a focus on privacy features, shielded transactions, and user experience.

### Key Highlights

- **🔐 Privacy-First Design**: Full support for shielded transaction decryption and wallet scanning
- **🤖 AI-Powered**: Integrated ElizaOS agent for intelligent Zcash assistance
- **⚡ Real-Time Updates**: Live blockchain stats with 10-second auto-refresh
- **📊 Comprehensive Analytics**: Detailed block, transaction, and network statistics
- **🎨 Modern UI**: Clean, responsive design with dark/light theme support
- **💰 Market Integration**: Live price charts and market data powered by CoinGecko, getblock RPC

## 🏗️ Architecture

### Data Sources

This explorer aggregates data from multiple sources to provide comprehensive blockchain insights:

#### 1. Zcash RPC Node
Primary data source using standard JSON-RPC methods:
- `getblockchaininfo` - Chain state and verification status
- `getbestblockhash` - Latest block information
- `getblockhash` - Block lookup by height
- `getblock` - Detailed block data with transactions
- `getrawtransaction` - Transaction details
- `getnetworkhashps` - Network hashrate
- `getchaintxstats` - Transaction statistics

**Supported RPC Providers:**
- [GetBlock.io](https://getblock.io/) (recommended for quick setup)
- Self-hosted `zcashd` node
- Other Zcash RPC providers

#### 2. Market Data API
- **CoinGecko API**: Real-time ZEC price, market cap, volume, and 30-day price history
- Automatic fallback and rate limiting
- Cached responses for optimal performance

## 🔗 Connected Projects

This explorer integrates with multiple specialized services to provide enhanced functionality:

### 1. **Zcash Transaction Decryptor** (`zcashtxdecryption`)
**Purpose**: Decrypt shielded Zcash transactions using Unified Full Viewing Keys (UFVK)

**Repository**: `~/projects/zcashtxdecryption`

**Services:**
- **Single Transaction Decryption API** (`zcash_tx_decryptor`)
  - Rust-based high-performance decryptor
  - Endpoint: `https://zcashshieldedtxdecryption-production.up.railway.app`
  - Decrypts individual transactions with UFVK
  
- **Block Scanner API** (`block_scanner_api`)
  - Node.js/TypeScript batch processing service
  - Endpoint: `https://zcashblockdecryption-production.up.railway.app`
  - Scans multiple blocks for wallet activity
  - PostgreSQL caching for optimized performance

**Integration Points:**
- `/app/decrypt/page.tsx` - Shielded transaction decryption UI
- `/app/api/decrypt/route.ts` - Single transaction proxy
- `/app/api/scan-wallet/route.ts` - Wallet scanning proxy

**Features:**
- ✅ Decrypt Sapling and Orchard shielded outputs
- ✅ Extract transaction memos
- ✅ Scan wallet by block range, last 1 hour, or wallet birthday
- ✅ Privacy-focused (UFVK never stored)
- ✅ Support for up to 100 blocks per scan

### 2. **Zcash AI Agent** (`zcashagent103`)
**Purpose**: AI-powered assistant for Zcash-related questions

**Repository**: `~/projects/zcashagent103`

**Technology**: ElizaOS (AI agent framework)

**Endpoint**: `https://zcashagent103-production.up.railway.app`

**Integration Points:**
- `/components/AgentChatWidget.tsx` - Floating chat interface
- `/components/ChatClient.tsx` - Socket.IO communication
- Real-time bidirectional communication

**Features:**
- ✅ Answer questions about Zcash protocol
- ✅ Explain shielded transactions and privacy features
- ✅ Provide blockchain data insights
- ✅ Context-aware responses
- ✅ Typing indicators and connection status

### 3. **GetBlock RPC Provider**
**Purpose**: Hosted Zcash node RPC access

**Endpoints:**
- Primary: `https://go.getblock.io/b096873241314399992d954741f3f7ad`
- Fallback: `https://go.getblock.io/9fd49adc25574cefbc9efd703be5d1b6/`

**Integration:**
- `/lib/zcashRpcClient.ts` - RPC client with automatic fallback
- All blockchain data queries

### 4. **CoinGecko API**
**Purpose**: Zcash market data and price information

**Endpoint**: `https://api.coingecko.com/api/v3/coins/zcash`

**Integration Points:**
- `/components/PriceChart.tsx` - 30-day price chart
- `/components/CoinDetails.tsx` - Current price, market cap, volume
- `/components/ZecPriceCard.tsx` - Compact price display

### Service Communication Flow

```
┌─────────────────┐
│  Zcash Explorer │
│   (Next.js)     │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         v                 v
  ┌──────────┐      ┌──────────────┐
  │ GetBlock │      │  CoinGecko   │
  │   RPC    │      │     API      │
  └──────────┘      └──────────────┘
         │
         v
  ┌─────────────────────────────┐
  │  Blockchain Data (Blocks,   │
  │  Transactions, Network Info)│
  └─────────────────────────────┘
         │
         ├──────────────┐
         │              │
         v              v
  ┌─────────────┐ ┌──────────────┐
  │  Decryption │ │  AI Agent    │
  │   Services  │ │  (ElizaOS)   │
  └─────────────┘ └──────────────┘
         │              │
         v              v
  ┌─────────────┐ ┌──────────────┐
  │  Shielded   │ │  Q&A Chat    │
  │  Tx Data    │ │  Interface   │
  └─────────────┘ └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **pnpm**
- A Zcash RPC endpoint URL (e.g. from GetBlock or your own `zcashd` node)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Len3hq/zcash-explorer.git
cd zcash-explorer
```

2. **Install dependencies:**
```bash
npm install
# or
pnpm install
```

3. **Configure environment variables:**

Create a `.env.local` file in the project root:

```bash
# ============================================
# Zcash RPC Configuration
# ============================================
# Required: Primary Zcash RPC endpoint
ZCASH_RPC_URL=https://go.getblock.io/YOUR_API_KEY

# Optional: Fallback RPC endpoint
ZCASH_RPC_FALLBACK_URL=https://go.getblock.io/YOUR_FALLBACK_KEY

# ============================================
# Decryption Services (Optional)
# ============================================
# Single transaction decryption
ZCASH_DECRYPT_API_URL=https://zcashshieldedtxdecryption-production.up.railway.app

# Wallet scanner (batch block decryption)
ZCASH_SCANNER_API_URL=https://zcashblockdecryption-production.up.railway.app

# ============================================
# ElizaOS Agent (Optional)
# ============================================
NEXT_PUBLIC_ELIZA_SOCKET_URL=https://zcashagent103-production.up.railway.app
NEXT_PUBLIC_ELIZA_AGENT_ID=cb11f567-f3a2-011c-bdfe-872f7453f6d1

# ============================================
# Server Configuration
# ============================================
PORT=3002
```

### Running the Explorer

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

**Access the explorer:**
- Local: `http://localhost:3002`
- Production: Your deployed URL

## ✨ Features

### Core Explorer Features

#### 🏠 Home Dashboard
- **Network Overview Card**
  - Latest block height with real-time updates
  - Chain verification progress
  - Network hashrate
  - Active chain indicator (mainnet/testnet)
  
- **Network Stats Card**
  - Approximate TPS (Transactions Per Second)
  - Blocks per hour rate
  - Current mining difficulty
  - Shielded pool balances (Orchard, Sapling, Transparent)
  
- **Market Data**
  - Live ZEC price from CoinGecko
  - 30-day price chart with interactive tooltips
  - 24-hour price change indicator
  - Market cap and trading volume
  - Total and circulating supply
  
- **Latest Blocks Table**
  - Block height with clickable links
  - Block hash (truncated with copy button)
  - Time display toggle (relative/absolute)
  - Transaction count per block
  - Mobile-optimized card view

#### 📦 Blocks Explorer
- Paginated list of recent blocks
- Detailed block information:
  - Block hash and height
  - Mining timestamp
  - Transaction count
  - Block size
  - Total output value
- Navigation between blocks (previous/next)
- Search by block height or hash

#### 💸 Transactions Explorer
- Recent 25 transactions display
- Transaction type badges:
  - 🪙 Coinbase (mining rewards)
  - 🛡️ Shielded (privacy transactions)
  - 👁️ Transparent (public transactions)
- Detailed transaction view:
  - Transaction ID (TXID)
  - Block height and hash
  - Timestamp
  - Input/output counts
  - Value transfers (ZEC)
  - Raw transaction data viewer

#### 🔐 Shielded Transaction Decryption
- **Single Transaction Decryption**
  - Decrypt individual shielded transactions
  - Extract hidden memo fields
  - View shielded amounts and recipients
  - Support for Sapling and Orchard protocols
  
- **Wallet Scanner (UFVK)**
  - Batch scan multiple blocks
  - Three scanning modes:
    - Last 1 hour (~48 blocks)
    - Specific block range
    - From wallet birthday height
  - Export scan results
  - Privacy-preserved (UFVK never logged)

#### 🤖 AI Chat Assistant
- Real-time chat interface
- Ask questions about:
  - Zcash protocol and technology
  - Shielded transactions and privacy
  - Network statistics
  - Transaction details
- Typing indicators
- Connection status monitoring
- Theme-aware design
- Persistent chat history

### Technical Features

#### 🎨 User Interface
- 🌙 **Dark/Light Theme** - System-aware with manual toggle
- 📱 **Fully Responsive** - Optimized for mobile, tablet, and desktop
- ⚡ **Fast Performance** - Server-side rendering with Next.js 14
- 🔄 **Auto-refresh** - Live data updates every 10 seconds
- 📋 **Copy to Clipboard** - One-click copy for hashes and addresses
- 🔍 **Global Search** - Search blocks by height/hash or transactions by TXID

#### 🛡️ Reliability
- **Automatic Fallback** - RPC endpoint failover
- **Error Handling** - Graceful degradation
- **Rate Limiting** - API request management
- **Caching** - Optimized data fetching
- **Connection Monitoring** - Real-time service health checks

#### 🔒 Privacy & Security
- No user tracking or analytics
- UFVK viewing keys never stored
- Decryption happens on-demand
- Secure API communication (HTTPS)
- Client-side memo decryption option

## 📚 Documentation

Comprehensive guides and references:

### Setup Guides
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for AI agent setup
- **[AGENT_INTEGRATION_GUIDE.md](./AGENT_INTEGRATION_GUIDE.md)** - Detailed agent integration documentation
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Technical implementation summary
- **[WALLET_SCAN_INTEGRATION.md](./WALLET_SCAN_INTEGRATION.md)** - Wallet scanning feature guide

### API Routes

#### Blockchain Data
- `GET /` - Home dashboard with network overview
- `GET /blocks` - Paginated blocks list
- `GET /block/[height]` - Block details by height
- `GET /block/[hash]` - Block details by hash
- `GET /txs` - Recent transactions list (25 latest)
- `GET /tx/[txid]` - Transaction details

#### Decryption Services
- `POST /api/decrypt` - Decrypt single shielded transaction
  - Body: `{ txid, ufvk, height? }`
  - Returns: Decrypted transaction data with memos
  
- `POST /api/scan-wallet` - Scan multiple blocks for wallet activity
  - Body: `{ ufvk, blockHeightOption, specificBlocks?, walletBirthdayHeight? }`
  - Returns: List of transactions matching the UFVK

#### Search
- Global search supports:
  - Block height (e.g., `2700000`)
  - Block hash (64-character hex)
  - Transaction ID (64-character hex)

## 🛠️ Technology Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router and Server Components
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[React 18](https://react.dev/)** - UI library with Server Components
- **[Chart.js](https://www.chartjs.org/)** - Interactive price charts
- **[date-fns](https://date-fns.org/)** - Date formatting and manipulation
- **CSS Variables** - Custom theme system with dark/light modes

### Backend & APIs
- **[Socket.IO Client](https://socket.io/)** - Real-time bidirectional communication
- **Next.js API Routes** - Serverless API endpoints
- **Zcash JSON-RPC** - Direct blockchain data access
- **CoinGecko API** - Cryptocurrency market data

### External Services
- **[ElizaOS](https://github.com/ai16z/eliza)** - AI agent framework
- **[Railway](https://railway.app/)** - Cloud deployment platform
- **[GetBlock.io](https://getblock.io/)** - Hosted Zcash RPC nodes
- **PostgreSQL** - Caching database for scanner service

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control

## 💻 Project Structure

```
zcashExplorer/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── decrypt/         # Single transaction decryption
│   │   └── scan-wallet/     # Wallet scanner
│   ├── block/[id]/          # Block detail pages
│   ├── blocks/              # Blocks list
│   ├── tx/[txid]/           # Transaction detail pages
│   ├── txs/                 # Transactions list
│   ├── decrypt/             # Decryption tools page
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home dashboard
│   └── globals.css          # Global styles and themes
│
├── components/              # React components
│   ├── AgentChatWidget.tsx  # AI chat interface
│   ├── BlocksTable.tsx      # Blocks display component
│   ├── ChatClient.tsx       # Socket.IO chat client
│   ├── CoinDetails.tsx      # Market data card
│   ├── DonationModal.tsx    # Support donation modal
│   ├── Footer.tsx           # Site footer
│   ├── Header.tsx           # Navigation header
│   ├── Preloader.tsx        # Loading animation
│   ├── PriceChart.tsx       # 30-day price chart
│   ├── RawModal.tsx         # Raw transaction viewer
│   ├── ThemeProvider.tsx    # Theme context
│   └── WalletScanModal.tsx  # Scan results display
│
├── lib/                     # Utility libraries
│   ├── zcashRpcClient.ts    # RPC client with fallback
│   └── utils.ts             # Helper functions
│
├── public/                  # Static assets
├── .env.local              # Environment variables (not committed)
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues
- Check existing issues before creating new ones
- Provide detailed reproduction steps
- Include screenshots for UI issues
- Specify your environment (OS, browser, Node version)

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Keep PRs focused and atomic

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 👥 Team

Built with ❤️ by:
- **[Daniel](https://twitter.com/danny_4reel)** - Lead Developer
- **[Christian](https://twitter.com/_christian_obi)** - Developer

## 🔗 Links

- **GitHub**: [Len3hq/zcash-explorer](https://github.com/Len3hq/zcash-explorer)
- **Twitter**: [@len3_x](https://x.com/len3_x)
- **Zcash Foundation**: [z.cash](https://z.cash/)
- **Zcash Documentation**: [zcash.readthedocs.io](https://zcash.readthedocs.io/)

## ❤️ Support

If you find this explorer useful, please consider:
- ⭐ Starring the repository
- 📢 Sharing with the Zcash community
- 💰 Supporting via the "Support Our Work" button in the footer

---

<div align="center">

**[Back to Top](#zcash-explorer)**

Made with privacy and transparency in mind 🔐

</div>
