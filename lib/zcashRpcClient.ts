// Zcash RPC Client
// Configure primary and optional fallback Zcash JSON-RPC endpoints via
// ZCASH_RPC_URL (primary) and ZCASH_RPC_FALLBACK_URL (secondary).
// If you are using a provider such as GetBlock, point ZCASH_RPC_URL at the
// full endpoint URL from their dashboard. Optionally, set ZCASH_GETBLOCK_API_KEY
// if your provider requires an API key header.

const ZCASH_RPC_URL = process.env.ZCASH_RPC_URL;
const ZCASH_RPC_FALLBACK_URL = process.env.ZCASH_RPC_FALLBACK_URL;
const ZCASH_GETBLOCK_API_KEY = process.env.ZCASH_GETBLOCK_API_KEY;

if (!ZCASH_RPC_URL && !ZCASH_RPC_FALLBACK_URL) {
  console.warn(
    '[zcashRpcClient] Warning: neither ZCASH_RPC_URL nor ZCASH_RPC_FALLBACK_URL is set. RPC calls will fail until at least one is configured.',
  );
}

function shouldTryFallback(codeOrStatus: unknown, message: string | undefined): boolean {
  const msg = message || '';
  const codeStr = typeof codeOrStatus === 'number' ? String(codeOrStatus) : String(codeOrStatus || '');

  // HTTP statuses that are typically transient or rate-limit related
  const transientHttpStatuses = new Set(['402', '429', '502', '503', '504']);
  if (transientHttpStatuses.has(codeStr)) return true;

  // Common network / transport error codes from Node/undici
  const transientNetworkCodes = new Set([
    'UND_ERR_CONNECT_TIMEOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
  ]);
  if (transientNetworkCodes.has(codeStr)) return true;

  // Fallback heuristics based on error message
  if (/rate limit/i.test(msg)) return true;
  if (/Too Many Requests/i.test(msg)) return true;
  if (/UND_ERR_CONNECT_TIMEOUT/.test(msg)) return true;

  return false;
}

async function rpcCall(method: string, params: any[] = []): Promise<any> {
  const endpoints: { url: string; label: 'primary' | 'fallback' }[] = [];

  if (ZCASH_RPC_URL) {
    endpoints.push({ url: ZCASH_RPC_URL, label: 'primary' });
  }
  if (ZCASH_RPC_FALLBACK_URL && ZCASH_RPC_FALLBACK_URL !== ZCASH_RPC_URL) {
    endpoints.push({ url: ZCASH_RPC_FALLBACK_URL, label: 'fallback' });
  }

  if (endpoints.length === 0) {
    throw new Error('No Zcash RPC endpoint configured (ZCASH_RPC_URL and ZCASH_RPC_FALLBACK_URL are empty)');
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

  const errorMessages: string[] = [];

  for (const { url, label } of endpoints) {
    let lastError: any;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const status = res.status;
        const snippet = text.slice(0, 512);

        const httpError = new Error(`RPC HTTP error ${status} (${label}): ${snippet}`);

        // Decide whether we should try the fallback endpoint on HTTP errors
        if (label === 'primary' && endpoints.length > 1 && shouldTryFallback(status, snippet)) {
          console.warn('[zcashRpcClient] Primary RPC HTTP error, trying fallback', {
            method,
            status,
          });
          errorMessages.push(httpError.message);
          continue; // try next endpoint
        }

        throw httpError;
      }

      const json = await res.json().catch((e: any) => {
        throw new Error(`Failed to parse RPC JSON response from ${label}: ${e?.message || String(e)}`);
      });

      if (json?.error) {
        const rpcErrorMsg = `RPC error from ${label} endpoint: ${JSON.stringify(json.error)}`;

        if (label === 'primary' && endpoints.length > 1 && shouldTryFallback(undefined, rpcErrorMsg)) {
          console.warn('[zcashRpcClient] Primary RPC returned error, trying fallback', {
            method,
            error: json.error,
          });
          errorMessages.push(rpcErrorMsg);
          continue; // try next endpoint
        }

        throw new Error(rpcErrorMsg);
      }

      return json?.result;
    } catch (err: any) {
      lastError = err;
      const message = err?.message || String(err);
      const code = (err as any)?.code || (err as any)?.cause?.code || 0;

      console.error('[zcashRpcClient] RPC call failed', {
        url,
        method,
        endpoint: label,
        code,
        message,
      });

      // If primary fails with a transient / rate-limit style error, fall through to fallback
      if (label === 'primary' && endpoints.length > 1 && shouldTryFallback(code, message)) {
        console.warn('[zcashRpcClient] Primary RPC endpoint failed, trying fallback', {
          method,
          code,
        });
        errorMessages.push(message);
        continue; // try next endpoint
      }

      errorMessages.push(message);

      // For fallback (or non-transient errors), do not keep looping
      console.error('[zcashRpcClient] RPC endpoint failed', { method, endpoint: label, lastError: message });
      throw new Error(`RPC call failed: ${message}`);
    }
  }

  console.error('[zcashRpcClient] All RPC endpoints failed', { method, errors: errorMessages });
  throw new Error(`RPC call failed for ${method}: ${errorMessages.join(' | ') || 'Unknown error'}`);
}


