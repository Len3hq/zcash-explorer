export const revalidate = 30;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlock, getBlockHash } from '@/lib/zcashRpcClient';
import { computeBlockSummary } from '@/lib/utils';

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
      <section className="grid-2">
        {/* Primary block details */}
        <div className="card block-main-card">
          <div className="page-header">
            <h1 className="page-title">Block #{summary.height}</h1>
            <div className="chip">
              <span className="badge-dot"></span>
              <span className="chip-label">Height {summary.height}</span>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-item">
              <div className="key-label">Hash</div>
              <div className="key-value kv-mono">
                <span className="hash-with-copy">
                  <span className="hash-truncate" title={summary.hash}>
                    {summary.hash}
                  </span>
                </span>
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Mined on</div>
              <div className="key-value">
                <span>{summary.minedOn}</span>
                <span className="muted"> ({summary.minedAgo})</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Miner</div>
              <div className="key-value kv-mono">{summary.miner || 'Unknown'}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Input count</div>
              <div className="key-value">{summary.inputCount}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Output count</div>
              <div className="key-value">{summary.outputCount}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Input total</div>
              <div className="key-value">{summary.inputTotal.toFixed(8)} ZEC</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Output total</div>
              <div className="key-value">{summary.outputTotal.toFixed(8)} ZEC</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Previous block</div>
              <div className="key-value kv-mono">
                {block.previousblockhash ? (
                  <Link href={`/block/${block.previousblockhash}`} className="hash-with-copy">
                    <span className="hash-truncate" title={block.previousblockhash}>
                      {block.previousblockhash}
                    </span>
                  </Link>
                ) : (
                  <span className="muted">N/A</span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Next block</div>
              <div className="key-value kv-mono">
                {block.nextblockhash ? (
                  <Link href={`/block/${block.nextblockhash}`} className="hash-with-copy">
                    <span className="hash-truncate" title={block.nextblockhash}>
                      {block.nextblockhash}
                    </span>
                  </Link>
                ) : (
                  <span className="muted">Tip</span>
                )}
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
            <div className="detail-item">
              <div className="key-label">Difficulty</div>
              <div className="key-value">
                {typeof block.difficulty === 'number' ? block.difficulty : block.difficulty || '–'}
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Size</div>
              <div className="key-value">
                {(block.size || block.strippedsize || 0).toLocaleString()} bytes
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Version</div>
              <div className="key-value">{block.version != null ? block.version : '–'}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Confirmations</div>
              <div className="key-value">{block.confirmations != null ? block.confirmations : '–'}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Bits</div>
              <div className="key-value kv-mono">{block.bits || '–'}</div>
            </div>

            <div className="detail-item">
              <div className="key-label">Merkle root</div>
              <div className="key-value kv-mono">
                {block.merkleroot ? (
                  <span className="hash-truncate" title={block.merkleroot}>
                    {block.merkleroot}
                  </span>
                ) : (
                  <span className="muted">–</span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Chainwork</div>
              <div className="key-value kv-mono">
                {block.chainwork ? (
                  <span className="hash-truncate" title={block.chainwork}>
                    {block.chainwork}
                  </span>
                ) : (
                  <span className="muted">–</span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="key-label">Nonce</div>
              <div className="key-value kv-mono">{block.nonce != null ? block.nonce : '–'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-lg">
        <div className="card-header">
          <div className="section-title">Transactions</div>
          <span className="card-subtext">Click a transaction to view full details</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>TxID</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(block.tx) &&
                block.tx.map((tx: any) => {
                  const txid = typeof tx === 'string' ? tx : tx.txid;
                  return (
                    <tr key={txid}>
                      <td className="hash">
                        <Link href={`/tx/${txid}`} className="hash-with-copy">
                          <span className="hash-truncate" title={txid}>
                            {txid}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
