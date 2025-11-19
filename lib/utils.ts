import { getBlockHash, getBlock, getRawTransaction } from './zcashRpcClient';

export function formatRelativeTime(epochSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(now - epochSeconds, 0);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

// helper to fetch a window of recent blocks (simple, RPC-heavy but OK for demo)
export async function fetchRecentBlocks(startHeight: number, count: number) {
  const blocks = [];
  const endHeight = Math.max(startHeight - count + 1, 0);
  for (let h = startHeight; h >= endHeight; h -= 1) {
    const hash = await getBlockHash(h);
    const block = await getBlock(hash);

    const size = block.size || block.strippedsize || null;
    let outputTotal = null;

    if (Array.isArray(block.tx) && block.tx.length > 0 && typeof block.tx[0] !== 'string') {
      // verbose=2 block, can sum outputs without extra RPC calls
      outputTotal = 0;
      for (const tx of block.tx) {
        if (!Array.isArray(tx.vout)) continue;
        for (const vout of tx.vout) {
          if (typeof vout.value === 'number') {
            outputTotal += vout.value;
          }
        }
      }
    }

    blocks.push({
      height: h,
      hash,
      time: block.time,
      txCount: Array.isArray(block.tx) ? block.tx.length : block.nTx,
      size,
      outputTotal,
      raw: block,
    });
  }
  return blocks;
}

// decode a single transaction including input/output totals by fetching prevouts
export async function decodeTransactionWithPrevouts(txid: string) {
  const tx = await getRawTransaction(txid, true);
  const isCoinbase = Array.isArray(tx.vin) && tx.vin.length > 0 && !!tx.vin[0].coinbase;

  const outputs = Array.isArray(tx.vout)
    ? tx.vout.map((v: any) => ({
        n: v.n,
        value: v.value,
        type: v.scriptPubKey && v.scriptPubKey.type,
        addresses:
          (v.scriptPubKey && (v.scriptPubKey.addresses || (v.scriptPubKey.address ? [v.scriptPubKey.address] : []))) || [],
      }))
    : [];

  const outputTotal = outputs.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

  let inputTotal = 0;
  const inputCount = Array.isArray(tx.vin) ? tx.vin.length : 0;

  if (!isCoinbase && Array.isArray(tx.vin)) {
    const values = await Promise.all(
      tx.vin
        .filter((v: any) => v.txid && typeof v.vout === 'number')
        .map(async (v: any) => {
          try {
            const prev = await getRawTransaction(v.txid, true);
            if (!Array.isArray(prev.vout)) return 0;
            const prevOut = prev.vout.find((o: any) => o.n === v.vout);
            return prevOut && typeof prevOut.value === 'number' ? prevOut.value : 0;
          } catch (e) {
            return 0;
          }
        })
    );
    inputTotal = values.reduce((a, b) => a + b, 0);
  }

  return {
    tx,
    isCoinbase,
    inputCount,
    outputCount: Array.isArray(tx.vout) ? tx.vout.length : 0,
    inputTotal,
    outputTotal,
    outputs,
  };
}

export async function computeBlockSummary(block: any) {
  const txArray = Array.isArray(block.tx) ? block.tx : [];
  const hasVerboseTx = txArray.length > 0 && typeof txArray[0] !== 'string';

  let txCount = txArray.length;
  let inputCount = 0;
  let outputCount = 0;
  let inputTotal = 0; // we do not recompute exact input totals here to avoid extra RPC calls
  let outputTotal = 0;
  let miner = null;

  if (hasVerboseTx) {
    for (let i = 0; i < txArray.length; i += 1) {
      const tx = txArray[i];
      const vins = Array.isArray(tx.vin) ? tx.vin : [];
      const vouts = Array.isArray(tx.vout) ? tx.vout : [];

      inputCount += vins.length;
      outputCount += vouts.length;

      for (const vout of vouts) {
        if (typeof vout.value === 'number') {
          outputTotal += vout.value;
        }
      }

      // Use the first transaction's first output as the miner address (coinbase)
      if (i === 0 && vouts.length > 0 && !miner) {
        const first = vouts[0];
        if (first.scriptPubKey) {
          if (Array.isArray(first.scriptPubKey.addresses) && first.scriptPubKey.addresses.length > 0) {
            miner = first.scriptPubKey.addresses[0];
          } else if (first.scriptPubKey.address) {
            miner = first.scriptPubKey.address;
          }
        }
      }
    }
  }

  const minedOnDate = new Date(block.time * 1000);
  const minedOn = minedOnDate
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  return {
    hash: block.hash,
    height: block.height,
    txCount,
    inputCount,
    outputCount,
    inputTotal,
    outputTotal,
    miner,
    minedOn,
    minedAgo: formatRelativeTime(block.time),
    size: block.size || block.strippedsize || null,
  };
}
