'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import CopyButton from './CopyButton';

interface Block {
  height: number;
  hash: string;
  time: number;
  txCount: number;
}

interface BlocksTableProps {
  blocks: Block[];
  showMobileCards?: boolean;
}

export default function BlocksTable({ blocks, showMobileCards = true }: BlocksTableProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="table-wrapper">
        <p className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
          No blocks to display
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className={`table-wrapper ${showMobileCards ? 'blocks-table-desktop' : ''}`}>
        <table>
          <thead>
            <tr>
              <th>Height</th>
              <th>Block Hash</th>
              <th>Time</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const timeAgo = formatDistanceToNow(new Date(block.time * 1000), { addSuffix: true });
              return (
                <tr key={block.height}>
                  <td>
                    <Link href={`/block/${block.height}`} className="hash">
                      {block.height}
                    </Link>
                  </td>
                  <td className="hash">
                    <div className="hash-with-copy">
                      <Link href={`/block/${block.hash}`}>
                        <span className="hash-truncate" title={block.hash}>
                          {block.hash}
                        </span>
                      </Link>
                      <CopyButton text={block.hash} label="Copy block hash" />
                    </div>
                  </td>
                  <td className="timestamp">{timeAgo}</td>
                  <td>
                    <span className="tx-count-pill">
                      <i className="fa-solid fa-receipt" aria-hidden="true"></i>
                      {block.txCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {showMobileCards && (
        <div className="blocks-mobile-cards">
          {blocks.map((block) => {
            const timeAgo = formatDistanceToNow(new Date(block.time * 1000), { addSuffix: true });
            return (
              <div key={block.height} className="block-card-mobile">
                <div className="block-card-header">
                  <Link href={`/block/${block.height}`} className="block-card-height">
                    <i className="fa-solid fa-cube" aria-hidden="true"></i>
                    Block #{block.height}
                  </Link>
                  <span className="tx-count-pill">
                    <i className="fa-solid fa-receipt" aria-hidden="true"></i>
                    {block.txCount}
                  </span>
                </div>
                <div className="block-card-hash">
                  <span className="block-card-label">Hash</span>
                  <div className="hash-with-copy">
                    <Link href={`/block/${block.hash}`} className="hash">
                      <span className="hash-truncate" title={block.hash}>
                        {block.hash}
                      </span>
                    </Link>
                    <CopyButton text={block.hash} label="Copy block hash" />
                  </div>
                </div>
                <div className="block-card-time">
                  <i className="fa-regular fa-clock" aria-hidden="true"></i>
                  <span className="timestamp">{timeAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
