import Link from 'next/link';

interface Block {
  height: number;
  hash: string;
  time: number;
  txCount: number;
  size?: number | null;
  outputTotal?: number | null;
}

interface BlocksTableProps {
  blocks: Block[];
  showAllColumns?: boolean;
}

export default function BlocksTable({ blocks, showAllColumns = false }: BlocksTableProps) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Height</th>
            <th>Hash</th>
            <th>Time (UTC)</th>
            <th>Transactions</th>
            {showAllColumns && (
              <>
                <th>Size</th>
                <th>Output (ZEC)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.hash}>
              <td>
                <span className="hash-with-copy">
                  <Link href={`/block/${block.height}`} className="hash-truncate">
                    {block.height}
                  </Link>
                </span>
              </td>
              <td className="hash">
                <Link href={`/block/${block.height}`} className="hash-with-copy">
                  <span className="hash-truncate">{block.hash}</span>
                </Link>
              </td>
              <td className="timestamp">{new Date(block.time * 1000).toISOString()}</td>
              <td>
                <span className="tx-count-pill">
                  <span>·</span>
                  <span>{block.txCount} txs</span>
                </span>
              </td>
              {showAllColumns && (
                <>
                  <td>
                    {block.size ? `${(block.size / 1024).toFixed(2)} KB` : <span className="muted">–</span>}
                  </td>
                  <td>
                    {typeof block.outputTotal === 'number' ? (
                      block.outputTotal.toFixed(8)
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
