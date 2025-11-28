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

interface PricePoint {
  timestamp: number;
  price: number;
}

interface PriceData {
  prices: PricePoint[];
}

export default function PriceChart() {
  const [chartData, setChartData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartHeight, setChartHeight] = useState(400);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/zec-market', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !Array.isArray(data.priceSeries) || data.priceSeries.length === 0) {
          const msg = data?.error || `Failed to fetch price data: HTTP ${response.status}`;
          throw new Error(msg);
        }
        setChartData({ prices: data.priceSeries });
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Could not load price chart';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set responsive chart height - reduced for better page aesthetics
    const updateChartHeight = () => {
      if (window.innerWidth < 768) {
        setChartHeight(200); // Mobile - reduced from 250
      } else if (window.innerWidth < 1024) {
        setChartHeight(220); // Tablet - reduced from 300
      } else {
        setChartHeight(300); // Desktop - reduced from 400
      }
    };

    updateChartHeight();
    window.addEventListener('resize', updateChartHeight);
    return () => window.removeEventListener('resize', updateChartHeight);
  }, []);

  if (loading) return <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading chart...</div>;
  if (error) return <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!chartData) return null;

  const prices = chartData.prices.map((item) => item.price);
  const dates = chartData.prices.map((item) => item.timestamp);

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
          const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
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
            const timestamp = dates[index];
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
          display: false,
        },
        ticks: {
          font: {
            size: chartHeight < 300 ? 10 : 12, // Smaller font on mobile
          },
          callback: function (value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
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

  // Calculate percentage change
  const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
  const isPositiveChange = priceChange >= 0;

  return (
    <div className="card price-chart-container">
      <div className="price-chart-header">
        <div>
          <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>ZEC Price (30 Days)</h3>
          <p className="text-xs text-muted" style={{ marginBottom: '0.75rem' }}>Live market data powered by CoinGecko</p>
          <div className="flex items-baseline gap-3">
            <div className="price-chart-current">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(prices[prices.length - 1])}
            </div>
            <div className={`price-change-text ${isPositiveChange ? 'positive' : 'negative'}`}>
              {isPositiveChange ? '▲' : '▼'}
              {Math.abs(priceChange).toFixed(2)}% (30d)
            </div>
          </div>
        </div>
      </div>
      <div className="price-chart-wrapper" style={{ height: `${chartHeight}px` }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
