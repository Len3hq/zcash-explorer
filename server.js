const express = require('express');
const path = require('path');
require('dotenv').config();

const {
  getBlockchainInfo,
  getBestBlockHash,
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

// Lightweight JSON stats endpoint for live dashboard updates
app.get('/api/summary', async (req, res) => {
  try {
    const info = await getBlockchainInfo();
    const bestHeight = info.blocks;
    const recentBlocks = await fetchRecentBlocks(bestHeight, 20);

    let txTotal = 0;
    let timeSpan = 0;
    if (recentBlocks.length >= 2) {
      const newest = recentBlocks[0];
      const oldest = recentBlocks[recentBlocks.length - 1];
      txTotal = recentBlocks.reduce((sum, b) => sum + (b.txCount || 0), 0);
      timeSpan = Math.max(newest.time - oldest.time, 1);
    }

    const approxTps = timeSpan > 0 ? txTotal / timeSpan : 0;
    const blocksPerHour = timeSpan > 0 ? (recentBlocks.length * 3600) / timeSpan : 0;

    let networkHash = null;
    try {
      networkHash = await getNetworkHashPs(120, -1);
    } catch (e) {
      // ignore
    }

    res.json({
      height: bestHeight,
      chain: info.chain,
      bestblockhash: info.bestblockhash,
      verificationprogress: info.verificationprogress,
      difficulty: info.difficulty,
      size_on_disk: info.size_on_disk,
      approxTps,
      blocksPerHour,
      networkHash,
      lastBlockTime: recentBlocks[0] ? recentBlocks[0].time : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
});

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
  const txIds = Array.isArray(block.tx)
    ? (typeof block.tx[0] === 'string' ? block.tx : block.tx.map(t => t.txid))
    : [];

  const decodedList = await Promise.all(txIds.map(id => decodeTransactionWithPrevouts(id)));

  let inputCount = 0;
  let outputCount = 0;
  let inputTotal = 0;
  let outputTotal = 0;

  for (const d of decodedList) {
    inputCount += d.inputCount;
    outputCount += d.outputCount;
    inputTotal += d.inputTotal;
    outputTotal += d.outputTotal;
  }

  const coinbase = decodedList[0] && decodedList[0].tx;
  let miner = null;
  if (coinbase && Array.isArray(coinbase.vout) && coinbase.vout.length > 0) {
    const first = coinbase.vout[0];
    if (first.scriptPubKey) {
      if (Array.isArray(first.scriptPubKey.addresses) && first.scriptPubKey.addresses.length > 0) {
        miner = first.scriptPubKey.addresses[0];
      } else if (first.scriptPubKey.address) {
        miner = first.scriptPubKey.address;
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
    txCount: txIds.length,
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

// Block detail page
app.get('/block/:id', async (req, res) => {
  const { id } = req.params; // block hash
  try {
    const block = await getBlock(id);
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
      for (const txid of b.raw.tx) {
        if (typeof txid === 'string') {
          txs.push({
            txid,
            blockHash: b.hash,
            height: b.height,
            time: b.time,
          });
        }
      }
    }

    // Limit to a reasonable number and enrich with IO counts
    const limited = txs.slice(0, 50);
    const detailed = [];
    for (const row of limited) {
      try {
        const tx = await getRawTransaction(row.txid, true);
        const isCoinbase = Array.isArray(tx.vin) && tx.vin.length > 0 && !!tx.vin[0].coinbase;
        const inputsCount = Array.isArray(tx.vin) ? tx.vin.length : 0;
        const outputsCount = Array.isArray(tx.vout) ? tx.vout.length : 0;
        let outputTotal = 0;
        if (Array.isArray(tx.vout)) {
          for (const v of tx.vout) {
            if (typeof v.value === 'number') outputTotal += v.value;
          }
        }
        const txType = isCoinbase
          ? 'Coinbase'
          : (tx.vjoinsplit && tx.vjoinsplit.length) || (typeof tx.valueBalance === 'number' && tx.valueBalance !== 0)
          ? 'Shielded'
          : 'Transparent';

        detailed.push({
          ...row,
          inputsCount,
          outputsCount,
          outputTotal,
          txType,
        });
      } catch (e) {
        detailed.push({ ...row, inputsCount: null, outputsCount: null, outputTotal: null, txType: 'Unknown' });
      }
    }

    res.render('txs', {
      info,
      activeTab: 'txs',
      txs: detailed,
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
