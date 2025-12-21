'use client';

import { useState, useEffect } from 'react';

// Mock data to initialize before API load
const mockMetrics = {
    totalReturn: 15.4,
    sharpeRatio: 1.8,
    sortinoRatio: 2.1,
    maxDrawdown: -5.2,
    winRate: 64,
    profitFactor: 1.5,
    totalTrades: 42,
    avgWin: 120,
    avgLoss: -85
};

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3001/api/features/analytics/performance', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setMetrics(data.data.metrics); // Assuming structure
            } else {
                // Fallback to mock if no data yet (for demo)
                setMetrics(mockMetrics);
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            setMetrics(mockMetrics);
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

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
                    <p className="text-gray-400">Deep dive into strategy performance and risk metrics</p>
                </div>
                <button
                    onClick={fetchMetrics}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg"
                >
                    Refresh Data
                </button>
            </header>

            {loading ? (
                <div className="text-white">Loading analytics...</div>
            ) : (
                <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Return"
                            value={`${metrics?.totalReturn > 0 ? '+' : ''}${metrics?.totalReturn}%`}
                            color={metrics?.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
                            subtext="All-time portfolio growth"
                        />
                        <MetricCard
                            title="Sharpe Ratio"
                            value={metrics?.sharpeRatio}
                            color="text-indigo-400"
                            subtext="Risk-adjusted return (>1 is good)"
                        />
                        <MetricCard
                            title="Max Drawdown"
                            value={`${metrics?.maxDrawdown}%`}
                            color="text-red-400"
                            subtext="Deepest peak-to-valley decline"
                        />
                        <MetricCard
                            title="Win Rate"
                            value={`${metrics?.winRate}%`}
                            color="text-blue-400"
                            subtext={`${metrics?.totalTrades} total trades`}
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
                                        <span className="text-white">{metrics?.sortinoRatio}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Profit Factor</span>
                                        <span className="text-white">{metrics?.profitFactor}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Avg Win</span>
                                        <span className="text-green-400">${metrics?.avgWin}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Avg Loss</span>
                                        <span className="text-red-400">${metrics?.avgLoss}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trade Improvement AI */}
                        <div className="lg:col-span-2 bg-[#12121a] border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Trade Analysis</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                    <h4 className="font-medium text-indigo-300 mb-2">Exit Timing Analysis</h4>
                                    <p className="text-sm text-gray-300">
                                        Based on your last 50 trades, you tend to exit winning trades too early.
                                        Your captured potential profit is <strong>38%</strong>, while the target should be >50%.
                                        Consider using a trailing stop to let winners run.
                                    </p>
                                </div>

                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <h4 className="font-medium text-green-300 mb-2">Entry Efficiency</h4>
                                    <p className="text-sm text-gray-300">
                                        Excellent entry timing! Your average entry efficiency is <strong>85%</strong>,
                                        meaning you consistently buy near the short-term lows.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
