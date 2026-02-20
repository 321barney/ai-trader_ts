"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import Link from "next/link";
import PositionsWidget from "@/components/PositionsWidget";
import PortfolioWidget from "@/components/PortfolioWidget";
import ScannerSettingsModal from "@/components/ScannerSettingsModal";

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

interface ActiveModel {
    id: string;
    version: number;
    methodology: string;
    status: string;
    winRate?: number;
    timeframes?: string[];
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [positions, setPositions] = useState<Position[]>([]);
    const [activeModel, setActiveModel] = useState<ActiveModel | null>(null);
    const [showScannerSettings, setShowScannerSettings] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
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
            // Fetch trading data
            // These might return errors if keys aren't configured, but not due to subscription
            const [portfolioRes, positionsRes, modelsRes] = await Promise.all([
                fetch(`${API_BASE}/api/trading/portfolio`, { headers }),
                fetch(`${API_BASE}/api/trading/positions`, { headers }),
                fetch(`${API_BASE}/api/models`, { headers })
            ]);

            const portfolioData = await portfolioRes.json();
            const positionsData = await positionsRes.json();
            const modelsData = await modelsRes.json();

            if (portfolioData.success && portfolioData.data.connected) {
                setConnected(true);
                setBalances(portfolioData.data.balance || []);
                setTotalValue(portfolioData.data.totalValue || 0);
            }

            if (positionsData.success) {
                setPositions(positionsData.data.positions || []);
            }

            if (modelsData.success && Array.isArray(modelsData.data)) {
                const active = modelsData.data.find((m: any) => m.isActive);
                if (active) setActiveModel(active);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const unrealizedPnl = positions.reduce((sum: number, p: Position) => sum + (p.unrealizedPnl || 0), 0);

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-white/10 rounded-lg"></div>
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-white/5 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">


            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back. Here's your trading overview.</p>
                </div>
                <div className="flex items-center gap-3">


                    {/* Connection Status */}
                    {connected ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-emerald-400 text-sm font-medium">Connected</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-red-400 text-sm font-medium">Disconnected</span>
                        </div>
                    )}
                </div>
            </div>


            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Total Value */}
                <div className="relative overflow-hidden rounded-lg bg-[#0b1121] border border-slate-700/50 p-6 shadow-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Value</div>
                        <div className="text-3xl font-bold text-slate-100 font-mono">${totalValue.toLocaleString()}</div>
                        <div className="text-emerald-400 text-xs mt-2 flex items-center gap-1 font-medium">
                            <span className="filter grayscale opacity-70">💼</span> Portfolio
                        </div>
                    </div>
                </div>

                {/* Unrealized P/L */}
                <div className={`relative overflow-hidden rounded-lg border p-6 shadow-xl ${unrealizedPnl >= 0
                    ? 'bg-[#0b1121] border-emerald-500/20'
                    : 'bg-[#0b1121] border-red-500/20'
                    }`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${unrealizedPnl >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}></div>
                    <div className="relative">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Unrealized P/L</div>
                        <div className={`text-3xl font-bold font-mono ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            <span>{unrealizedPnl >= 0 ? '📈' : '📉'}</span> {positions.length} Position{positions.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Active Model */}
                <div className="relative overflow-hidden rounded-lg bg-[#0b1121] border border-slate-700/50 p-6 shadow-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Active Model</div>
                        {activeModel ? (
                            <>
                                <div className="text-xl font-bold text-slate-100 font-mono">v{activeModel.version}</div>
                                <div className="text-purple-400 text-xs mt-2 flex items-center gap-1 font-medium">
                                    <span className="filter grayscale opacity-70">🤖</span> {activeModel.methodology}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xl font-bold text-slate-500 font-mono">None</div>
                                <Link href="/dashboard/strategy-lab" className="text-emerald-400 text-xs mt-2 hover:underline font-medium">
                                    Create Strategy →
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Win Rate */}
                <div className="relative overflow-hidden rounded-lg bg-[#0b1121] border border-slate-700/50 p-6 shadow-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Win Rate</div>
                        <div className="text-3xl font-bold text-slate-100 font-mono">{activeModel?.winRate?.toFixed(0) || '--'}%</div>
                        <div className="text-cyan-400 text-xs mt-2 flex items-center gap-1 font-medium">
                            <span className="filter grayscale opacity-70">🎯</span> Strategy
                        </div>
                    </div>
                </div>

                {/* Scanner Status (Cron) */}
                <div
                    onClick={() => setShowScannerSettings(true)}
                    className="relative overflow-hidden rounded-lg bg-[#0b1121] border border-slate-700/50 p-6 cursor-pointer hover:bg-slate-800/50 transition-colors group shadow-xl"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400/50">
                        ⚙️
                    </div>
                    <div className="relative">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Scanner</div>
                        <div className="text-3xl font-bold text-slate-100 font-mono flex items-center gap-2">
                            <span>1m</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        </div>
                        <div className="text-amber-400 text-xs mt-2 flex items-center gap-1 font-medium">
                            <span className="filter grayscale opacity-70">⚡</span> {activeModel?.timeframes?.join(', ') || 'Auto'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Portfolio Widget */}
                <div className="bg-[#0c0c14] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>💰</span> Portfolio
                        </h2>
                    </div>
                    <div className="p-6">
                        <PortfolioWidget />
                    </div>
                </div>

                {/* Positions Widget */}
                <div className="bg-[#0c0c14] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>📊</span> Positions
                        </h2>
                    </div>
                    <div className="p-6">
                        <PositionsWidget />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/dashboard/strategy-lab" className="group p-5 rounded-2xl bg-[#0c0c14] border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            ⚗️
                        </div>
                        <div>
                            <div className="text-white font-semibold">Strategy Lab</div>
                            <div className="text-gray-500 text-sm">Create strategies</div>
                        </div>
                    </div>
                </Link>
                <Link href="/dashboard/backtest" className="group p-5 rounded-2xl bg-[#0c0c14] border border-white/5 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            🔬
                        </div>
                        <div>
                            <div className="text-white font-semibold">Backtest</div>
                            <div className="text-gray-500 text-sm">Test on history</div>
                        </div>
                    </div>
                </Link>
                <Link href="/dashboard/performance" className="group p-5 rounded-2xl bg-[#0c0c14] border border-white/5 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            📈
                        </div>
                        <div>
                            <div className="text-white font-semibold">Performance</div>
                            <div className="text-gray-500 text-sm">View analytics</div>
                        </div>
                    </div>
                </Link>
                <Link href="/dashboard/risk" className="group p-5 rounded-2xl bg-[#0c0c14] border border-white/5 hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            🛡️
                        </div>
                        <div>
                            <div className="text-white font-semibold">Risk</div>
                            <div className="text-gray-500 text-sm">Monitor risk</div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Scanner Settings Modal */}
            {showScannerSettings && (
                <ScannerSettingsModal
                    activeModelId={activeModel?.id || null}
                    currentTimeframes={activeModel?.timeframes || []}
                    isModelActive={activeModel?.status === 'ACTIVE'}
                    onClose={() => setShowScannerSettings(false)}
                    onSave={fetchDashboardData}
                />
            )}
        </div>
    );
}
