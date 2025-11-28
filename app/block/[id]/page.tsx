export const revalidate = 30;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlock, getBlockHash } from '@/lib/zcashRpcClient';
import { computeBlockSummary } from '@/lib/utils';
import ExplainerCard from '@/components/ExplainerCard';
import HashDisplay from '@/components/HashDisplay';

export default async function BlockPage({ params }: { params: { id: string } }) {
  const { id } = params;
  let block;

  try {
    if (/^\d+$/.test(id)) {
      // Numeric: treat as block height
      const height = parseInt(id, 10);
      const hash = await getBlockHash(height);
      block = await getBlock(hash);
    } else {
      // Non-numeric: treat as block hash
      block = await getBlock(id);
    }

    if (!block) {
      notFound();
    }
  } catch (err) {
    notFound();
  }

  const summary = await computeBlockSummary(block);

  return (
    <main className="container wide-layout">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header & Navigation */}
        <div className="page-header-flex">
          <div className="page-header-main">
            <div className="page-title-row">
              <h1 className="page-title">Block #{summary.height}</h1>
              <span className="badge">Height {summary.height}</span>
            </div>
            <div className="text-muted text-sm">
              <span>Mined {summary.minedOn}</span>
              <span className="text-xs"> ({summary.minedAgo})</span>
            </div>
          </div>

          <div className="nav-buttons">
            {block.previousblockhash ? (
              <Link
                href={`/block/${block.previousblockhash}`}
                className="nav-btn"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
                <span>Prev</span>
              </Link>
            ) : (
              <span className="nav-btn disabled">
                <i className="fa-solid fa-chevron-left text-xs"></i>
                <span>Prev</span>
              </span>
            )}

            {block.nextblockhash ? (
              <Link
                href={`/block/${block.nextblockhash}`}
                className="nav-btn"
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </Link>
            ) : (
              <span className="nav-btn disabled">
                <span>Next</span>
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </span>
            )}
          </div>
        </div>

        <section className="grid-2">
          {/* Primary block details */}
          <div className="card block-main-card">
            <div className="card-header">
              <div className="section-title">Summary</div>
            </div>

            <div className="detail-list">
              <div className="detail-item">
                <div className="key-label">Block Hash</div>
                <HashDisplay hash={summary.hash} />
              </div>

              <div className="detail-item">
                <div className="key-label">Miner</div>
                <div className="key-value kv-mono break-all">{summary.miner || 'Unknown'}</div>
              </div>

              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Input Count</div>
                  <div className="key-value">{summary.inputCount}</div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Output Count</div>
                  <div className="key-value">{summary.outputCount}</div>
                </div>
              </div>

              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Input Total</div>
                  <div className="key-value text-accent">{summary.inputTotal.toFixed(4)} ZEC</div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Output Total</div>
                  <div className="key-value text-accent">{summary.outputTotal.toFixed(4)} ZEC</div>
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
                  <div className="key-label">Difficulty</div>
                  <div className="key-value text-sm">
                    {typeof block.difficulty === 'number' ? block.difficulty.toLocaleString() : block.difficulty || '–'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Size</div>
                  <div className="key-value text-sm">
                    {(block.size || block.strippedsize || 0).toLocaleString()} bytes
                  </div>
                </div>
              </div>

              <div className="key-value-grid">
                <div className="detail-item">
                  <div className="key-label">Version</div>
                  <div className="key-value text-sm">{block.version != null ? block.version : '–'}</div>
                </div>
                <div className="detail-item">
                  <div className="key-label">Confirmations</div>
                  <div className="key-value text-sm">{block.confirmations != null ? block.confirmations : '–'}</div>
                </div>
              </div>

              <div className="detail-item">
                <div className="key-label">Bits</div>
                <div className="key-value kv-mono text-sm">{block.bits || '–'}</div>
              </div>

              <div className="detail-item">
                <div className="key-label">Merkle Root</div>
                <HashDisplay hash={block.merkleroot} truncate="middle" />
              </div>

              <div className="detail-item">
                <div className="key-label">Chainwork</div>
                <HashDisplay hash={block.chainwork} truncate="middle" />
              </div>

              <div className="detail-item">
                <div className="key-label">Nonce</div>
                <div className="key-value kv-mono text-sm break-all">{block.nonce != null ? block.nonce : '–'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="section-title">Transactions</div>
            <span className="badge">{block.tx?.length || 0} Transactions</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(block.tx) &&
                  block.tx.map((tx: any) => {
                    const txid = typeof tx === 'string' ? tx : tx.txid;
                    return (
                      <tr key={txid}>
                        <td>
                          <HashDisplay hash={txid} truncate={false} className="desktop-only" />
                          <HashDisplay hash={txid} truncate="middle" className="mobile-only" />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            href={`/tx/${txid}`}
                            className="text-accent text-sm font-medium"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        <ExplainerCard
          title="How to read this block"
          description="This view breaks down a single Zcash block into human‑readable summary, technical header fields, and included transactions."
          items={[
            {
              label: 'Transaction totals',
              body:
                'Input and output counts and totals give an approximate view of how much transparent value moved in this block. Shielded value may not be fully visible.',
            },
            {
              label: 'Technical details',
              body:
                'Fields like difficulty, size, version, bits, merkle root, chainwork, and nonce come from the raw block header and help describe how hard the block was to mine and how it links into the chain.',
            },
          ]}
        />
      </div>
    </main>
  );
}
