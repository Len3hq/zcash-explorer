// Zcash RPC Client with fallback support
// When using GetBlock:
// - ZCASH_RPC_URL should be the full Zcash endpoint URL from their dashboard
// - ZCASH_RPC_FALLBACK_URL is the fallback endpoint if primary fails
// - ZCASH_GETBLOCK_API_KEY is optional: if provided, it will be sent as x-api-key

const ZCASH_RPC_URL = process.env.ZCASH_RPC_URL;
const ZCASH_RPC_FALLBACK_URL = process.env.ZCASH_RPC_FALLBACK_URL || 'https://go.getblock.io/9fd49adc25574cefbc9efd703be5d1b6/';
const ZCASH_GETBLOCK_API_KEY = process.env.ZCASH_GETBLOCK_API_KEY;

if (!ZCASH_RPC_URL) {
  console.warn('[zcashRpcClient] Warning: ZCASH_RPC_URL not set. Will use fallback endpoint.');
}

async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const endpoints = [ZCASH_RPC_URL, ZCASH_RPC_FALLBACK_URL].filter(Boolean);
  
  if (endpoints.length === 0) {
    throw new Error('No RPC endpoints configured');
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

  let lastError: any;
  
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    const isFallback = i > 0;
    
    try {
      if (isFallback) {
        console.log(`[zcashRpcClient] Trying fallback endpoint for ${method}`);
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res?.text();
        throw new Error(`RPC HTTP error ${res.status}: ${text}`);
      }

      const json = await res?.json();
      if (json?.error) {
        throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
      }
      
      if (isFallback) {
        console.log(`[zcashRpcClient] Fallback successful for ${method}`);
      }
      
      return json?.result;
      
    } catch (err: any) {
      lastError = err;
      const message = err?.message || String(err);
      const code = (err as any)?.code || (err as any)?.cause?.code || 0;
      console.error(`[zcashRpcClient] RPC call failed for endpoint ${i + 1}/${endpoints.length}`, { 
        url: endpoint, 
        method,
        code, 
        message 
      });
      
      // Continue to next endpoint if available
      if (i < endpoints.length - 1) {
        continue;
      }
    }
  }
  
  // All endpoints failed
  console.error('[zcashRpcClient] All RPC endpoints failed', { method, lastError: lastError?.message });
  throw new Error(`RPC call failed: ${lastError?.message || 'Unknown error'}`);
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
