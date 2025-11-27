# Wallet Scanning Integration

This document describes the integration between the Zcash Explorer and the zcashtxdecryption block scanner service.

## Overview

The wallet scanning feature allows users to scan multiple blocks for their shielded transactions using a Unified Full Viewing Key (UFVK). The feature provides three modes of operation:

1. **Last 1 Hour** - Scans approximately the last 48 blocks (Zcash ~75s block time)
2. **Specific Blocks** - Scan specific block heights or ranges
3. **Wallet Birthday** - Scan from a wallet's birthday height to the current block

## Architecture

```
Zcash Explorer (Next.js)
    ↓ (User submits UFVK + block range)
    ↓
/api/scan-wallet (Proxy API Route)
    ↓ (Validates blocks, generates list)
    ↓
zcashtxdecryption Service (http://localhost:3005)
    ↓ (Fetches blocks, decrypts transactions)
    ↓
Response with transactions ←
    ↓
WalletScanModal (Display results)
    ↓
Export to File (Download results)
```

## Components

### 1. API Route: `/app/api/scan-wallet/route.ts`

This endpoint acts as a proxy between the Explorer frontend and the zcashtxdecryption service.

**Features:**
- Validates UFVK format (must start with `uview1` or `uviewtest1`)
- Generates block height lists based on user selection
- Validates blocks exist before scanning
- Limits scans to maximum 100 blocks
- Proxies requests to the scanner service

**Request Format:**
```typescript
{
  ufvk: string;
  blockHeightOption: 'specific' | 'last1hr' | 'walletBirthday';
  specificBlocks?: string;  // e.g., "3148327,3148328" or "3148327-3148330"
  walletBirthdayHeight?: number;
}
```

**Response Format:**
```typescript
{
  success: boolean;
  blocksScanned: number;
  transactionsFound: number;
  transactions: TransactionDetails[];
}
```

### 2. Frontend: `/app/decrypt/page.tsx`

The decrypt page contains two tabs:
- **Single Transaction** - Decrypt a specific transaction ID
- **Scan Wallet (UFVK)** - Scan multiple blocks for wallet transactions

**Wallet Scan Form Features:**
- UFVK input (required)
- Block height selection via radio buttons:
  - Last 1 hour (default)
  - Specific blocks (with text input for ranges/lists)
  - Wallet birthday (with height input)
- Loading state during scan
- Error handling with user-friendly messages

### 3. Modal Component: `/components/WalletScanModal.tsx`

Displays scan results in a modal with:
- Summary (blocks scanned, transactions found)
- Transaction table with expandable outputs
- Export to file functionality
- Keyboard navigation (ESC to close)

**Displayed Fields:**
- Transaction ID (truncated)
- Amount (ZEC)
- Block Height
- Timestamp
- Outputs (expandable with protocol, type, direction, memo)

### 4. Export Functionality

Results can be exported to a `.txt` file containing:
- Scan summary
- All transaction details
- Output information including memos

## Setup Instructions

### Prerequisites

1. **zcashtxdecryption Service Running**
   ```bash
   cd ~/projects/zcashtxdecryption/block_scanner_api
   npm install
   npm run build
   npm start
   ```
   Service should be running on `http://localhost:3005`

2. **Environment Variables**
   Add to `/home/realist/projects/zcashExplorer/.env.local`:
   ```env
   SCANNER_API_URL=http://localhost:3005
   ```

3. **Zcash Explorer Running**
   ```bash
   cd ~/projects/zcashExplorer
   npm run dev
   ```

## Usage

1. Navigate to the "Shielded Transaction" tab in the explorer
2. Click on the "Scan wallet (UFVK)" tab
3. Enter your Unified Full Viewing Key
4. Select block height range:
   - **Last 1 hour**: Automatically scans recent blocks
   - **Specific blocks**: Enter comma-separated heights (e.g., `3148327,3148328`) or ranges (e.g., `3148327-3148330`)
   - **Wallet birthday**: Enter your wallet's birthday height to scan from that point to current
5. Click "Scan wallet"
6. View results in the modal
7. Click "Export to File" to download the results

## Block Height Options

### Last 1 Hour
- Calculates ~48 blocks back from current height
- Best for checking recent activity
- No additional input required

### Specific Blocks
- Supports comma-separated lists: `3148327,3148328,3148329`
- Supports ranges: `3148327-3148330`
- Supports mixed: `3148300,3148310-3148315,3148320`
- Maximum 100 blocks per scan

### Wallet Birthday
- Scans from wallet birthday height to current block
- Limited to most recent 100 blocks if range exceeds limit
- Useful for full wallet synchronization

## API Limits

- **Maximum blocks per scan**: 100
- **UFVK format**: Must start with `uview1` (mainnet) or `uviewtest1` (testnet)
- **Rate limiting**: Inherited from GetBlock.io API (~20 req/s)

## Performance

- **Cached blocks**: <5 seconds for 100 blocks
- **Uncached blocks**: 30-40 seconds for 100 blocks (due to GetBlock.io rate limits)
- **Mixed**: Proportional to number of uncached blocks

## Security & Privacy

- UFVK is **never logged or stored** on the server
- Only blockchain data is cached in the scanner service
- Decryption happens on-demand
- Results are displayed client-side only
- No sensitive data is persisted

## Error Handling

The system handles various error scenarios:

- **Invalid UFVK format**: User-friendly validation message
- **No blocks to scan**: Validates selection before API call
- **Exceeds 100 blocks**: Automatically truncates or shows error
- **Scanner service unavailable**: Clear error message
- **Block not found**: Continues with valid blocks
- **Network errors**: Graceful degradation with error display

## Future Enhancements

Potential improvements:
- CSV export option
- Transaction filtering (amount, date, protocol)
- Pagination for large result sets
- Progress indicator for long scans
- Caching scan results client-side
- Export to PDF with formatting
