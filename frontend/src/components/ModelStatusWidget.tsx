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
        if (drawdown < 5) return "text-green-400";
        if (drawdown < 10) return "text-yellow-400";
        if (drawdown < 15) return "text-orange-400";
        return "text-red-400";
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            "ACTIVE": "bg-green-500/20 text-green-400",
            "APPROVED": "bg-blue-500/20 text-blue-400",
            "BACKTESTING": "bg-yellow-500/20 text-yellow-400",
            "RETRAINING": "bg-orange-500/20 text-orange-400",
            "DRAFT": "bg-gray-500/20 text-gray-400"
        };
        return colors[status] || colors["DRAFT"];
    };

    if (loading) {
        return (
            <div className="card glass animate-pulse">
                <div className="h-20 bg-gray-700/50 rounded"></div>
            </div>
        );
    }

    return (
        <div className="card glass">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    🧠 Trading Model
                </h3>
                {activeModel && (
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(activeModel.status)}`}>
                        {activeModel.status}
                    </span>
                )}
            </div>

            {activeModel ? (
                <>
                    {/* Active Model Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div className="text-gray-400 text-xs">Version</div>
                            <div className="text-xl font-bold text-white">
                                v{activeModel.version}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs">Methodology</div>
                            <div className="text-xl font-bold text-white">
                                {activeModel.methodology}
                            </div>
                        </div>
                    </div>

                    {/* Drawdown Meter */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Drawdown</span>
                            <span className={getDrawdownColor(activeModel.currentDrawdown)}>
                                {activeModel.currentDrawdown.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${activeModel.currentDrawdown < 5 ? 'bg-green-500' :
                                        activeModel.currentDrawdown < 10 ? 'bg-yellow-500' :
                                            activeModel.currentDrawdown < 15 ? 'bg-orange-500' :
                                                'bg-red-500'
                                    }`}
                                style={{ width: `${Math.min(activeModel.currentDrawdown * 6.67, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span className="text-red-400">15% retrain</span>
                        </div>
                    </div>

                    {/* Performance */}
                    {(activeModel.winRate || activeModel.sharpeRatio) && (
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                            {activeModel.winRate && (
                                <div>
                                    <div className="text-gray-400 text-xs">Win Rate</div>
                                    <div className="text-lg font-semibold text-green-400">
                                        {activeModel.winRate.toFixed(1)}%
                                    </div>
                                </div>
                            )}
                            {activeModel.sharpeRatio && (
                                <div>
                                    <div className="text-gray-400 text-xs">Sharpe Ratio</div>
                                    <div className="text-lg font-semibold text-blue-400">
                                        {activeModel.sharpeRatio.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-6">
                    <div className="text-gray-500 mb-2">No active model</div>
                    <p className="text-xs text-gray-600">
                        Run Strategy Analysis to generate a model
                    </p>
                </div>
            )}

            {/* Stats Footer */}
            {stats && (
                <div className="flex justify-between text-xs text-gray-400 pt-3 mt-3 border-t border-gray-700">
                    <span>{stats.total} total</span>
                    <span>{stats.approved} approved</span>
                    <span>{stats.backtesting} testing</span>
                </div>
            )}
        </div>
    );
}

export default ModelStatusWidget;
