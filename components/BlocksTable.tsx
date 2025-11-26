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
                    {new Intl.NumberFormat('en-US').format(block.height)}
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
                  <span>{new Intl.NumberFormat('en-US').format(block.txCount)} txs</span>
                </span>
              </td>
              {showAllColumns && (
                <>
                  <td>
                    {block.size
                      ? `${new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(block.size / 1024)} KB`
                      : <span className="muted">–</span>}
                  </td>
                  <td>
                    {typeof block.outputTotal === 'number' ? (
                      new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(block.outputTotal)
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
