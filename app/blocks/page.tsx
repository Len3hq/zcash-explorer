export const dynamic = 'force-dynamic';
export const revalidate = 5;

import { getBlockchainInfo } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';
import BlocksTable from '@/components/BlocksTable';
import ExplainerCard from '@/components/ExplainerCard';

export default async function BlocksPage() {
  const info = await getBlockchainInfo();
  const bestHeight = info?.blocks;
  const recentBlocks = await fetchRecentBlocks(bestHeight, 10);

  const blocks = recentBlocks.map((b) => ({
    height: b.height,
    hash: b.hash,
    time: b.time,
    txCount: b.txCount,
    size: b.size,
    outputTotal: b.outputTotal,
  }));

  return (
    <main className="container wide-layout">
      <section className="card table-card">
        <div className="card-header">
          <div className="section-title">Recent Blocks</div>
          <span className="card-subtext">
            Last {blocks.length} blocks on the {info.chain} chain
          </span>
        </div>
        {blocks?.length ? <BlocksTable blocks={blocks} showAllColumns={true} /> : <></>}
      </section>

      <ExplainerCard
        title="How to read recent blocks"
        description="Each row summarizes a mined block and its basic activity on the Zcash chain."
        items={[
          {
            label: 'Height and hash',
            body:
              'The height is the sequential position of the block in the chain; the hash is its unique identifier. Both link to the full block view.',
          },
          {
            label: 'Transactions',
            body:
              'Shows how many transactions were included in the block. Larger counts usually indicate busier periods on the network.',
          },
          {
            label: 'Size and output (ZEC)',
            body:
              'Size is the approximate block size in kilobytes; output total estimates the sum of transaction outputs in that block, in ZEC.',
          },
        ]}
      />
    </main>
  );
}