// Simple in-memory cache
const cache = new Map<string, { value: any; expiry: number }>();

function getFromCache(key: string) {
  const item = cache.get(key);
  if (item && Date.now() < item.expiry) {
    return item.value;
  }
  return null;
}

function setCache(key: string, value: any, ttlSeconds: number) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

// Cache TTL configuration
const TTL = {
  SHORT: 10,   // 10 seconds (blockchain info, height)
  MEDIUM: 60,  // 1 minute
  LONG: 300,   // 5 minutes (stats, hashrate, immutable data like old blocks)
  FOREVER: 24 * 60 * 60, // 24 hours (effectively forever for runtime)
};

export async function getBlockchainInfo() {
  const key = 'getblockchaininfo';
  const cached = getFromCache(key);
  if (cached) return cached;

  const result = await rpcCall('getblockchaininfo');
  setCache(key, result, TTL.SHORT);
  return result;
}

export async function getBlockCount() {
  const key = 'getblockcount';
  const cached = getFromCache(key);
  if (cached) return cached;

  const result = await rpcCall('getblockcount');
  setCache(key, result, TTL.SHORT);
  return result;
}

export async function getBlockHash(height: number) {
  const key = `getblockhash:${height}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  const result = await rpcCall('getblockhash', [height]);
  // Block hashes for finalized heights shouldn't change, but deep reorgs are possible.
  // 5 minutes is safe enough for explorer purposes.
  setCache(key, result, TTL.LONG);
  return result;
}

export async function getBlock(blockHash: string) {
  const key = `getblock:${blockHash}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  let result;
  // verbose = 2 to include transaction details if supported; fallback to 1
  try {
    result = await rpcCall('getblock', [blockHash, 2]);
  } catch (e) {
    result = await rpcCall('getblock', [blockHash, 1]);
  }

  setCache(key, result, TTL.LONG);
  return result;
}

export async function getRawTransaction(txid: string, verbose: boolean = true) {
  const key = `getrawtransaction:${txid}:${verbose}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  const result = await rpcCall('getrawtransaction', [txid, verbose ? 1 : 0]);
  setCache(key, result, TTL.LONG);
  return result;
}

export async function getNetworkHashPs(blocks: number = 120, height: number = -1) {
  const key = `getnetworkhashps:${blocks}:${height}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  // approximate network hash rate (for stats)
  const result = await rpcCall('getnetworkhashps', [blocks, height]);
  setCache(key, result, TTL.LONG);
  return result;
}

export async function getChainTxStats(nblocks?: number, blockHash?: string) {
  const key = `getchaintxstats:${nblocks}:${blockHash}`;
  const cached = getFromCache(key);
  if (cached) return cached;

  // Get chain transaction statistics - returns txrate (tx/s), txcount, window stats
  // Not all providers expose this method; in that case we degrade gracefully.
  try {
    const result = await rpcCall('getchaintxstats', nblocks ? [nblocks, blockHash] : []);
    setCache(key, result, TTL.LONG);
    return result;
  } catch (e: any) {
    const message = e?.message || '';

    // If the RPC method is not available or the endpoint is unreachable, treat as optional
    if (message.includes('Method not found') || message.includes('RPC HTTP error 404')) {
      console.warn('[zcashRpcClient] getchaintxstats not supported on current endpoint, returning null');
      return null;
    }

    // Re-throw unexpected errors so callers can decide how to handle them
    throw e;
  }
}
