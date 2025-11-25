export const dynamic = 'force-dynamic';
export const revalidate = 10;

import { getBlockchainInfo, getNetworkHashPs } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';
import StatsCard, { StatItem } from '@/components/StatsCard';
import BlocksTable from '@/components/BlocksTable';

import PriceChart from '@/components/PriceChart';

import CoinDetails from '@/components/CoinDetails';

export default async function Home() {
  let info: any;
  try {
    info = await getBlockchainInfo();
  } catch (e) {
    console.error('[Home] Failed to fetch getblockchaininfo RPC', e);
    return (
      <main className="container wide-layout">
        <section className="card mt-lg">
          <div className="card-header">
            <div className="section-title">Zcash Explorer</div>
          </div>
          <p className="card-subtext">
            The backend RPC endpoint is temporarily unavailable or rate limited. Please try again in a few moments.
          </p>
        </section>
      </main>
    );
  }

  const bestHeight = info.blocks;

  // Fetch last 10 blocks to compute simple TPS / block rate
  let recentBlocks: any[] = [];
  try {
    recentBlocks = await fetchRecentBlocks(bestHeight, 10);
  } catch (e) {
    console.error('[Home] Failed to fetch recent blocks', e);
    recentBlocks = [];
  }

  let txTotal = 0;
  let timeSpan = 0;
  if (recentBlocks.length >= 2) {
    const newest = recentBlocks[0];
    const oldest = recentBlocks[recentBlocks.length - 1];
    txTotal = recentBlocks.reduce((sum, b) => sum + (b.txCount || 0), 0);
    timeSpan = Math.max(newest.time - oldest.time, 1); // seconds
  }

  const approxTps = timeSpan > 0 ? txTotal / timeSpan : 0;
  const blocksPerHour = timeSpan > 0 ? (recentBlocks.length * 3600) / timeSpan : 0;

  let networkHash = null;
  try {
    networkHash = await getNetworkHashPs(120, -1);
  } catch (e) {
    // optional; ignore if RPC not available
  }

  let poolHoldings = null;
  if (Array.isArray(info.valuePools) && info.valuePools.length) {
    const pools = info.valuePools
      .filter((p: any) => p && typeof p.chainValue === 'number')
      .map((p: any) => ({
        id: p.id || p.poolName || 'Pool',
        chainValue: p.chainValue,
        monitored: !!p.monitored,
      }));

    if (pools.length) {
      const totalShielded = pools.reduce((sum: number, p: any) => sum + (p.chainValue || 0), 0);
      poolHoldings = { pools, totalShielded };
    }
  }

  // latest 10 blocks to display
  const blocks = recentBlocks.slice(0, 10).map((b) => ({
    height: b.height,
    hash: b.hash,
    time: b.time,
    txCount: b.txCount,
  }));

  return (
    <main className="container wide-layout">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <PriceChart />
        </div>
        <div>
          <CoinDetails />
        </div>
      </section>

      <section className="grid-2 mt-lg">
        <StatsCard title="Network Overview" badge={{ dot: true, text: `${info.chain} chain` }}>
          <div>
            <div className="key-label">
              <i className="fa-solid fa-layer-group stat-icon" aria-hidden="true"></i>
              Height
            </div>
            <div className="card-main-value">
              <span className="hash-truncate">{info.blocks}</span>
            </div>
          </div>
          <StatItem
            icon="fa-solid fa-circle-check"
            label="Verification"
            value={`${(info.verificationprogress * 100).toFixed(2)}%`}
            suffix="synced"
          />
          {typeof networkHash === 'number' && (
            <StatItem
              icon="fa-solid fa-microchip"
              label="Network Hashrate"
              value={networkHash.toExponential(2) + ' H/s'}
            />
          )}
        </StatsCard>

        <StatsCard title="Network Stats" badge={{ dot: true, text: 'Live 10s refresh' }}>
          <StatItem
            icon="fa-solid fa-bolt"
            label="Approx TPS"
            value={approxTps ? `${approxTps.toFixed(2)} tx/s` : '–'}
          />
          <StatItem
            icon="fa-solid fa-cubes"
            label="Blocks / hr"
            value={blocksPerHour ? `${blocksPerHour.toFixed(2)} blocks/hr` : '–'}
          />
          <StatItem
            icon="fa-solid fa-mountain"
            label="Difficulty"
            value={info.difficulty ? info.difficulty.toFixed(2) : '–'}
          />
          {poolHoldings &&
            poolHoldings.pools.map((pool: any) => (
              <StatItem
                key={pool.id}
                icon="fa-solid fa-piggy-bank"
                label={`${pool.id} pool`}
                value={`${typeof pool.chainValue === 'number' ? pool.chainValue.toFixed(8) : '–'} ZEC`}
              />
            ))}
        </StatsCard>
      </section>

      <section className="card table-card mt-lg">
        <div className="card-header">
          <div className="section-title">Latest Blocks</div>
          <span className="card-subtext">Most recent blocks on the {info.chain} chain</span>
        </div>
        <BlocksTable blocks={blocks} />
      </section>
    </main>
  );
}
