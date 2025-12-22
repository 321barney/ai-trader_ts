"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface PnLData {
    pnl1D: number;
    pnl7D: number;
    pnl30D: number;
    totalPnL: number;
    totalTrades: number;
    winRate: number;
    pnlByPair: { pair: string; pnl: number; trades: number; winRate: number }[];
    pnlByStrategy: { strategy: string; pnl: number; trades: number; winRate: number }[];
}

export default function PnLPage() {
    const [data, setData] = useState<PnLData | null>(null);
    const [portfolioValue, setPortfolioValue] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            // Fetch PnL Summary (now includes breakdowns)
            const pnlRes = await fetch(`${API_BASE}/api/trading/pnl`, { headers });
            const pnlJson = await pnlRes.json();
            if (pnlJson.success) setData(pnlJson.data);

            // Fetch Portfolio Value
            const portRes = await fetch(`${API_BASE}/api/trading/portfolio`, { headers });
            const portJson = await portRes.json();
            if (portJson.success) setPortfolioValue(portJson.data.totalValue || 0);

        } catch (error) {
            console.error("Failed to fetch PnL data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;
    }

    // Default empty state if no data
    const pnlData = data || {
        pnl1D: 0, pnl7D: 0, pnl30D: 0, totalPnL: 0, totalTrades: 0, winRate: 0,
        pnlByPair: [], pnlByStrategy: []
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">PnL Analytics</h1>
                    <p className="text-gray-400">Track your trading performance</p>
                </div>
                <button
                    onClick={fetchData}
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                    <span>🔄</span> Refresh
                </button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total PnL</div>
                    <div className={`text-3xl font-bold ${pnlData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnlData.totalPnL >= 0 ? '+' : ''}${pnlData.totalPnL.toLocaleString()}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                    <div className="text-3xl font-bold text-white">
                        ${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total Trades</div>
                    <div className="text-3xl font-bold text-white">{pnlData.totalTrades}</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                    <div className="text-3xl font-bold text-indigo-400">{pnlData.winRate}%</div>
                </div>
            </div>

            {/* Time Period PnL */}
            <div className="card glass mb-8">
                <h2 className="text-xl font-bold text-white mb-6">PnL by Period</h2>
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { label: "24 Hours", value: pnlData.pnl1D },
                        { label: "7 Days", value: pnlData.pnl7D },
                        { label: "30 Days", value: pnlData.pnl30D },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center p-6 bg-white/5 rounded-lg">
                            <div className="text-gray-400 text-sm mb-2">{label}</div>
                            <div className={`text-2xl font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {value >= 0 ? '+' : ''}${value.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PnL Breakdown */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* By Pair */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6">PnL by Pair</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {pnlData.pnlByPair.length === 0 ? (
                            <div className="text-gray-500 text-center py-4">No data available</div>
                        ) : (
                            pnlData.pnlByPair.map((item) => (
                                <div key={item.pair} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <div className="text-white font-bold">{item.pair}</div>
                                        <div className="text-gray-500 text-sm">{item.trades} trades • {item.winRate}% win</div>
                                    </div>
                                    <div className={`text-xl font-bold ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* By Strategy */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6">PnL by Strategy</h2>
                    <div className="space-y-4">
                        {pnlData.pnlByStrategy.length === 0 ? (
                            <div className="text-gray-500 text-center py-4">No data available</div>
                        ) : (
                            pnlData.pnlByStrategy.map((item) => (
                                <div key={item.strategy} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div>
                                        <div className="text-white font-bold">{item.strategy}</div>
                                        <div className="text-gray-500 text-sm">{item.trades} trades • {item.winRate}% win</div>
                                    </div>
                                    <div className={`text-xl font-bold ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
