"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface Position {
    id: string;
    symbol: string;
    side: string;
    entryPrice: number;
    currentPrice?: number;
    size: number;
    unrealizedPnl?: number;
    unrealizedPnlPercent?: number;
    stopLoss?: number;
    takeProfit?: number;
    status: string;
}

export default function PositionsWidget() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [executionStatus, setExecutionStatus] = useState<any>(null);

    useEffect(() => {
        fetchPositions();
        const interval = setInterval(fetchPositions, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPositions = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;

            const [posRes, statusRes] = await Promise.all([
                fetch(`${API_BASE}/api/positions`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/positions/execution/status`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const posData = await posRes.json();
            const statusData = await statusRes.json();

            if (posData.success) setPositions(posData.data);
            if (statusData.success) setExecutionStatus(statusData.data);
        } catch (error) {
            console.error("Failed to fetch positions:", error);
        } finally {
            setLoading(false);
        }
    };

    const closePosition = async (positionId: string) => {
        try {
            const token = api.getAccessToken();
            await fetch(`${API_BASE}/api/positions/${positionId}/close`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPositions();
        } catch (error) {
            console.error("Failed to close position:", error);
        }
    };

    const toggleExecution = async (action: 'start' | 'stop') => {
        try {
            const token = api.getAccessToken();
            await fetch(`${API_BASE}/api/positions/execution/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPositions();
        } catch (error) {
            console.error("Failed to toggle execution:", error);
        }
    };

    const totalPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);

    return (
        <div className="card glass-panel border-thin">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-blue-500">📈</span> Open Positions
                    <span className="text-sm font-normal text-slate-400">({positions.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${executionStatus?.execution?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                    <button
                        onClick={() => toggleExecution(executionStatus?.execution?.running ? 'stop' : 'start')}
                        className={`text-xs px-3 py-1 rounded border font-medium uppercase tracking-wider transition-colors ${executionStatus?.execution?.running
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                    >
                        {executionStatus?.execution?.running ? 'Stop' : 'Start'}
                    </button>
                </div>
            </div>

            {/* Total P/L */}
            {positions.length > 0 && (
                <div className={`text-center p-3 rounded-lg mb-4 border ${totalPnl >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Unrealized P/L</div>
                    <div className={`text-2xl font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                    </div>
                </div>
            )}

            {/* Positions List */}
            {loading ? (
                <div className="text-center text-slate-500 py-4 text-sm uppercase tracking-wider">Loading...</div>
            ) : positions.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                    <div className="text-3xl mb-2 opacity-50">📭</div>
                    <div className="text-sm uppercase tracking-wider">No open positions</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {positions.map(pos => (
                        <div key={pos.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-100">{pos.symbol}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${pos.side === 'LONG' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                        {pos.side}
                                    </span>
                                </div>
                                <button
                                    onClick={() => closePosition(pos.id)}
                                    className="text-xs px-2 py-1 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded text-slate-400 transition-colors"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <div className="text-slate-500 text-xs uppercase">Entry</div>
                                    <div className="text-slate-200 font-mono">${pos.entryPrice.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs uppercase">Current</div>
                                    <div className="text-slate-200 font-mono">${pos.currentPrice?.toFixed(2) || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs uppercase">P/L</div>
                                    <div className={`font-mono font-bold ${(pos.unrealizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {(pos.unrealizedPnl || 0) >= 0 ? '+' : ''}{(pos.unrealizedPnlPercent || 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            {/* TP/SL indicators */}
                            <div className="flex gap-4 mt-2 text-xs font-mono border-t border-slate-800/50 pt-2">
                                {pos.stopLoss && (
                                    <span className="text-red-400/80">SL: ${pos.stopLoss.toFixed(2)}</span>
                                )}
                                {pos.takeProfit && (
                                    <span className="text-emerald-400/80">TP: ${pos.takeProfit.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
