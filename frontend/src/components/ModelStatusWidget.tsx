"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";

interface ModelStats {
    total: number;
    active: number;
    approved: number;
    backtesting: number;
    currentDrawdown: number;
    activeModelVersion: number | null;
}

interface TradingModel {
    id: string;
    version: number;
    methodology: string;
    status: string;
    isActive: boolean;
    currentDrawdown: number;
    winRate?: number;
    sharpeRatio?: number;
    createdAt: string;
}

export function ModelStatusWidget() {
    const [stats, setStats] = useState<ModelStats | null>(null);
    const [activeModel, setActiveModel] = useState<TradingModel | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModelData();
    }, []);

    const fetchModelData = async () => {
        const token = api.getAccessToken();
        if (!token) {
            setLoading(false);
            return;
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        try {
            const [statsRes, activeRes] = await Promise.all([
                fetch(`${API_BASE}/api/models/stats/overview`, { headers }),
                fetch(`${API_BASE}/api/models/active`, { headers })
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                if (data.success) setStats(data.data);
            }

            if (activeRes.ok) {
                const data = await activeRes.json();
                if (data.success && data.data) setActiveModel(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch model data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getDrawdownColor = (drawdown: number) => {
        if (drawdown < 5) return "text-emerald-400";
        if (drawdown < 10) return "text-amber-400";
        if (drawdown < 15) return "text-orange-400";
        return "text-red-400";
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            "ACTIVE": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            "APPROVED": "bg-blue-500/10 border-blue-500/20 text-blue-400",
            "BACKTESTING": "bg-amber-500/10 border-amber-500/20 text-amber-400",
            "RETRAINING": "bg-orange-500/10 border-orange-500/20 text-orange-400",
            "DRAFT": "bg-slate-500/10 border-slate-500/20 text-slate-400"
        };
        return colors[status] || colors["DRAFT"];
    };

    if (loading) {
        return (
            <div className="card glass-panel border-thin animate-pulse">
                <div className="h-20 bg-slate-800/50 rounded"></div>
            </div>
        );
    }

    return (
        <div className="card glass-panel border-thin">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="text-purple-500">🧠</span> Trading Model
                </h3>
                {activeModel && (
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider border ${getStatusBadge(activeModel.status)}`}>
                        {activeModel.status}
                    </span>
                )}
            </div>

            {activeModel ? (
                <>
                    {/* Active Model Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div className="text-slate-500 text-xs uppercase">Version</div>
                            <div className="text-xl font-mono font-bold text-slate-100">
                                v{activeModel.version}
                            </div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs uppercase">Methodology</div>
                            <div className="text-xl font-mono font-bold text-slate-100">
                                {activeModel.methodology}
                            </div>
                        </div>
                    </div>

                    {/* Drawdown Meter */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500 text-xs uppercase">Drawdown</span>
                            <span className={`font-mono font-bold ${getDrawdownColor(activeModel.currentDrawdown)}`}>
                                {activeModel.currentDrawdown.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${activeModel.currentDrawdown < 5 ? 'bg-emerald-500' :
                                    activeModel.currentDrawdown < 10 ? 'bg-amber-500' :
                                        activeModel.currentDrawdown < 15 ? 'bg-orange-500' :
                                            'bg-red-500'
                                    }`}
                                style={{ width: `${Math.min(activeModel.currentDrawdown * 6.67, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                            <span>0%</span>
                            <span className="text-red-400/70">15% retrain</span>
                        </div>
                    </div>

                    {/* Performance */}
                    {(activeModel.winRate || activeModel.sharpeRatio) && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                            {activeModel.winRate && (
                                <div>
                                    <div className="text-slate-500 text-xs uppercase">Win Rate</div>
                                    <div className="text-lg font-mono font-semibold text-emerald-400">
                                        {activeModel.winRate.toFixed(1)}%
                                    </div>
                                </div>
                            )}
                            {activeModel.sharpeRatio && (
                                <div>
                                    <div className="text-slate-500 text-xs uppercase">Sharpe Ratio</div>
                                    <div className="text-lg font-mono font-semibold text-blue-400">
                                        {activeModel.sharpeRatio.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-8">
                    <div className="text-slate-500 mb-2 uppercase tracking-wide text-sm">No active model</div>
                    <p className="text-xs text-slate-600">
                        Run Strategy Analysis to generate a model
                    </p>
                </div>
            )}

            {/* Stats Footer */}
            {stats && (
                <div className="flex justify-between text-xs text-slate-500 pt-3 mt-3 border-t border-slate-800/50 font-mono">
                    <span>{stats.total} total</span>
                    <span>{stats.approved} approved</span>
                    <span>{stats.backtesting} testing</span>
                </div>
            )}
        </div>
    );
}

export default ModelStatusWidget;
