export const dynamic = 'force-dynamic';
export const revalidate = 10;

import { getBlockchainInfo, getNetworkHashPs, getChainTxStats } from '@/lib/zcashRpcClient';
import { fetchRecentBlocks } from '@/lib/utils';
import StatsCard, { StatItem } from '@/components/StatsCard';
import BlocksTable from '@/components/BlocksTable';
import ExplainerCard from '@/components/ExplainerCard';

import PriceChart from '@/components/PriceChart';
import MarketCarousel from '@/components/MarketCarousel';
import CoinDetails from '@/components/CoinDetails';

const formatNumber2 = (val: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const formatInteger = (val: number) => new Intl.NumberFormat('en-US').format(val);

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

  // Get accurate TPS from getchaintxstats (120 blocks = ~5 hours window)
  let accurateTps = null;
  try {
    const txStats = await getChainTxStats(120);
    accurateTps = txStats?.txrate || null;
  } catch (e) {
    console.error('[Home] Failed to fetch chain tx stats', e);
  }

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
      {/* Desktop view - side by side */}
      <section className="homepage-market-desktop">
        <div>
          <PriceChart />
        </div>
        <div>
          <CoinDetails />
        </div>
      </section>

      {/* Mobile view - carousel */}
      <section className="homepage-market-mobile">
        <MarketCarousel>
          {[
            <PriceChart key="chart" />,
            <CoinDetails key="details" />
          ]}
        </MarketCarousel>
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
            value={accurateTps !== null ? `${accurateTps.toFixed(2)} tx/s` : (approxTps ? `${approxTps.toFixed(2)} tx/s` : '–')}
            tooltip="Average transactions per second over the last 120 blocks (~5 hours). Calculated using getchaintxstats RPC method."
          />
          <StatItem
            icon="fa-solid fa-cubes"
            label="Blocks / hr"
            value={blocksPerHour ? `${blocksPerHour.toFixed(2)} blocks/hr` : '–'}
            tooltip="Average number of blocks mined per hour over the recent window."
          />
          <StatItem
            icon="fa-solid fa-mountain"
            label="Difficulty"
            value={info.difficulty ? info.difficulty.toFixed(2) : '–'}
            tooltip="Current mining difficulty, a measure of how hard it is to find a hash below a given target."
          />
          {poolHoldings && (
            <div className="pool-row">
              {poolHoldings.pools
                .filter((pool: any) => {
                  const id = String(pool.id || pool.poolName || '').toLowerCase();
                  return id !== 'sprout' && id !== 'lockbox';
                })
                .map((pool: any) => {
                  const id = String(pool.id || pool.poolName || '').toLowerCase();
                  let tooltip = '';

                  if (id === 'orchard') {
                    tooltip = 'The latest and most advanced shielded pool using zero-knowledge proofs. Offers enhanced privacy, efficiency, and security. Introduced with Unified Addresses in 2022.';
                  } else if (id === 'sapling') {
                    tooltip = 'Improved shielded pool launched in 2018. Offers fast, private transactions with reduced memory requirements. Uses zk-SNARKs for transaction privacy.';
                  } else if (id === 'transparent') {
                    tooltip = 'Public pool where all transaction details are visible on the blockchain, similar to Bitcoin. No privacy features, often used by exchanges.';
                  } else {
                    tooltip = `Total value currently held in the ${pool.id} shielded pool.`;
                  }

                  return (
                    <div key={pool.id} className="pool-pill" title={tooltip}>
                      <div className="pool-pill-label">
                        <i className="fa-solid fa-piggy-bank pool-pill-icon" aria-hidden="true" />
                        <span>{pool.id} pool</span>
                      </div>
                      <div className="pool-pill-value">
                        {typeof pool.chainValue === 'number' ? formatNumber2(pool.chainValue) : '–'} ZEC
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </StatsCard>
      </section>

      <section className="card table-card mt-lg">
        <div className="card-header">
          <div className="section-title">Latest Blocks</div>
          <span className="card-subtext">Most recent blocks on the {info.chain} chain</span>
        </div>
        <BlocksTable blocks={blocks} />
      </section>


      <ExplainerCard
        title="About these network metrics"
        description="Short guide to what you are seeing above and how the numbers are calculated."
        items={[
          {
            label: 'Chain height & verification',
            body:
              'Shows the most recent block the node knows about and how fully it has verified the chain. A height close to other public explorers with ~100% verification means synchronization is complete.',
          },
          {
            label: 'Difficulty & shielded pools',
            body:
              'Difficulty captures how hard it is to mine the next block. Shielded pool balances estimate how much ZEC currently lives in each pool and are derived from node RPC data, not from any third‑party index.',
          },
          {
            label: 'Latest blocks section',
            body:
              'Displays the most recent blocks synced by the node. Selecting a height or hash opens a detailed view with full transaction and shielded pool breakdowns.',
          },
        ]}
      />
    </main >
  );
}
