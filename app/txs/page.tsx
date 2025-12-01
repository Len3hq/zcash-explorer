export const dynamic = 'force-dynamic';
export const revalidate = 10;

import Link from 'next/link';
import { getBlockchainInfo } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';
import ExplainerCard from '@/components/ExplainerCard';
import HashDisplay from '@/components/HashDisplay';
import { format } from 'date-fns';

export default async function TransactionsPage() {
  // Fetch a window of blocks to display recent transactions
  const blocksPerFetch = 25;
  const maxTransactions = 25;

  const info = await getBlockchainInfo();
  const bestHeight = info.blocks;

  const recentBlocks = await fetchRecentBlocks(bestHeight, blocksPerFetch);

  const txs: any[] = [];
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
          : entry.vjoinsplit && entry.vjoinsplit.length || (typeof entry.valueBalance === 'number' && entry.valueBalance !== 0)
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

  // Display the most recent transactions up to the limit
  const displayedTxs = txs.slice(0, maxTransactions);

  return (
    <main className="container wide-layout">
      <div className="flex flex-col gap-6">
        <section className="card table-card">
          <div className="card-header">
            <div className="section-title">Recent Transactions</div>
            <span className="card-subtext">Latest {displayedTxs.length} transactions</span>
          </div>
          <p className="text-muted text-sm mb-4 px-4">
            This table displays the {maxTransactions} most recent transactions from the latest blocks. Each transaction shows its type (Coinbase, Shielded, or Transparent), block information, and transfer details.
          </p>

          {/* Desktop Table */}
          <div className="table-wrapper desktop-only">
            <table className="txs-table">
              <thead>
                <tr>
                  <th>TxID</th>
                  <th>Block</th>
                  <th>Height</th>
                  <th>Time</th>
                  <th>Inputs</th>
                  <th>Outputs</th>
                  <th>Output (ZEC)</th>
                  <th>Tx Type</th>
                </tr>
              </thead>
              <tbody>
                {displayedTxs.map((row) => (
                  <tr key={row.txid}>
                    <td>
                      <Link href={`/tx/${row.txid}`} className="text-accent hover:underline">
                        <HashDisplay hash={row.txid} truncate="middle" copyable={true} />
                      </Link>
                    </td>
                    <td>
                      <Link href={`/block/${row.blockHash}`} className="text-accent hover:underline">
                        <HashDisplay hash={row.blockHash} truncate="middle" copyable={false} />
                      </Link>
                    </td>
                    <td>
                      <Link href={`/block/${row.blockHash}`} className="text-heading hover:text-accent font-mono">
                        {row.height}
                      </Link>
                    </td>
                    <td className="timestamp text-xs whitespace-nowrap">
                      {format(new Date(row.time * 1000), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td>{row.inputsCount != null ? row.inputsCount : '–'}</td>
                    <td>{row.outputsCount != null ? row.outputsCount : '–'}</td>
                    <td>
                      {typeof row.outputTotal === 'number' ? (
                        row.outputTotal.toFixed(4)
                      ) : (
                        <span className="muted">–</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${row.txType === 'Coinbase' ? 'bg-yellow-100 text-yellow-800' :
                        row.txType === 'Shielded' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {row.txType === 'Coinbase' && <i className="fa-solid fa-coins" aria-hidden="true"></i>}
                        {row.txType === 'Shielded' && <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>}
                        {row.txType === 'Transparent' && <i className="fa-solid fa-eye" aria-hidden="true"></i>}
                        {row.txType}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedTxs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted">
                      No transactions found in recent blocks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only space-y-3">
            {displayedTxs.map((row) => (
              <div key={row.txid} className="tx-card-mobile">
                <div className="tx-card-header">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${row.txType === 'Coinbase' ? 'bg-yellow-100 text-yellow-800' :
                      row.txType === 'Shielded' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                      {row.txType === 'Coinbase' && <i className="fa-solid fa-coins" aria-hidden="true"></i>}
                      {row.txType === 'Shielded' && <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>}
                      {row.txType === 'Transparent' && <i className="fa-solid fa-eye" aria-hidden="true"></i>}
                      {row.txType}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-heading text-lg">
                      {typeof row.outputTotal === 'number' ? row.outputTotal.toFixed(4) : '–'} ZEC
                    </div>
                    <div className="text-xs text-muted">Output Total</div>
                  </div>
                </div>

                <div className="tx-card-body">
                  <div className="tx-card-row">
                    <span className="tx-card-label">Transaction ID</span>
                    <div className="tx-card-value">
                      <HashDisplay hash={row.txid} truncate="middle" copyable={true} />
                    </div>
                  </div>

                  <div className="tx-card-row">
                    <span className="tx-card-label">Block Hash</span>
                    <Link href={`/block/${row.blockHash}`} className="tx-card-value tx-card-link">
                      <HashDisplay hash={row.blockHash} truncate="middle" copyable={false} />
                    </Link>
                  </div>

                  <div className="tx-card-row">
                    <span className="tx-card-label">Block Height</span>
                    <Link href={`/block/${row.blockHash}`} className="tx-card-value tx-card-link">
                      #{row.height}
                    </Link>
                  </div>

                  <div className="tx-card-row">
                    <span className="tx-card-label">Timestamp</span>
                    <span className="tx-card-value">
                      <i className="fa-solid fa-clock mr-1 text-muted"></i>
                      {format(new Date(row.time * 1000), 'MMM dd, yyyy HH:mm:ss')}
                    </span>
                  </div>
                </div>

                <div className="tx-card-footer">
                  <div className="tx-card-stat">
                    <i className="fa-solid fa-arrow-down text-muted"></i>
                    <span className="tx-card-stat-value">{row.inputsCount ?? '–'}</span>
                    <span className="tx-card-stat-label">Inputs</span>
                  </div>
                  <div className="tx-card-stat">
                    <i className="fa-solid fa-arrow-up text-muted"></i>
                    <span className="tx-card-stat-value">{row.outputsCount ?? '–'}</span>
                    <span className="tx-card-stat-label">Outputs</span>
                  </div>
                  <Link href={`/tx/${row.txid}`} className="tx-card-view-btn">
                    View Details
                    <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
            {displayedTxs.length === 0 && (
              <div className="text-center py-8 text-muted">
                No transactions found in recent blocks.
              </div>
            )}
          </div>
        </section>

        <ExplainerCard
          title="How to read recent transactions"
          description="This table shows a rolling window of the latest transactions seen in recent blocks."
          items={[
            {
              label: 'Inputs and outputs',
              body:
                'Input and output counts show how many transparent inputs and outputs are decoded for the transaction. A dash means that detail was not available from the node.',
            },
            {
              label: 'Transaction type',
              body:
                'Coinbase transactions mint new ZEC as block rewards, Shielded transactions touch Zcash privacy pools, and Transparent transactions move funds using t‑addresses.',
            },
          ]}
        />
      </div>
    </main>
  );
}
