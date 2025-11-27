'use client';

import { FormEvent, useState } from 'react';
import RawModal from '@/components/RawModal';
import ExplainerCard from '@/components/ExplainerCard';
import WalletScanModal from '@/components/WalletScanModal';

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

interface ScanResult {
  success: boolean;
  blocksScanned: number;
  transactionsFound: number;
  transactions: TransactionDetails[];
}

export default function DecryptPage() {
  const [activeTab, setActiveTab] = useState<'tx' | 'wallet'>('tx');
  const [txid, setTxid] = useState('');
  const [ufvk, setUfvk] = useState('');
  const [walletUfvk, setWalletUfvk] = useState('');
  const [height, setHeight] = useState('');
  const [blockHeightOption, setBlockHeightOption] = useState<'specific' | 'last1hr' | 'walletBirthday'>('last1hr');
  const [specificBlocks, setSpecificBlocks] = useState('');
  const [walletBirthdayHeight, setWalletBirthdayHeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionDetails | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setWalletError(null);
              setScanResult(null);
              setWalletLoading(true);

              try {
                const payload: {
                  ufvk: string;
                  blockHeightOption: string;
                  specificBlocks?: string;
                  walletBirthdayHeight?: number;
                } = {
                  ufvk: walletUfvk.trim(),
                  blockHeightOption,
                };

                if (blockHeightOption === 'specific' && specificBlocks) {
                  payload.specificBlocks = specificBlocks;
                }

                if (blockHeightOption === 'walletBirthday' && walletBirthdayHeight) {
                  const height = parseInt(walletBirthdayHeight, 10);
                  if (!isNaN(height) && height > 0) {
                    payload.walletBirthdayHeight = height;
                  }
                }

                const res = await fetch('/api/scan-wallet', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                });

                const data = await res.json();

                if (!res.ok) {
                  setWalletError(typeof data?.error === 'string' ? data.error : 'Failed to scan wallet');
                  return;
                }

                setScanResult(data as ScanResult);
              } catch (err: unknown) {
                setWalletError(err instanceof Error ? err.message : 'Unexpected error while scanning');
              } finally {
                setWalletLoading(false);
              }
            }}
            className="decrypt-form decrypt-panel"
            role="tabpanel"
            aria-label="Scan wallet"
          >
            <div className="decrypt-form-grid">
              <div className="decrypt-form-field">
                <label className="key-label" htmlFor="wallet-ufvk-input">
                  Unified Full Viewing Key (UFVK)
                </label>
                <textarea
                  id="wallet-ufvk-input"
                  className="search-input"
                  value={walletUfvk}
                  onChange={(e) => setWalletUfvk(e.target.value)}
                  placeholder="uview1... (mainnet) or uviewtest1... (testnet)"
                  rows={3}
                  required
                />
                <p className="decrypt-helper">
                  Use a view-only key from your wallet; this flow is designed for inspecting activity, not spending.
                </p>
              </div>

              <div className="decrypt-form-field">
                <label className="key-label">Block Height Range</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="blockHeightOption"
                      value="last1hr"
                      checked={blockHeightOption === 'last1hr'}
                      onChange={(e) => setBlockHeightOption(e.target.value as 'last1hr')}
                    />
                    <span>Last 1 hour (~48 blocks)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="blockHeightOption"
                      value="specific"
                      checked={blockHeightOption === 'specific'}
                      onChange={(e) => setBlockHeightOption(e.target.value as 'specific')}
                    />
                    <span>Specific block heights</span>
                  </label>
                  {blockHeightOption === 'specific' && (
                    <input
                      className="search-input"
                      type="text"
                      value={specificBlocks}
                      onChange={(e) => setSpecificBlocks(e.target.value)}
                      placeholder="e.g., 3148327,3148328 or 3148327-3148330"
                      style={{ marginLeft: '1.5rem' }}
                    />
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="blockHeightOption"
                      value="walletBirthday"
                      checked={blockHeightOption === 'walletBirthday'}
                      onChange={(e) => setBlockHeightOption(e.target.value as 'walletBirthday')}
                    />
                    <span>From wallet birthday</span>
                  </label>
                  {blockHeightOption === 'walletBirthday' && (
                    <input
                      className="search-input"
                      type="number"
                      min={0}
                      value={walletBirthdayHeight}
                      onChange={(e) => setWalletBirthdayHeight(e.target.value)}
                      placeholder="Enter wallet birthday block height"
                      style={{ marginLeft: '1.5rem' }}
                      required
                    />
                  )}
                </div>
                <p className="decrypt-helper" style={{ marginTop: '0.5rem' }}>
                  Choose how many blocks to scan. Note: Maximum 100 blocks per scan.
                </p>
              </div>
            </div>
            <div className="decrypt-form-actions">
              <button type="submit" className="button-primary" disabled={walletLoading}>
                {walletLoading ? 'Scanning…' : 'Scan wallet'}
              </button>
              {walletError && <span className="decrypt-error">{walletError}</span>}
            </div>
          </form>
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

      <WalletScanModal result={scanResult} onClose={() => setScanResult(null)} />
    </main>
  );
}
