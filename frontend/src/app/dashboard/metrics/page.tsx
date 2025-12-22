"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface MetricsData {
    totalPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    sharpeRatio: number;
    maxDrawdown: number;
    averageWin: number;
    averageLoss: number;
}

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const res = await api.get<MetricsData>('/api/trading/pnl');
            if (res.success && res.data) {
                setMetrics(res.data);
            } else {
                setError(res.error || 'Failed to load metrics');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="card glass p-6 text-center">
                    <p className="text-red-400">⚠️ {error}</p>
                    <p className="text-gray-500 mt-2">Ensure your Aster DEX API keys are configured in Settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">📊 Metrics & Performance</h1>
            <p className="text-gray-400 mb-8">Your trading performance at a glance.</p>

            {/* PnL Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total PnL</div>
                    <div className={`text-3xl font-bold ${(metrics?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(metrics?.totalPnL || 0) >= 0 ? '+' : ''}${metrics?.totalPnL?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Realized PnL</div>
                    <div className={`text-3xl font-bold ${(metrics?.realizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(metrics?.realizedPnL || 0) >= 0 ? '+' : ''}${metrics?.realizedPnL?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Unrealized PnL</div>
                    <div className={`text-3xl font-bold ${(metrics?.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(metrics?.unrealizedPnL || 0) >= 0 ? '+' : ''}${metrics?.unrealizedPnL?.toFixed(2) || '0.00'}
                    </div>
                </div>
            </div>

            {/* Win Rate & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                    <div className="text-3xl font-bold text-white">{((metrics?.winRate || 0) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500 mt-1">{metrics?.winningTrades || 0}W / {metrics?.losingTrades || 0}L</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total Trades</div>
                    <div className="text-3xl font-bold text-white">{metrics?.totalTrades || 0}</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Sharpe Ratio</div>
                    <div className="text-3xl font-bold text-indigo-400">{metrics?.sharpeRatio?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Max Drawdown</div>
                    <div className="text-3xl font-bold text-red-400">{metrics?.maxDrawdown?.toFixed(2) || '0'}%</div>
                </div>
            </div>

            {/* Average Win/Loss */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Average Win</div>
                    <div className="text-2xl font-bold text-green-400">+${metrics?.averageWin?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Average Loss</div>
                    <div className="text-2xl font-bold text-red-400">-${Math.abs(metrics?.averageLoss || 0).toFixed(2)}</div>
                </div>
            </div>
        </div>
    );
}
