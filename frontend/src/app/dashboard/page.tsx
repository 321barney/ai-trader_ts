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

interface Subscription {
    plan: string;
    status: string;
    endsAt: string | null;
    termsAccepted: boolean;
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
    const [subscription, setSubscription] = useState<Subscription | null>(null);

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
            // Fetch subscription status first (always works, not protected)
            const subRes = await fetch(`${API_BASE}/api/subscription/status`, { headers });
            const subData = await subRes.json();
            if (subData.success) {
                setSubscription(subData.data);
            }

            // Only fetch trading data if user has active subscription
            // These will return 402 for free users and trigger redirect
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

    const unrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

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
            {/* Subscription Status Banner (for FREE users) */}
            {subscription && subscription.plan === 'FREE' && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                            <div className="text-white font-semibold">Upgrade to Pro</div>
                            <div className="text-gray-400 text-sm">Get unlimited trading signals and full AI agent access</div>
                        </div>
                    </div>
                    <Link href="/pricing" className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity">
                        Upgrade for $25/mo
                    </Link>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back. Here's your trading overview.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Subscription Badge */}
                    {subscription && (
                        <Link
                            href="/pricing"
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${subscription.plan === 'PRO'
                                    ? 'bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20'
                                    : subscription.plan === 'CUSTOM'
                                        ? 'bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20'
                                        : 'bg-gray-500/10 border border-gray-500/20 hover:bg-gray-500/20'
                                }`}
                        >
                            <span className={`text-sm font-medium ${subscription.plan === 'PRO' ? 'text-indigo-400'
                                    : subscription.plan === 'CUSTOM' ? 'text-purple-400'
                                        : 'text-gray-400'
                                }`}>
                                {subscription.plan === 'PRO' ? '⭐ Pro' : subscription.plan === 'CUSTOM' ? '🏆 Custom' : '🆓 Free'}
                            </span>
                        </Link>
                    )}

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
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-gray-400 text-sm mb-2">Total Value</div>
                        <div className="text-3xl font-bold text-white">${totalValue.toLocaleString()}</div>
                        <div className="text-indigo-400 text-sm mt-2 flex items-center gap-1">
                            <span>💼</span> Portfolio
                        </div>
                    </div>
                </div>

                {/* Unrealized P/L */}
                <div className={`relative overflow-hidden rounded-2xl border p-6 ${unrealizedPnl >= 0
                    ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20'
                    : 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20'
                    }`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${unrealizedPnl >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}></div>
                    <div className="relative">
                        <div className="text-gray-400 text-sm mb-2">Unrealized P/L</div>
                        <div className={`text-3xl font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                        </div>
                        <div className={`text-sm mt-2 flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span>{unrealizedPnl >= 0 ? '📈' : '📉'}</span> {positions.length} Position{positions.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Active Model */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-gray-400 text-sm mb-2">Active Model</div>
                        {activeModel ? (
                            <>
                                <div className="text-xl font-bold text-white">v{activeModel.version}</div>
                                <div className="text-purple-400 text-sm mt-2 flex items-center gap-1">
                                    <span>🤖</span> {activeModel.methodology}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xl font-bold text-gray-500">None</div>
                                <Link href="/dashboard/strategy-lab" className="text-indigo-400 text-sm mt-2 hover:underline">
                                    Create Strategy →
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Win Rate */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
                    <div className="relative">
                        <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                        <div className="text-3xl font-bold text-white">{activeModel?.winRate?.toFixed(0) || '--'}%</div>
                        <div className="text-cyan-400 text-sm mt-2 flex items-center gap-1">
                            <span>🎯</span> Strategy
                        </div>
                    </div>
                </div>

                {/* Scanner Status (Cron) */}
                <div
                    onClick={() => setShowScannerSettings(true)}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 p-6 cursor-pointer hover:bg-orange-500/10 transition-colors group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400">
                        ⚙️
                    </div>
                    <div className="relative">
                        <div className="text-gray-400 text-sm mb-2">Scanner</div>
                        <div className="text-3xl font-bold text-white flex items-center gap-2">
                            <span>1m</span>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                        </div>
                        <div className="text-orange-400 text-sm mt-2 flex items-center gap-1">
                            <span>⚡</span> {activeModel?.timeframes?.join(', ') || 'Auto'}
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
                    onClose={() => setShowScannerSettings(false)}
                    onSave={fetchDashboardData}
                />
            )}
        </div>
    );
}
