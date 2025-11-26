'use client';

import { FormEvent, useState } from 'react';
import RawModal from '@/components/RawModal';
import ExplainerCard from '@/components/ExplainerCard';

interface OutputInfo {
  protocol: string;
  amount_zats: number;
  index: number;
  transfer_type: string;
  direction: string;
  memo: string;
}

interface TransactionDetails {
  transaction_id: string;
  transaction_hash: string;
  amount_zats: number;
  amount_zec: number;
  incoming_zats: number;
  incoming_zec: number;
  change_zats: number;
  change_zec: number;
  outgoing_zats: number;
  outgoing_zec: number;
  fee_zats: number;
  fee_zec: number;
  timestamp: string;
  block_height: number;
  outputs: OutputInfo[];
  tx_size_bytes: number;
}

function formatZec(zats: number): string {
  return (zats / 100_000_000).toFixed(8);
}

export default function DecryptPage() {
  const [activeTab, setActiveTab] = useState<'tx' | 'wallet'>('tx');
  const [txid, setTxid] = useState('');
  const [ufvk, setUfvk] = useState('');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionDetails | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const payload: { txid: string; ufvk: string; height?: number } = {
        txid: txid.trim(),
        ufvk: ufvk.trim(),
      };

      const h = parseInt(height.trim(), 10);
      if (!Number.isNaN(h) && h > 0) {
        payload.height = h;
      }

      const res = await fetch('/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Failed to decrypt transaction');
        return;
      }

      setResult(data as TransactionDetails);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error while decrypting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container wide-layout">
      <section className="card">
        <div className="card-header">
          <div className="section-title">Shielded Decryption Tools</div>
          <span className="card-subtext">
            Work with your Unified Full Viewing Key (UFVK) to inspect shielded activity.
          </span>
        </div>

        <div className="decrypt-disclaimer">
          <strong>Privacy note.</strong> Your viewing key is handled only for this session and is never written to disk or
          stored in logs by this explorer. The key is used solely to derive the shielded notes and memos that belong to
          you; once the response is returned, it lives only in your browser memory until you reload or leave this page.
        </div>

        <div className="decrypt-tabs" role="tablist" aria-label="Shielded decryption modes">
          <button
            type="button"
            className={`decrypt-tab ${activeTab === 'tx' ? 'decrypt-tab-active' : ''}`}
            onClick={() => setActiveTab('tx')}
            role="tab"
            aria-selected={activeTab === 'tx'}
          >
            Single transaction
          </button>
          <button
            type="button"
            className={`decrypt-tab ${activeTab === 'wallet' ? 'decrypt-tab-active' : ''}`}
            onClick={() => setActiveTab('wallet')}
            role="tab"
            aria-selected={activeTab === 'wallet'}
          >
            Scan wallet (UFVK)
          </button>
        </div>


        {activeTab === 'tx' && (
          <form
            onSubmit={handleSubmit}
            className="decrypt-form decrypt-panel"
            role="tabpanel"
            aria-label="Single transaction"
          >
            <div className="decrypt-form-grid">
              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="txid-input">
                  Transaction ID (txid)
                </label>
                <input
                  id="txid-input"
                  className="search-input"
                  type="text"
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                  placeholder="64-character transaction ID"
                  required
                />
                <p className="decrypt-helper">Paste the 64-character transaction ID you want to inspect.</p>
              </div>

              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="height-input">
                  Block height (optional)
                </label>
                <input
                  id="height-input"
                  className="search-input"
                  type="number"
                  min={0}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Defaults to 2,500,000 if omitted"
                />
                <p className="decrypt-helper">Height is used as a hint for consensus rules; you can usually leave this blank.</p>
              </div>

              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="ufvk-input">
                  Unified Full Viewing Key (UFVK)
                </label>
                <textarea
                  id="ufvk-input"
                  className="search-input"
                  value={ufvk}
                  onChange={(e) => setUfvk(e.target.value)}
                  placeholder="uview1... (mainnet) or uviewtest1... (testnet)"
                  rows={3}
                  required
                />
                <p className="decrypt-helper">Use a view-only key (UFVK) from your wallet; this does not grant spending access.</p>
              </div>
            </div>

            <div className="decrypt-form-actions">
              <button type="submit" className="button-primary" disabled={loading}>
                {loading ? 'Decrypting…' : 'Show shielded transaction'}
              </button>
              {error && <span className="decrypt-error">{error}</span>}
            </div>
          </form>
        )}

        {activeTab === 'wallet' && (
          <div className="decrypt-form decrypt-panel" role="tabpanel" aria-label="Scan wallet">
            <div className="decrypt-form-grid">
              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="wallet-ufvk-input">
                  Unified Full Viewing Key (UFVK)
                </label>
                <textarea
                  id="wallet-ufvk-input"
                  className="search-input"
                  value={ufvk}
                  onChange={(e) => setUfvk(e.target.value)}
                  placeholder="uview1... (mainnet) or uviewtest1... (testnet)"
                  rows={3}
                />
                <p className="decrypt-helper">
                  Use a view-only key from your wallet; this flow is designed for inspecting activity, not spending.
                </p>
              </div>

              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="wallet-height-input">
                  Starting block height (optional)
                </label>
                <input
                  id="wallet-height-input"
                  className="search-input"
                  type="number"
                  min={0}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Use a recent height to limit how far back the scan goes"
                />
                <p className="decrypt-helper">
                  A lower height means a deeper scan through the chain; a higher height is faster but only includes more
                  recent notes.
                </p>
              </div>
            </div>
            <div className="decrypt-form-actions">
              <button type="button" className="button-primary" disabled>
                Wallet scan coming soon
              </button>
            </div>
          </div>
        )}
      </section>

      {result && (
        <>
          <section className="mt-lg">
            <div className="card">
              <div className="card-header">
                <div className="section-title">Decryption Summary</div>
              </div>
              <div className="detail-list">
                <div className="detail-item">
                  <div className="key-label">Transaction hash</div>
                  <div className="key-value kv-mono">
                    <span className="hash-with-copy">
                      <span className="hash-truncate">{result.transaction_id}</span>
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Block height</div>
                  <div className="key-value">{result.block_height}</div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Transaction size</div>
                  <div className="key-value">{result.tx_size_bytes.toLocaleString()} bytes</div>
                </div>
              </div>
            </div>
          </section>

          <section className="card mt-lg">
            <div className="card-header">
              <div className="section-title">Decrypted Outputs</div>
              <span className="card-subtext">
                Outputs that belong to the provided UFVK, grouped by protocol and transfer type.
              </span>
            </div>
            {result.outputs.length === 0 ? (
              <p className="muted">No outputs in this transaction could be decrypted with the provided UFVK.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Protocol</th>
                      <th>Direction</th>
                      <th>Transfer type</th>
                      <th>Index</th>
                      <th>Amount (ZEC)</th>
                      <th>Memo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.outputs.map((o: OutputInfo, idx: number) => (
                      <tr key={`${o.protocol}-${o.index}-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{o.protocol}</td>
                        <td>{o.direction}</td>
                        <td>{o.transfer_type}</td>
                        <td>{o.index}</td>
                        <td>{formatZec(o.amount_zats)}</td>
                        <td className="hash">
                          {o.memo ? (
                            <span className="hash-truncate">{o.memo}</span>
                          ) : (
                            <span className="muted">(no memo)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <RawModal data={result} />
        </>
      )}

      <ExplainerCard
        title="How this shielded‑transaction viewer works"
        description="Use a Unified Full Viewing Key (UFVK) to inspect your own shielded activity without exposing spending keys."
        items={[
          {
            label: 'What you provide',
            body:
              'You submit a transaction ID (txid) and a UFVK from your wallet. An optional block height hint helps the backend select the right consensus rules but is not required.',
          },
          {
            label: 'What the UFVK exposes',
            body:
              'The UFVK is view‑only. It lets the server discover which shielded outputs and memos belong to you so they can be decoded, but it cannot move funds or sign transactions.',
          },
        ]}
      />
    </main>
  );
}
