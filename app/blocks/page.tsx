import { getBlockchainInfo } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';
import BlocksTable from '@/components/BlocksTable';

export default async function BlocksPage() {
  const info = await getBlockchainInfo();
  const bestHeight = info.blocks;
  const recentBlocks = await fetchRecentBlocks(bestHeight, 50);

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
        <BlocksTable blocks={blocks} showAllColumns={true} />
      </section>
    </main>
  );
}
