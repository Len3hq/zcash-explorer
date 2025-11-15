require('dotenv').config();
const fetch = require('node-fetch');

// When using GetBlock:
// - ZCASH_RPC_URL should be the full Zcash endpoint URL from their dashboard
// - ZCASH_GETBLOCK_API_KEY is optional: if provided, it will be sent as x-api-key
//   (some GetBlock URLs embed the key in the URL itself)
const {
  ZCASH_RPC_URL,
  ZCASH_GETBLOCK_API_KEY,
} = process.env;

if (!ZCASH_RPC_URL) {
  console.warn('[zcashRpcClient] Warning: ZCASH_RPC_URL not set. RPC calls will fail until configured.');
}

async function rpcCall(method, params = []) {
  if (!ZCASH_RPC_URL) {
    throw new Error('ZCASH_RPC_URL is not configured');
  }

  const body = {
    jsonrpc: '2.0',
    id: 'zcash-explorer',
    method,
    params,
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  // If you have an API key from GetBlock, it will be sent here.
  // If you are using a URL that already encodes the key (e.g. via query string or path),
  // you can leave ZCASH_GETBLOCK_API_KEY empty.
  if (ZCASH_GETBLOCK_API_KEY) {
    headers['x-api-key'] = ZCASH_GETBLOCK_API_KEY;
  }

  const res = await fetch(ZCASH_RPC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC HTTP error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

async function getBlockchainInfo() {
  return rpcCall('getblockchaininfo');
}

async function getBestBlockHash() {
  return rpcCall('getbestblockhash');
}

async function getBlockHash(height) {
  return rpcCall('getblockhash', [height]);
}

async function getBlock(blockHash) {
  // verbose = 2 to include transaction details if supported; fallback to 1
  try {
    return await rpcCall('getblock', [blockHash, 2]);
  } catch (e) {
    return rpcCall('getblock', [blockHash, 1]);
  }
}

async function getRawTransaction(txid, verbose = true) {
  return rpcCall('getrawtransaction', [txid, verbose ? 1 : 0]);
}

async function getNetworkHashPs(blocks = 120, height = -1) {
  // approximate network hash rate (for stats)
  return rpcCall('getnetworkhashps', [blocks, height]);
}

module.exports = {
  getBlockchainInfo,
  getBestBlockHash,
  getBlockHash,
  getBlock,
  getRawTransaction,
  getNetworkHashPs,
};
