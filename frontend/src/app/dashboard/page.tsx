"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import Link from "next/link";

interface Balance {
    asset: string;
    available: number;
    total: number;
}

interface Position {
    symbol: string;
    side: string;
    positionAmt: number;
    entryPrice: number;
    unrealizedPnl: number;
}

interface Signal {
    symbol: string;
    direction: string;
    confidence: number;
    createdAt: string;
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Portfolio data
    const [balances, setBalances] = useState<Balance[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [positions, setPositions] = useState<Position[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        // Use the api client's token getter for consistency
        const token = api.getAccessToken();
        if (!token) {
            setError("Not authenticated");
            setLoading(false);
            return;
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        try {
            // Fetch portfolio
            const portfolioRes = await fetch(`${API_BASE}/api/trading/portfolio`, { headers });
            const portfolioData = await portfolioRes.json();

            if (portfolioData.success && portfolioData.data.connected) {
                setConnected(true);
                setBalances(portfolioData.data.balance || []);
                setTotalValue(portfolioData.data.totalValue || 0);
            } else {
                setError(portfolioData.data?.error || "Failed to fetch portfolio");
            }

            // Fetch positions
            const positionsRes = await fetch(`${API_BASE}/api/trading/positions`, { headers });
            const positionsData = await positionsRes.json();
            if (positionsData.success) {
                setPositions(positionsData.data.positions || []);
            }

            // Fetch signals
            const signalsRes = await fetch(`${API_BASE}/api/trading/signals`, { headers });
            const signalsData = await signalsRes.json();
            if (signalsData.success) {
                setSignals(signalsData.data || []);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate unrealized PnL from positions
    const unrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    // Format time ago
    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">📡 Command Center</h1>
                <p className="text-gray-400">
                    {connected
                        ? "Connected to AsterDex • Live Trading Active"
                        : "Welcome! Connect your exchange in Settings to enable live trading."}
                </p>
            </div>

            {/* Error Banner */}
            {error && !connected && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                        ⚠️ {error} — <Link href="/dashboard/settings" className="underline">Go to Settings</Link>
                    </p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Portfolio Value */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                    <div className="text-3xl font-bold text-white">
                        {connected ? (
                            <>
                                {balances.map((b, i) => (
                                    <span key={i} className="block">
                                        {b.total.toFixed(2)} <span className="text-lg text-gray-400">{b.asset}</span>
                                    </span>
                                ))}
                                {balances.length === 0 && "$0.00"}
                            </>
                        ) : (
                            <span className="text-gray-500">--</span>
                        )}
                    </div>
                    <div className="text-gray-500 text-sm mt-2">
                        {connected ? "From AsterDex" : "Not connected"}
                    </div>
                </div>

                {/* Unrealized PnL */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Unrealized PnL</div>
                    <div className={`text-3xl font-bold ${unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {connected ? (
                            `${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}`
                        ) : (
                            <span className="text-gray-500">--</span>
                        )}
                    </div>
                    <div className="text-gray-500 text-sm mt-2">
                        From open positions
                    </div>
                </div>

                {/* Open Positions */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Open Positions</div>
                    <div className="text-3xl font-bold text-white">
                        {connected ? positions.filter(p => p.positionAmt !== 0).length : "--"}
                    </div>
                    <div className="text-gray-500 text-sm mt-2">
                        {connected ? "Active trades" : "Not connected"}
                    </div>
                </div>

                {/* Active Signals */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Active Signals</div>
                    <div className="text-3xl font-bold text-indigo-400">
                        {signals.length}
                    </div>
                    <div className="text-gray-500 text-sm mt-2">
                        AI generated
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Balances */}
                <div className="card glass">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Balances</h2>
                        <Link href="/dashboard/settings" className="text-indigo-400 text-sm hover:underline">
                            Settings
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {connected && balances.length > 0 ? (
                            balances.map((bal, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                            {bal.asset.substring(0, 2)}
                                        </div>
                                        <span className="text-white font-medium">{bal.asset}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white">{bal.total.toFixed(4)}</div>
                                        <div className="text-gray-500 text-sm">Available: {bal.available.toFixed(4)}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                {connected ? "No balances found" : "Connect exchange to see balances"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Open Positions */}
                <div className="card glass">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Open Positions</h2>
                        <Link href="/dashboard/history" className="text-indigo-400 text-sm hover:underline">
                            History
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {connected && positions.filter(p => p.positionAmt !== 0).length > 0 ? (
                            positions.filter(p => p.positionAmt !== 0).map((pos, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${pos.side === "LONG" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                            }`}>
                                            {pos.side === "LONG" ? "↑" : "↓"}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium">{pos.symbol}</div>
                                            <div className="text-gray-500 text-sm">{pos.side} • {Math.abs(pos.positionAmt)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={pos.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"}>
                                            {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl?.toFixed(2) || "0.00"}
                                        </div>
                                        <div className="text-gray-500 text-sm">Entry: ${pos.entryPrice?.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                {connected ? "No open positions" : "Connect exchange to see positions"}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Signals */}
            {signals.length > 0 && (
                <div className="mt-6 card glass">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Recent Signals</h2>
                        <Link href="/dashboard/history" className="text-indigo-400 text-sm hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {signals.slice(0, 6).map((signal, i) => (
                            <div key={i} className="p-4 bg-white/5 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">{signal.symbol}</span>
                                    <span className={`badge ${signal.direction === "LONG" ? "badge-success" :
                                        signal.direction === "SHORT" ? "badge-danger" : "bg-gray-500/20 text-gray-400"
                                        }`}>
                                        {signal.direction}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">{timeAgo(signal.createdAt)}</span>
                                    <span className="text-gray-400">{Math.round(signal.confidence * 100)}% conf</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/dashboard/strategy" className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">🧪</span>
                    <span className="text-white font-medium">Strategy Lab</span>
                </Link>
                <Link href="/dashboard/metrics" className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">📊</span>
                    <span className="text-white font-medium">Metrics</span>
                </Link>
                <Link href="/dashboard/agents" className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">🤖</span>
                    <span className="text-white font-medium">Agent HQ</span>
                </Link>
                <Link href="/dashboard/settings" className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">⚙️</span>
                    <span className="text-white font-medium">Settings</span>
                </Link>
            </div>
        </div>
    );
}
