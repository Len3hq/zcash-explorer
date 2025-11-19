import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decodeTransactionWithPrevouts } from '@/lib/utils';
import RawModal from '@/components/RawModal';

export default async function TransactionPage({ params }: { params: { txid: string } }) {
  const { txid } = params;
  let decoded;

  try {
    decoded = await decodeTransactionWithPrevouts(txid);
  } catch (err) {
    notFound();
  }

  const { tx, isCoinbase, inputCount, outputCount, inputTotal, outputTotal, outputs } = decoded;

  return (
    <main className="container wide-layout">
      <section className="grid-2">
        {/* Primary transaction summary */}
        <div className="card block-main-card">
          <div className="page-header">
            <h1 className="page-title">Transaction</h1>
            <div className="chip">
              <span className="badge-dot"></span>
              <span className="chip-label">TxID</span>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-item">
              <div className="key-label">TxID</div>
              <div className="key-value kv-mono">
                <span className="hash-with-copy">
                  <span className="hash-truncate">{tx.txid}</span>
                </span>
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Version</div>
              <div className="key-value">{tx.version}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Lock Time</div>
              <div className="key-value">{tx.locktime}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Inputs</div>
              <div className="key-value">
                {inputCount} ({inputTotal.toFixed(8)} ZEC)
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Outputs</div>
              <div className="key-value">
                {outputCount} ({outputTotal.toFixed(8)} ZEC)
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Type</div>
              <div className="key-value">
                {isCoinbase
                  ? 'Coinbase'
                  : (tx.vjoinsplit && tx.vjoinsplit.length) ||
                    (typeof tx.valueBalance === 'number' && tx.valueBalance !== 0)
                  ? 'Shielded'
                  : 'Transparent'}
              </div>
            </div>

            {typeof tx.confirmations === 'number' && (
              <div className="detail-item">
                <div className="key-label">Confirmations</div>
                <div className="key-value">{tx.confirmations}</div>
              </div>
            )}

            {tx.blockhash && (
              <div className="detail-item">
                <div className="key-label">Block</div>
                <div className="key-value kv-mono">
                  <Link href={`/block/${tx.blockhash}`} className="hash-with-copy">
                    <span className="hash-truncate">{tx.blockhash}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technical transaction details */}
        <div className="card block-tech-card">
          <div className="card-header">
            <div className="section-title">Technical Details</div>
          </div>
          <div className="detail-list">
            <div className="detail-item">
              <div className="key-label">Size</div>
              <div className="key-value">
                {tx.size != null ? tx.size.toLocaleString() + ' bytes' : '–'}
              </div>
            </div>

            {tx.vsize != null && (
              <div className="detail-item">
                <div className="key-label">vSize</div>
                <div className="key-value">{tx.vsize.toLocaleString()}</div>
              </div>
            )}

            {tx.time != null && (
              <div className="detail-item">
                <div className="key-label">Time</div>
                <div className="key-value">{new Date(tx.time * 1000).toISOString()}</div>
              </div>
            )}

            {tx.expiryheight != null && (
              <div className="detail-item">
                <div className="key-label">Expiry height</div>
                <div className="key-value">{tx.expiryheight}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card mt-lg">
        <div className="card-header">
          <div className="section-title">Decoded Outputs</div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Type</th>
                <th>Value (ZEC)</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((o: any) => (
                <tr key={o.n}>
                  <td>{o.n}</td>
                  <td className="hash">
                    {o.addresses && o.addresses.length ? (
                      <span className="hash-with-copy">
                        <span className="hash-truncate">{o.addresses[0]}</span>
                      </span>
                    ) : (
                      <span className="muted">(no address)</span>
                    )}
                  </td>
                  <td>{o.type || 'unknown'}</td>
                  <td>{typeof o.value === 'number' ? o.value.toFixed(8) : '0.00000000'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-lg">
        <div className="card-header">
          <div className="section-title">Inputs (vin)</div>
        </div>
        <pre>{JSON.stringify(tx.vin, null, 2)}</pre>
      </section>

      <section className="card mt-lg">
        <div className="card-header">
          <div className="section-title">Outputs (vout)</div>
        </div>
        <pre>{JSON.stringify(tx.vout, null, 2)}</pre>
      </section>

      {tx.vjoinsplit && tx.vjoinsplit.length > 0 && (
        <section className="card mt-lg">
          <div className="card-header">
            <div className="section-title">Shielded JoinSplits (vjoinsplit)</div>
          </div>
          <pre>{JSON.stringify(tx.vjoinsplit, null, 2)}</pre>
        </section>
      )}

      {tx.valueBalance !== undefined && (
        <section className="card mt-lg">
          <div className="card-header">
            <div className="section-title">Value Balance</div>
          </div>
          <pre>{JSON.stringify(tx.valueBalance, null, 2)}</pre>
        </section>
      )}

      <RawModal data={tx} />
    </main>
  );
}
