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

### 1. **Zcash Transaction Decryptor** (`zcashShieldedTxDecryption`)
**Purpose**: Decrypt shielded Zcash transactions using Unified Full Viewing Keys (UFVK)

**Repository**: [zcashShieldedTxDecryption](https://github.com/Len3hq/zcashShieldedTxDecryption)
**Repository**: [zcashblockdecryption](https://github.com/Len3hq/zcashblockdecryption)

**Features:**
- ✅ Decrypt Sapling and Orchard shielded outputs
- ✅ Extract transaction memos
- ✅ Scan wallet by block range, last 1 hour, or wallet birthday
- ✅ Privacy-focused (UFVK never stored)
- ✅ Support for up to 100 blocks per scan

### 2. **Zcash AI Agent** (`zcashagent103`)
**Purpose**: AI-powered assistant for Zcash-related questions

**Repository**: [zcashagent103](https://github.com/orgs/Len3hq/repositories)

**Technology**: ElizaOS (AI agent framework)

**Features:**
- ✅ Answer questions about Zcash protocol
- ✅ Explain shielded transactions and privacy features
- ✅ Provide blockchain data insights
- ✅ Context-aware responses
- ✅ Typing indicators and connection status

### 3. **GetBlock RPC Provider**
**Purpose**: Hosted Zcash node RPC access

### 4. **CoinGecko API**
**Purpose**: Zcash market data and price information


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


# ============================================
# Decryption Services (Optional)
# ============================================
# Single transaction decryption
ZCASH_DECRYPT_API_URL=

# Wallet scanner (batch block decryption)
ZCASH_SCANNER_API_URL=

# ============================================
# ElizaOS Agent (Optional)
# ============================================
NEXT_PUBLIC_ELIZA_SOCKET_URL=
NEXT_PUBLIC_ELIZA_AGENT_ID=

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

## 📚 Documentation

Comprehensive guides and references:

### Setup Guides
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for AI agent setup
- **[AGENT_INTEGRATION_GUIDE.md](./AGENT_INTEGRATION_GUIDE.md)** - Detailed agent integration documentation
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Technical implementation summary
- **[WALLET_SCAN_INTEGRATION.md](./WALLET_SCAN_INTEGRATION.md)** - Wallet scanning feature guide

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

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 👥 Team

Built with ❤️ by:
- **[Daniel](https://twitter.com/danny_4reel)** - Developer
- **[Realist](https://twitter.com/_christian_obi)** - Developer

## 🔗 Links

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
