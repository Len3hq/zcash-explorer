// Zcash RPC Client
// When using GetBlock:
// - ZCASH_RPC_URL should be the full Zcash endpoint URL from their dashboard
// - ZCASH_GETBLOCK_API_KEY is optional: if provided, it will be sent as x-api-key

const ZCASH_RPC_URL = process.env.ZCASH_RPC_URL;
const ZCASH_GETBLOCK_API_KEY = process.env.ZCASH_GETBLOCK_API_KEY;

if (!ZCASH_RPC_URL) {
  console.warn('[zcashRpcClient] Warning: ZCASH_RPC_URL not set. RPC calls will fail until configured.');
}

async function rpcCall(method: string, params: any[] = []): Promise<any> {
  if (!ZCASH_RPC_URL) {
    throw new Error('ZCASH_RPC_URL is not configured');
  }

  const body = {
    jsonrpc: '2.0',
    id: 'zcash-explorer',
    method,
    params,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If you have an API key from GetBlock, it will be sent here.
  if (ZCASH_GETBLOCK_API_KEY) {
    headers['x-api-key'] = ZCASH_GETBLOCK_API_KEY;
  }

  let res: Response;
  try {
    res = await fetch(ZCASH_RPC_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err: any) {
    // Surface network-level errors (like connect timeout) with a clearer message
    const message = err?.message || String(err);
    const code = (err as any)?.code || (err as any)?.cause?.code;
    console.error('[zcashRpcClient] RPC fetch failed', { url: ZCASH_RPC_URL, code, message });
    throw new Error(
      `[zcashRpcClient] Failed to reach Zcash RPC at "${ZCASH_RPC_URL}": ${code ? code + ' - ' : ''}${message}`,
    );
  }

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

export async function getBlockchainInfo() {
  return rpcCall('getblockchaininfo');
}

export async function getBlockHash(height: number) {
  return rpcCall('getblockhash', [height]);
}

export async function getBlock(blockHash: string) {
  // verbose = 2 to include transaction details if supported; fallback to 1
  try {
    return await rpcCall('getblock', [blockHash, 2]);
  } catch (e) {
    return rpcCall('getblock', [blockHash, 1]);
  }
}

export async function getRawTransaction(txid: string, verbose: boolean = true) {
  return rpcCall('getrawtransaction', [txid, verbose ? 1 : 0]);
}

export async function getNetworkHashPs(blocks: number = 120, height: number = -1) {
  // approximate network hash rate (for stats)
  return rpcCall('getnetworkhashps', [blocks, height]);
}
