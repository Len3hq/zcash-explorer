export const dynamic = 'force-dynamic';
export const revalidate = 5;

import Link from 'next/link';
import { getBlockchainInfo } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';

export default async function TransactionsPage() {
  const info = await getBlockchainInfo();
  const bestHeight = info.blocks;
  const recentBlocks = await fetchRecentBlocks(bestHeight, 5);

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

  const limited = txs.slice(0, 25);

  return (
    <main className="container wide-layout">
      <section className="card table-card">
        <div className="card-header">
          <div className="section-title">Recent Transactions</div>
          <span className="card-subtext">Up to 25 recent transactions from the latest blocks</span>
        </div>
        <div className="table-wrapper txs-table-wrapper">
          <table className="txs-table">
            <thead>
              <tr>
                <th>TxID</th>
                <th>Block</th>
                <th>Height</th>
                <th>Time (UTC)</th>
                <th>Inputs</th>
                <th>Outputs</th>
                <th>Output (ZEC)</th>
                <th>Tx Type</th>
              </tr>
            </thead>
            <tbody>
              {limited.map((row) => (
                <tr key={row.txid}>
                  <td className="hash hash-wrap">
                    <Link href={`/tx/${row.txid}`} className="hash-with-copy">
                      <span className="hash-truncate">{row.txid}</span>
                    </Link>
                  </td>
                  <td className="hash hash-wrap">
                    <Link href={`/block/${row.blockHash}`} className="hash-with-copy">
                      <span className="hash-truncate">{row.blockHash}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="hash-with-copy">
                      <Link href={`/block/${row.blockHash}`} className="hash-truncate">
                        {row.height}
                      </Link>
                    </span>
                  </td>
                  <td className="timestamp">{new Date(row.time * 1000).toISOString()}</td>
                  <td>{row.inputsCount != null ? row.inputsCount : '–'}</td>
                  <td>{row.outputsCount != null ? row.outputsCount : '–'}</td>
                  <td>
                    {typeof row.outputTotal === 'number' ? (
                      row.outputTotal.toFixed(8)
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                  <td>
                    <span className="tx-type">
                      {row.txType === 'Coinbase' ? (
                        <i className="fa-solid fa-coins tx-type-icon tx-type-coinbase" aria-hidden="true"></i>
                      ) : row.txType === 'Shielded' ? (
                        <i className="fa-solid fa-shield-halved tx-type-icon tx-type-shielded" aria-hidden="true"></i>
                      ) : row.txType === 'Transparent' ? (
                        <i className="fa-regular fa-circle tx-type-icon tx-type-transparent" aria-hidden="true"></i>
                      ) : (
                        <i className="fa-regular fa-question-circle tx-type-icon" aria-hidden="true"></i>
                      )}
                      <span>{row.txType}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
