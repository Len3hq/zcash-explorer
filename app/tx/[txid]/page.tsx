export const revalidate = 30;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decodeTransactionWithPrevouts } from '@/lib/utils';
import RawModal from '@/components/RawModal';
import ExplainerCard from '@/components/ExplainerCard';
import HashDisplay from '@/components/HashDisplay';
import CollapsibleSection from '@/components/CollapsibleSection';

export default async function TransactionPage({ params }: { params: { txid: string } }) {
  const { txid } = params;
  let decoded;

  try {
    decoded = await decodeTransactionWithPrevouts(txid);
  } catch (err) {
    notFound();
  }

  const { tx, isCoinbase, inputCount, outputCount, inputTotal, outputTotal, outputs } = decoded;

  const isShielded = (tx.vjoinsplit && tx.vjoinsplit.length > 0) ||
    (typeof tx.valueBalance === 'number' && tx.valueBalance !== 0) ||
    (tx.saplingBundle || tx.orchardBundle);

  const txType = isCoinbase ? 'Coinbase' : isShielded ? 'Shielded' : 'Transparent';
  const txTypeClass = isCoinbase ? 'tx-type-coinbase' : isShielded ? 'tx-type-shielded' : 'tx-type-transparent';

  const formattedTime = tx.time
    ? new Date(tx.time * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    })
    : 'Pending';

  return (
    <main className="container wide-layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div className="page-header-flex">
          <div className="page-header-main">
            <div className="page-title-row" style={{ alignItems: 'center' }}>
              <h1 className="page-title">Transaction</h1>
              <span className={`tx-type-badge ${txTypeClass}`}>
                {isCoinbase && <i className="fa-solid fa-hammer"></i>}
                {isShielded && <i className="fa-solid fa-shield-halved"></i>}
                {!isCoinbase && !isShielded && <i className="fa-solid fa-eye"></i>}
                {txType}
              </span>
            </div>
            <div className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
              <HashDisplay hash={tx.txid} truncate="middle" />
            </div>
          </div>
        </div>

        <section className="grid-2">
          {/* Primary transaction summary */}
          <div className="card block-main-card">
            <div className="card-header">
              <div className="section-title">Summary</div>
            </div>

            <div className="detail-list">
              <div className="detail-item">
                <div className="key-label">Block</div>
                <div className="key-value kv-mono">
                  {tx.blockhash ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link href={`/block/${tx.blockhash}`} className="text-accent">
                        <HashDisplay hash={tx.blockhash} truncate="middle" copyable={false} />
                      </Link>
                      <span className="text-muted text-xs">
                        ({tx.confirmations} confs)
                      </span>
                    </div>
                  ) : (
                    <span className="text-gold font-medium">Unconfirmed (Mempool)</span>
                  )}
                </div>
              </div>

              <div className="detail-item">
                <div className="key-label">Time</div>
                <div className="key-value">
                  {formattedTime}
                </div>
              </div>

              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Inputs</div>
                  <div className="key-value">{inputCount} <span className="text-sm text-muted">({inputTotal.toFixed(4)} ZEC)</span></div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Outputs</div>
                  <div className="key-value">{outputCount} <span className="text-sm text-muted">({outputTotal.toFixed(4)} ZEC)</span></div>
                </div>
              </div>

              <div className="detail-item">
                <div className="key-label">Fee</div>
                <div className="key-value text-sm">
                  {!isCoinbase && inputTotal > outputTotal
                    ? `${(inputTotal - outputTotal).toFixed(8)} ZEC`
                    : '0.00000000 ZEC'}
                </div>
              </div>
            </div>
          </div>

          {/* Technical details */}
          <div className="card block-tech-card">
            <div className="card-header">
              <div className="section-title">Technical Details</div>
            </div>
            <div className="detail-list">
              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Size</div>
                  <div className="key-value text-sm">
                    {tx.size != null ? tx.size.toLocaleString() + ' B' : '–'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Virtual Size</div>
                  <div className="key-value text-sm">
                    {tx.vsize != null ? tx.vsize.toLocaleString() + ' vB' : '–'}
                  </div>
                </div>
              </div>

              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Version</div>
                  <div className="key-value text-sm">{tx.version}</div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Lock Time</div>
                  <div className="key-value text-sm">{tx.locktime}</div>
                </div>
              </div>

              {tx.expiryheight != null && (
                <div className="detail-item">
                  <div className="key-label">Expiry Height</div>
                  <div className="key-value text-sm">{tx.expiryheight}</div>
                </div>
              )}

              {tx.valueBalance !== undefined && tx.valueBalance !== 0 && (
                <div className="detail-item">
                  <div className="key-label">Value Balance</div>
                  <div className="key-value text-sm">{tx.valueBalance}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Inputs & Outputs Visualization - Collapsible */}
        <div className="grid-2">
          <CollapsibleSection title="Inputs (vin)" count={inputCount} defaultOpen={true}>
            <div className="tx-flow-col">
              {tx.vin && tx.vin.length > 0 ? (
                tx.vin.map((vin: any, i: number) => (
                  <div key={i} className="tx-list-item mb-2">
                    {vin.coinbase ? (
                      <div className="tx-list-row">
                        <span className="badge">Coinbase</span>
                        <span className="text-xs text-muted break-all">{vin.coinbase}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div className="tx-list-row">
                          <Link href={`/tx/${vin.txid}`} className="text-accent hover:underline text-xs font-mono">
                            {vin.txid?.substring(0, 12)}...
                          </Link>
                          <span className="text-xs text-muted">#{vin.vout}</span>
                        </div>
                        {vin.prevout && (
                          <div className="tx-list-row">
                            <span className="text-xs font-mono text-muted">{vin.prevout.scriptPubKey?.addresses?.[0]?.substring(0, 16)}...</span>
                            <span className="text-sm font-medium">{vin.prevout.value} ZEC</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-muted italic text-sm">No inputs (Shielded?)</div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Outputs (vout)" count={outputCount} defaultOpen={true}>
            <div className="tx-flow-col">
              {outputs.map((o: any) => (
                <div key={o.n} className="tx-list-item mb-2">
                  <div className="tx-list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {o.addresses && o.addresses.length ? (
                        <HashDisplay hash={o.addresses[0]} truncate="middle" hashClassName="text-accent" />
                      ) : (
                        <span className="text-muted italic">Non-standard / Shielded</span>
                      )}
                      <div className="text-xs text-muted mt-1">{o.type}</div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap ml-2">
                      {typeof o.value === 'number' ? o.value.toFixed(8) : '0.00000000'} ZEC
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* Raw Data Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tx.vjoinsplit && tx.vjoinsplit.length > 0 && (
            <CollapsibleSection title="Shielded JoinSplits">
              <pre style={{ fontSize: '0.75rem' }}>{JSON.stringify(tx.vjoinsplit, null, 2)}</pre>
            </CollapsibleSection>
          )}
        </div>

        <RawModal
          data={tx}
          buttonClassName="raw-tx-btn"
        />

        <ExplainerCard
          title="How to read this transaction"
          description="This page decodes a single Zcash transaction into summary fields, decoded outputs, and raw structures from the Zcash node."
          items={[
            {
              label: 'Summary card',
              body:
                'Shows the TxID, version, lock time, number of inputs and outputs, total value moved, and whether the transaction is Coinbase, Shielded, or Transparent.',
            },
            {
              label: 'Inputs and Outputs',
              body:
                'Expand the collapsible sections to see detailed lists of inputs (sources of funds) and outputs (destinations). Shielded transfers may not show explicit inputs/outputs here.',
            },
          ]}
        />
      </div>
    </main>
  );
}
