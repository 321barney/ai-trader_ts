"use client";

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

interface PerformanceMetrics {
    totalReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    averageHoldingPeriod: number;
}

interface AnalyticsData {
    metrics: PerformanceMetrics;
    summary: string;
    recommendations: string[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/features/analytics/performance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();

            if (json.success && json.data) {
                setData(json.data);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const MetricCard = ({ title, value, subtext, color = 'text-white' }: any) => (
        <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
            <h3 className="text-sm text-gray-400 mb-1">{title}</h3>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
        </div>
    );

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;
    }

    if (!data || !data.metrics) {
        return (
            <div className="p-8 space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
                        <p className="text-gray-400">Deep dive into strategy performance and risk metrics</p>
                    </div>
                </header>
                <div className="text-center py-20 bg-[#12121a] rounded-xl border border-white/5">
                    <div className="text-gray-500 mb-4">No trading data available yet.</div>
                    <p className="text-sm text-gray-600">Start trading to generate performance metrics.</p>
                </div>
            </div>
        );
    }

    const { metrics, recommendations } = data;

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
                    <p className="text-gray-400">Deep dive into strategy performance and risk metrics</p>
                </div>
                <button
                    onClick={fetchMetrics}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    Refresh Data
                </button>
            </header>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Return"
                    value={`${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`}
                    color={metrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
                    subtext="All-time portfolio growth"
                />
                <MetricCard
                    title="Sharpe Ratio"
                    value={metrics.sharpeRatio.toFixed(2)}
                    color="text-indigo-400"
                    subtext="Risk-adjusted return (>1 is good)"
                />
                <MetricCard
                    title="Max Drawdown"
                    value={`${metrics.maxDrawdown.toFixed(2)}%`}
                    color="text-red-400"
                    subtext="Deepest peak-to-valley decline"
                />
                <MetricCard
                    title="Win Rate"
                    value={`${metrics.winRate.toFixed(1)}%`}
                    color="text-blue-400"
                    subtext={`${metrics.totalTrades} total trades`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Secondary Metrics */}
                <div className="space-y-4">
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Risk Profile</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sortino Ratio</span>
                                <span className="text-white">{metrics.sortinoRatio.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Profit Factor</span>
                                <span className="text-white">{metrics.profitFactor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Avg Win</span>
                                <span className="text-green-400">${metrics.avgWin ? metrics.avgWin.toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Avg Loss</span>
                                <span className="text-red-400">${metrics.avgLoss ? metrics.avgLoss.toFixed(2) : '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trade Improvement AI */}
                <div className="lg:col-span-2 bg-[#12121a] border border-white/5 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Strategy Analysis</h3>
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                            <h4 className="font-medium text-indigo-300 mb-2">Performance Summary</h4>
                            <p className="text-sm text-gray-300">
                                {data.summary || "Not enough data to generate summary."}
                            </p>
                        </div>

                        {/* Recommendations */}
                        {recommendations && recommendations.length > 0 && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <h4 className="font-medium text-green-300 mb-2">Recommendations</h4>
                                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                    {recommendations.map((rec, i) => (
                                        <li key={i}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(!recommendations || recommendations.length === 0) && (
                            <div className="text-gray-500 text-sm italic">
                                No specific recommendations at this time.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
