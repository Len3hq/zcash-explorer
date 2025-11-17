const express = require('express');
const path = require('path');
require('dotenv').config();

const {
  getBlockchainInfo,
  getBlockHash,
  getBlock,
  getRawTransaction,
  getNetworkHashPs,
} = require('./zcashRpcClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// helper to fetch a window of recent blocks (simple, RPC-heavy but OK for demo)
async function fetchRecentBlocks(startHeight, count) {
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
async function decodeTransactionWithPrevouts(txid) {
  const tx = await getRawTransaction(txid, true);
  const isCoinbase = Array.isArray(tx.vin) && tx.vin.length > 0 && !!tx.vin[0].coinbase;

  const outputs = Array.isArray(tx.vout)
    ? tx.vout.map(v => ({
        n: v.n,
        value: v.value,
        type: v.scriptPubKey && v.scriptPubKey.type,
        addresses:
          (v.scriptPubKey && (v.scriptPubKey.addresses || (v.scriptPubKey.address ? [v.scriptPubKey.address] : []))) || [],
      }))
    : [];

  const outputTotal = outputs.reduce((sum, o) => sum + (o.value || 0), 0);

  let inputTotal = 0;
  const inputCount = Array.isArray(tx.vin) ? tx.vin.length : 0;

  if (!isCoinbase && Array.isArray(tx.vin)) {
    const values = await Promise.all(
      tx.vin
        .filter(v => v.txid && typeof v.vout === 'number')
        .map(async v => {
          try {
            const prev = await getRawTransaction(v.txid, true);
            if (!Array.isArray(prev.vout)) return 0;
            const prevOut = prev.vout.find(o => o.n === v.vout);
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

function formatRelativeTime(epochSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(now - epochSeconds, 0);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

async function computeBlockSummary(block) {
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

// Home page: show chain info, latest blocks, and derived stats
app.get('/', async (req, res) => {
  try {
    const info = await getBlockchainInfo();
    const bestHeight = info.blocks;

    // Fetch last 20 blocks to compute simple TPS / block rate
    const recentBlocks = await fetchRecentBlocks(bestHeight, 20);

    let txTotal = 0;
    let timeSpan = 0;
    if (recentBlocks.length >= 2) {
      const newest = recentBlocks[0];
      const oldest = recentBlocks[recentBlocks.length - 1];
      txTotal = recentBlocks.reduce((sum, b) => sum + (b.txCount || 0), 0);
      timeSpan = Math.max(newest.time - oldest.time, 1); // seconds
    }

    const approxTps = timeSpan > 0 ? txTotal / timeSpan : 0;
    const blocksPerHour = timeSpan > 0 ? (recentBlocks.length * 3600) / timeSpan : 0;

    let networkHash = null;
    try {
      networkHash = await getNetworkHashPs(120, -1);
    } catch (e) {
      // optional; ignore if RPC not available
    }

    let poolHoldings = null;
    if (Array.isArray(info.valuePools) && info.valuePools.length) {
      const pools = info.valuePools
        .filter(p => p && typeof p.chainValue === 'number')
        .map(p => ({
          id: p.id || p.poolName || 'Pool',
          chainValue: p.chainValue,
          monitored: !!p.monitored,
        }));

      if (pools.length) {
        const totalShielded = pools.reduce((sum, p) => sum + (p.chainValue || 0), 0);
        poolHoldings = { pools, totalShielded };
      }
    }

    // latest 10 blocks to display
    const blocks = recentBlocks.slice(0, 10).map(b => ({
      height: b.height,
      hash: b.hash,
      time: b.time,
      txCount: b.txCount,
    }));

    res.render('index', {
      info,
      blocks,
      stats: {
        approxTps,
        blocksPerHour,
        networkHash,
        poolHoldings,
      },
      activeTab: 'home',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error connecting to Zcash RPC endpoint.');
  }
});

// Search endpoint (handles block hash/height or txid)
app.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.redirect('/');
  }

  // Try block height
  if (/^\d+$/.test(query)) {
    const height = parseInt(query, 10);
    try {
      const hash = await getBlockHash(height);
      return res.redirect(`/block/${hash}`);
    } catch (e) {
      // fall through
    }
  }

  // Try block hash
  try {
    const block = await getBlock(query);
    if (block && block.hash) {
      return res.redirect(`/block/${block.hash}`);
    }
  } catch (e) {
    // ignore
  }

  // Assume txid
  return res.redirect(`/tx/${query}`);
});

// Block detail page (accepts either block height or block hash)
app.get('/block/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let block;

    if (/^\d+$/.test(id)) {
      // Numeric: treat as block height
      const height = parseInt(id, 10);
      try {
        const hash = await getBlockHash(height);
        block = await getBlock(hash);
      } catch (e) {
        return res.status(404).send('Block not found');
      }
    } else {
      // Non-numeric: treat as block hash
      block = await getBlock(id);
    }

    if (!block) {
      return res.status(404).send('Block not found');
    }

    const summary = await computeBlockSummary(block);

    res.render('block', {
      block,
      summary,
      activeTab: 'blocks',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching block');
  }
});

// Blocks page: list more recent blocks
app.get('/blocks', async (req, res) => {
  try {
    const info = await getBlockchainInfo();
    const bestHeight = info.blocks;
    const recentBlocks = await fetchRecentBlocks(bestHeight, 50);

    res.render('blocks', {
      info,
      activeTab: 'blocks',
      blocks: recentBlocks.map(b => ({
        height: b.height,
        hash: b.hash,
        time: b.time,
        txCount: b.txCount,
        size: b.size,
        outputTotal: b.outputTotal,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching blocks');
  }
});

// Transactions page: recent transactions from last 10 blocks
app.get('/txs', async (req, res) => {
  try {
    const info = await getBlockchainInfo();
    const bestHeight = info.blocks;
    const recentBlocks = await fetchRecentBlocks(bestHeight, 10);

    const txs = [];
    for (const b of recentBlocks) {
      if (!Array.isArray(b.raw.tx)) continue;

      const isVerbose = b.raw.tx.length > 0 && typeof b.raw.tx[0] !== 'string';

      for (const entry of b.raw.tx) {
        let txid;
        let inputsCount = null;
        let outputsCount = null;
        let outputTotal = null;
        let txType = 'Unknown';

        if (isVerbose && entry && typeof entry === 'object') {
          txid = entry.txid;

          const vins = Array.isArray(entry.vin) ? entry.vin : [];
          const vouts = Array.isArray(entry.vout) ? entry.vout : [];

          inputsCount = vins.length;
          outputsCount = vouts.length;

          let sum = 0;
          for (const v of vouts) {
            if (typeof v.value === 'number') sum += v.value;
          }
          outputTotal = sum;

          const isCoinbase = vins.length > 0 && !!(vins[0] && vins[0].coinbase);
          txType = isCoinbase
            ? 'Coinbase'
            : (entry.vjoinsplit && entry.vjoinsplit.length) || (typeof entry.valueBalance === 'number' && entry.valueBalance !== 0)
            ? 'Shielded'
            : 'Transparent';
        } else if (typeof entry === 'string') {
          txid = entry;
        }

        if (!txid) continue;

        txs.push({
          txid,
          blockHash: b.hash,
          height: b.height,
          time: b.time,
          inputsCount,
          outputsCount,
          outputTotal,
          txType,
        });
      }
    }

    const limited = txs.slice(0, 50);

    res.render('txs', {
      info,
      activeTab: 'txs',
      txs: limited,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching transactions');
  }
});

// Transaction detail page
app.get('/tx/:txid', async (req, res) => {
  const { txid } = req.params;
  try {
    const decoded = await decodeTransactionWithPrevouts(txid);
    const { tx, isCoinbase, inputCount, outputCount, inputTotal, outputTotal, outputs } = decoded;

    res.render('tx', {
      tx,
      decoded: {
        outputs,
        totalOutput: outputTotal,
        isCoinbase,
        inputTotal,
        inputCount,
        outputCount,
      },
      activeTab: 'txs',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching transaction');
  }
});

app.listen(PORT, () => {
  console.log(`Zcash explorer running on http://localhost:${PORT}`);
});
