"use client";

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface PriceData {
  prices: [number, number][];
}

export default function PriceChart() {
  const [chartData, setChartData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const url = 'https://api.coingecko.com/api/v3/coins/zcash/market_chart?vs_currency=usd&days=30&interval=daily';
      // Note: Demo API key header is omitted as it might not be available/needed for public free tier for simple requests, 
      // or should be provided via env vars if strictly required. 
      // The user provided snippet had a placeholder. I will try without first or use a public endpoint.
      // The user's snippet: const url = 'https://api.coingecko.com/api/v3/coins/{id}/market_chart';

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch price data');
        }
        const data = await response.json();
        setChartData(data);
      } catch (err) {
        console.error(err);
        setError('Could not load price chart');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-500">Loading chart...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!chartData) return null;

  const prices = chartData.prices.map((item) => item[1]);
  const dates = chartData.prices.map((item) => item[0]);

  // Determine color based on trend (start vs end) like CoinGecko
  const isPositive = prices[prices.length - 1] >= prices[0];
  const lineColor = isPositive ? '#16c784' : '#ea3943'; // Green or Red
  const gradientStart = isPositive ? 'rgba(22, 199, 132, 0.2)' : 'rgba(234, 57, 67, 0.2)';
  const gradientStop = isPositive ? 'rgba(22, 199, 132, 0.0)' : 'rgba(234, 57, 67, 0.0)';

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Price (USD)',
        data: prices,
        borderColor: lineColor,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, gradientStart);
          gradient.addColorStop(1, gradientStop);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(context.parsed.y);
            }
            return label;
          },
          title: function (context: any) {
            const index = context[0]?.dataIndex ?? 0;
            const timestamp = dates[index]; // CoinGecko provides ms since epoch
            const date = new Date(timestamp);
            return format(date, 'MMM d, yyyy');
          }
        }
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        position: 'right' as const,
        grid: {
          display: false, // Remove horizontal grid lines
        },
        ticks: {
          callback: function (value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value as number);
          },
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className="w-full h-[500px] bg-white rounded-lg p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">$ZEC Price Chart (30 Days)</h3>
          <div className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(prices[prices.length - 1])}
          </div>
        </div>
      </div>
      <div className="relative h-[420px] w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
