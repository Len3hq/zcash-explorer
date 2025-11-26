"use client";

"use client";

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export default function CoinDetails() {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=zcash';

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch coin details');
        }
        const data = await response.json();
        if (data && data.length > 0) {
          setCoinData(data[0]);
        } else {
          setError('No data found');
        }
      } catch (err) {
        console.error(err);
        setError('Could not load coin details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="h-[500px] flex items-center justify-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">Loading details...</div>;
  if (error) return <div className="h-[500px] flex items-center justify-center text-red-500 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">{error}</div>;
  if (!coinData) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);
  const formatPercentage = (val: number) => `${val.toFixed(2)}%`;

  const isPriceUp = coinData.price_change_percentage_24h > 0;
  const isPriceDown = coinData.price_change_percentage_24h < 0;

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
          {/* Clarify that this is the coin price, per ZEC */}
          <div className="key-label mb-1">
            Price per {coinData.symbol.toUpperCase()}
          </div>
          <div
            className={`text-4xl md:text-5xl font-extrabold flex items-center gap-3 tracking-tight ${isPriceUp
                ? 'text-green-600 dark:text-green-400'
                : isPriceDown
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-50'
              }`}
          >
            {formatCurrency(coinData.current_price)}
            <span
              className={`text-lg md:text-xl font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 ${isPriceUp
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : isPriceDown
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
            >
              {isPriceUp ? '▲' : isPriceDown ? '▼' : ''}
              {formatPercentage(Math.abs(coinData.price_change_percentage_24h))}
            </span>
          </div>
        </div>

        <DetailRow label="Market Cap" value={formatCurrency(coinData.market_cap)} />
        <DetailRow label="Volume (24h)" value={formatCurrency(coinData.total_volume)} />
        <DetailRow label="Total Supply" value={`${formatNumber(coinData.total_supply)} ${coinData.symbol.toUpperCase()}`} />
        <DetailRow label="Max Supply" value={`${formatNumber(coinData.max_supply)} ${coinData.symbol.toUpperCase()}`} />
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
