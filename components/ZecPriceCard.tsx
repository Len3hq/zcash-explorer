'use client';

import { useEffect, useState } from 'react';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface ZecMarketData {
  symbol: string;
  name: string;
  currentPriceUsd: number | null;
  change24hPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  high24hUsd: number | null;
  low24hUsd: number | null;
  marketCapRank: number | null;
  priceSeries: PricePoint[];
  source: string;
}

function formatUsd(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '–';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '–';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function buildSparklinePath(points: PricePoint[], width = 100, height = 40) {
  if (!points.length) return { linePath: '', fillPath: '' };

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((p, idx) => {
    const x = idx * stepX;
    const normalized = (p.price - min) / range;
    const y = height - normalized * height;
    return { x, y };
  });

  const linePath = coords
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(' ');

  const fillPath = [
    `M 0 ${height}`,
    ...coords.map((pt) => `L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`),
    `L ${coords[coords.length - 1].x.toFixed(2)} ${height}`,
    'Z',
  ].join(' ');

  return { linePath, fillPath };
}

export default function ZecPriceCard() {
  const [data, setData] = useState<ZecMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/zec-market', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as ZecMarketData | { error?: string };
        if ('error' in json) {
          throw new Error(json.error || 'Failed to load market data');
        }
        if (!cancelled) {
          setData(json as ZecMarketData);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Unable to load ZEC market data right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasSeries = !!data && Array.isArray(data.priceSeries) && data.priceSeries.length > 1;
  const chart = hasSeries ? buildSparklinePath(data!.priceSeries) : { linePath: '', fillPath: '' };

  const changePct = data?.change24hPct ?? null;
  const changeLabel =
    changePct == null || Number.isNaN(changePct) ? '–' : `${changePct.toFixed(2)}%`;
  const isNegative = (changePct ?? 0) < 0;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span className="card-title-icon"></span>
          ZEC Market
        </div>
        <div className="badge">
          <span className="badge-dot"></span>
          <span>Source: CoinGecko</span>
        </div>
      </div>

      {loading && (
        <div className="price-card-main">
          <div className="muted">Loading ZEC price and market data…</div>
        </div>
      )}

      {!loading && error && (
        <div className="price-card-main">
          <div className="muted">{error}</div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="price-card-main">
          <div className="price-chart">
            {hasSeries ? (
              <svg
                className="price-chart-svg"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                role="img"
                aria-label="ZEC price over the last 7 days in USD"
              >
                <path d={chart.fillPath} className="price-chart-fill" />
                <path d={chart.linePath} className="price-chart-line" />
              </svg>
            ) : (
              <div className="muted">No chart data available.</div>
            )}
          </div>

          <div className="key-value-grid">
            <div>
              <div className="key-label">Current Price</div>
              <div className="card-main-value">{formatUsd(data.currentPriceUsd)}</div>
            </div>
            <div>
              <div className="key-label">24h Change</div>
              <div className="key-value">
                <span className={`price-pill ${isNegative ? 'negative' : ''}`}>
                  {changeLabel}
                </span>
              </div>
            </div>
            <div>
              <div className="key-label">Market Cap</div>
              <div className="key-value">{formatUsd(data.marketCapUsd)}</div>
            </div>
            <div>
              <div className="key-label">24h Volume</div>
              <div className="key-value">{formatUsd(data.volume24hUsd)}</div>
            </div>
            <div>
              <div className="key-label">Circulating Supply</div>
              <div className="key-value">
                {formatNumber(data.circulatingSupply)} <span className="muted">ZEC</span>
              </div>
            </div>
            <div>
              <div className="key-label">Max Supply</div>
              <div className="key-value">
                {data.maxSupply != null ? `${formatNumber(data.maxSupply)} ZEC` : '–'}
              </div>
            </div>
          </div>

          <div className="price-chart-meta">
            <span>Last 7 days, USD price</span>
            <span className="muted">Live data from CoinGecko</span>
          </div>
        </div>
      )}
    </div>
  );
}
