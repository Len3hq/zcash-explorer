'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface NetworkChartsProps {
    data: {
        date: string;
        txCount: number;
        difficulty: number;
    }[];
}

export default function NetworkCharts({ data }: NetworkChartsProps) {
    const [activeTab, setActiveTab] = useState<'activity' | 'adoption'>('activity');

    if (!data || data.length === 0) return null;

    const dates = data.map(d => d.date);
    const txCounts = data.map(d => d.txCount);
    const difficulties = data.map(d => d.difficulty);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f3b724',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(243, 183, 36, 0.2)',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        size: 11,
                    },
                },
            },
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false,
        },
    };

    const activityData = {
        labels: dates,
        datasets: [
            {
                label: 'Daily Transactions',
                data: txCounts,
                backgroundColor: 'rgba(243, 183, 36, 0.8)',
                hoverBackgroundColor: '#f3b724',
                borderRadius: 4,
                barThickness: 'flex' as const,
                maxBarThickness: 40,
            },
        ],
    };

    const adoptionData = {
        labels: dates,
        datasets: [
            {
                label: 'Difficulty',
                data: difficulties,
                borderColor: '#f3b724',
                backgroundColor: 'rgba(243, 183, 36, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#f3b724',
                pointBorderColor: '#fff',
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4,
            },
        ],
    };

    return (
        <div className="card mb-8">
            <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                    <div className="section-title">Network Stats</div>
                    <div className="flex bg-subtle/50 rounded-full p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'activity'
                                    ? 'bg-white text-heading shadow-sm'
                                    : 'text-muted hover:text-heading'
                                }`}
                        >
                            Daily Activity
                        </button>
                        <button
                            onClick={() => setActiveTab('adoption')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'adoption'
                                    ? 'bg-white text-heading shadow-sm'
                                    : 'text-muted hover:text-heading'
                                }`}
                        >
                            Adoption Trend
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 h-[300px] w-full">
                {activeTab === 'activity' ? (
                    <Bar data={activityData} options={chartOptions} />
                ) : (
                    <Line data={adoptionData} options={chartOptions} />
                )}
            </div>
        </div>
    );
}
