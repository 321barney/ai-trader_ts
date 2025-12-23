"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface PerformanceData {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
    totalPnl: number;
    profitFactor: number;
    expectancy: number;
}

interface DailyJournal {
    date: string;
    totalTrades: number;
    wins: number;
    losses: number;
    totalPnl: number;
    winRate: number;
    trades: any[];
}

export default function PerformancePage() {
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [journal, setJournal] = useState<DailyJournal | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(30);

    useEffect(() => {
        fetchData();
    }, [selectedDays]);

    const fetchData = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;

            const [perfRes, journalRes] = await Promise.all([
                fetch(`${API_BASE}/api/analytics/performance?days=${selectedDays}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/analytics/journal`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const perfData = await perfRes.json();
            const journalData = await journalRes.json();

            if (perfData.success) setPerformance(perfData.data);
            if (journalData.success) setJournal(journalData.data);
        } catch (error) {
            console.error("Failed to fetch performance:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">📊 Performance Analytics</h1>
                    <p className="text-gray-400 mt-1">Track your trading performance and insights</p>
                </div>
                <div className="flex gap-2">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setSelectedDays(days)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDays === days
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="card glass animate-pulse h-32"></div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="card glass">
                            <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                            <div className={`text-3xl font-bold ${(performance?.winRate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                {performance?.winRate?.toFixed(1) || 0}%
                            </div>
                            <div className="text-gray-500 text-sm mt-2">{selectedDays} day period</div>
                        </div>

                        <div className="card glass">
                            <div className="text-gray-400 text-sm mb-2">Total P/L</div>
                            <div className={`text-3xl font-bold ${(performance?.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(performance?.totalPnl || 0) >= 0 ? '+' : ''}${performance?.totalPnl?.toFixed(2) || 0}
                            </div>
                            <div className="text-gray-500 text-sm mt-2">{performance?.totalTrades || 0} trades</div>
                        </div>

                        <div className="card glass">
                            <div className="text-gray-400 text-sm mb-2">Profit Factor</div>
                            <div className={`text-3xl font-bold ${(performance?.profitFactor || 0) >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                {performance?.profitFactor?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-gray-500 text-sm mt-2">Avg Win/Loss ratio</div>
                        </div>

                        <div className="card glass">
                            <div className="text-gray-400 text-sm mb-2">Expectancy</div>
                            <div className={`text-3xl font-bold ${(performance?.expectancy || 0) >= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                ${performance?.expectancy?.toFixed(2) || 0}
                            </div>
                            <div className="text-gray-500 text-sm mt-2">Per trade average</div>
                        </div>
                    </div>

                    {/* Win/Loss Stats */}
                    <div className="grid lg:grid-cols-2 gap-6 mb-8">
                        <div className="card glass">
                            <h3 className="text-lg font-bold text-white mb-4">Win/Loss Analysis</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                                    <span className="text-green-400">Average Win</span>
                                    <span className="text-green-400 font-bold">+${performance?.avgWin?.toFixed(2) || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                                    <span className="text-red-400">Average Loss</span>
                                    <span className="text-red-400 font-bold">${performance?.avgLoss?.toFixed(2) || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-400">Risk/Reward Ratio</span>
                                    <span className="text-white font-bold">
                                        {performance?.avgLoss ? (Math.abs(performance.avgWin / performance.avgLoss)).toFixed(2) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Today's Journal */}
                        <div className="card glass">
                            <h3 className="text-lg font-bold text-white mb-4">Today's Trading Journal</h3>
                            {journal && journal.totalTrades > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Date</span>
                                        <span className="text-white font-medium">{journal.date}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Trades</span>
                                        <span className="text-white font-medium">{journal.totalTrades}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Win/Loss</span>
                                        <span className="text-white font-medium">{journal.wins}W / {journal.losses}L</span>
                                    </div>
                                    <div className={`flex justify-between items-center p-3 rounded-lg ${journal.totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                        <span className="text-gray-400">P/L</span>
                                        <span className={`font-bold ${journal.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {journal.totalPnl >= 0 ? '+' : ''}${journal.totalPnl.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <div className="text-3xl mb-2">📝</div>
                                    <div>No trades today</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4">💡 Recommendations</h3>
                        <div className="space-y-2">
                            {(performance?.winRate || 0) < 50 && (
                                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                                    <span className="text-yellow-500">⚠️</span>
                                    <span className="text-yellow-400">Focus on entry timing - win rate is below 50%</span>
                                </div>
                            )}
                            {Math.abs(performance?.avgLoss || 0) > (performance?.avgWin || 0) && (
                                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                                    <span className="text-yellow-500">⚠️</span>
                                    <span className="text-yellow-400">Set tighter stop losses - average loss exceeds average win</span>
                                </div>
                            )}
                            {(performance?.profitFactor || 0) >= 1.5 && (
                                <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                                    <span className="text-green-500">✅</span>
                                    <span className="text-green-400">Great profit factor! Continue with current strategy</span>
                                </div>
                            )}
                            {(!performance || performance.totalTrades === 0) && (
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                    <span className="text-gray-500">ℹ️</span>
                                    <span className="text-gray-400">Start trading to build performance history</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
