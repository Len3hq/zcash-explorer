'use client';

import { useEffect, useRef } from 'react';

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

interface ScanResult {
  success: boolean;
  blocksScanned: number;
  transactionsFound: number;
  transactions: TransactionDetails[];
}

interface WalletScanModalProps {
  result: ScanResult | null;
  onClose: () => void;
}

function formatDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function exportToPDF(result: ScanResult) {
  // Create a simple text-based PDF content
  const lines: string[] = [
    'Zcash Wallet Scan Results',
    '========================',
    '',
    `Blocks Scanned: ${result.blocksScanned}`,
    `Transactions Found: ${result.transactionsFound}`,
    `Export Date: ${new Date().toLocaleString()}`,
    '',
    '========================',
    '',
  ];

  result.transactions.forEach((tx, idx) => {
    lines.push(`Transaction ${idx + 1}:`);
    lines.push(`  ID: ${tx.transaction_id}`);
    lines.push(`  Amount: ${tx.amount_zec} ZEC`);
    lines.push(`  Block Height: ${tx.block_height}`);
    lines.push(`  Timestamp: ${formatDate(tx.timestamp)}`);
    lines.push('');
    lines.push('  Outputs:');
    
    tx.outputs.forEach((output, outIdx) => {
      lines.push(`    ${outIdx + 1}. Protocol: ${output.protocol}`);
      lines.push(`       Transfer Type: ${output.transfer_type}`);
      lines.push(`       Direction: ${output.direction}`);
      lines.push(`       Amount: ${(output.amount_zats / 100_000_000).toFixed(8)} ZEC`);
      lines.push(`       Memo: ${output.memo || '(no memo)'}`);
      lines.push('');
    });
    
    lines.push('------------------------');
    lines.push('');
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zcash-wallet-scan-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function WalletScanModal({ result, onClose }: WalletScanModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (result) {
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [result, onClose]);

  if (!result) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="section-title">Wallet Scan Results</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="scan-summary">
            <div className="scan-summary-item">
              <span className="key-label">Blocks Scanned</span>
              <span className="key-value">{result.blocksScanned}</span>
            </div>
            <div className="scan-summary-item">
              <span className="key-label">Transactions Found</span>
              <span className="key-value">{result.transactionsFound}</span>
            </div>
          </div>

          {result.transactionsFound === 0 ? (
            <p className="muted" style={{ marginTop: '1rem' }}>
              No transactions found in the scanned blocks for the provided UFVK.
            </p>
          ) : (
            <>
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                <button 
                  type="button" 
                  className="button-primary" 
                  onClick={() => exportToPDF(result)}
                  style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
                >
                  <i className="fa-solid fa-download" aria-hidden="true"></i>
                  Export to File
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Transaction ID</th>
                      <th>Amount (ZEC)</th>
                      <th>Block Height</th>
                      <th>Timestamp</th>
                      <th>Outputs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.map((tx, idx) => (
                      <tr key={tx.transaction_id}>
                        <td>{idx + 1}</td>
                        <td>
                          <span className="hash hash-truncate" title={tx.transaction_id}>
                            {tx.transaction_id.substring(0, 16)}...
                          </span>
                        </td>
                        <td>{tx.amount_zec.toFixed(8)}</td>
                        <td>{tx.block_height}</td>
                        <td className="timestamp">{formatDate(tx.timestamp)}</td>
                        <td>
                          <button
                            type="button"
                            className="badge"
                            onClick={() => {
                              const modal = document.getElementById(`tx-details-${idx}`);
                              if (modal) {
                                modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
                              }
                            }}
                          >
                            <span className="badge-dot"></span>
                            {tx.outputs.length} output{tx.outputs.length !== 1 ? 's' : ''}
                          </button>
                          <div id={`tx-details-${idx}`} style={{ display: 'none', marginTop: '0.5rem' }}>
                            <table style={{ fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th>Protocol</th>
                                  <th>Type</th>
                                  <th>Direction</th>
                                  <th>Amount</th>
                                  <th>Memo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tx.outputs.map((output, outIdx) => (
                                  <tr key={outIdx}>
                                    <td>{output.protocol}</td>
                                    <td>{output.transfer_type}</td>
                                    <td>{output.direction}</td>
                                    <td>{(output.amount_zats / 100_000_000).toFixed(8)}</td>
                                    <td className="hash">
                                      {output.memo ? (
                                        <span className="hash-truncate" title={output.memo}>{output.memo}</span>
                                      ) : (
                                        <span className="muted">(no memo)</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
