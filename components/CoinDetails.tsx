'use client';

import React, { useEffect, useState } from 'react';

interface CoinData {
  symbol: string;
  name: string;
  currentPriceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  change24hPct: number | null;
}

export default function CoinDetails() {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/zec-market', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          const msg = data?.error || `Failed to fetch coin details: HTTP ${response.status}`;
          throw new Error(msg);
        }
        if (data && data.symbol && data.name) {
          setCoinData({
            symbol: data.symbol,
            name: data.name,
            currentPriceUsd: data.currentPriceUsd ?? null,
            marketCapUsd: data.marketCapUsd ?? null,
            volume24hUsd: data.volume24hUsd ?? null,
            totalSupply: data.totalSupply ?? null,
            maxSupply: data.maxSupply ?? null,
            change24hPct: data.change24hPct ?? null,
          });
        } else {
          setError('No data found');
        }
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Could not load coin details';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="h-[500px] flex items-center justify-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">Loading details...</div>;
  if (error) return <div className="h-[500px] flex items-center justify-center text-red-500 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">{error}</div>;
  if (!coinData) return null;

  const formatCurrency = (val: number | null) =>
    val == null
      ? '–'
      : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
  const formatNumber = (val: number | null) =>
    val == null ? '–' : new Intl.NumberFormat('en-US').format(val);
  const formatPercentage = (val: number | null) =>
    val == null ? '–' : `${val.toFixed(2)}%`;

  const isPriceUp = (coinData.change24hPct ?? 0) > 0;
  const isPriceDown = (coinData.change24hPct ?? 0) < 0;

  return (
    <div className="card h-full">
      <div className="card-header">
        <div className="card-title flex items-center gap-2">
          {coinData.name}
        </div>
        <div className="badge">
          <span className="badge-dot"></span>
          <span>Live Data</span>
        </div>
      </div>

      <div className="key-value-grid">
        <div className="col-span-full mb-4">
          <div className="key-label mb-2">
            Current Price
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-heading">
              {formatCurrency(coinData.currentPriceUsd)}
            </div>
            <div className={`price-change-text ${isPriceUp ? 'positive' : isPriceDown ? 'negative' : 'neutral'}`}>
              {isPriceUp ? '▲' : isPriceDown ? '▼' : '●'}
              {formatPercentage(Math.abs(coinData.change24hPct ?? 0))} (24h)
            </div>
          </div>
        </div>

        <DetailRow label="Market Cap" value={formatCurrency(coinData.marketCapUsd)} />
        <DetailRow label="Volume (24h)" value={formatCurrency(coinData.volume24hUsd)} />
        <DetailRow label="Total Supply" value={`${formatNumber(coinData.totalSupply)} ${coinData.symbol.toUpperCase()}`} />
        <DetailRow label="Max Supply" value={`${formatNumber(coinData.maxSupply)} ${coinData.symbol.toUpperCase()}`} />
      </div>

      <div className="mt-auto pt-4 text-xs text-gray-400 text-center">
        Powered by CoinGecko
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="key-label">
        {label}
      </div>
      <div className="key-value">
        {value}
      </div>
    </div>
  );
}
