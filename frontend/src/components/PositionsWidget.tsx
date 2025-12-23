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
        <div className="card glass">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📈</span> Open Positions
                    <span className="text-sm font-normal text-gray-400">({positions.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${executionStatus?.execution?.running ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <button
                        onClick={() => toggleExecution(executionStatus?.execution?.running ? 'stop' : 'start')}
                        className={`text-xs px-3 py-1 rounded-full ${executionStatus?.execution?.running
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                    >
                        {executionStatus?.execution?.running ? 'Stop' : 'Start'}
                    </button>
                </div>
            </div>

            {/* Total P/L */}
            {positions.length > 0 && (
                <div className={`text-center p-3 rounded-lg mb-4 ${totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="text-sm text-gray-400">Unrealized P/L</div>
                    <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                    </div>
                </div>
            )}

            {/* Positions List */}
            {loading ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
            ) : positions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    <div className="text-3xl mb-2">📭</div>
                    <div>No open positions</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {positions.map(pos => (
                        <div key={pos.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{pos.symbol}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${pos.side === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {pos.side}
                                    </span>
                                </div>
                                <button
                                    onClick={() => closePosition(pos.id)}
                                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-400"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <div className="text-gray-500">Entry</div>
                                    <div className="text-white">${pos.entryPrice.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Current</div>
                                    <div className="text-white">${pos.currentPrice?.toFixed(2) || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">P/L</div>
                                    <div className={`font-bold ${(pos.unrealizedPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {(pos.unrealizedPnl || 0) >= 0 ? '+' : ''}{(pos.unrealizedPnlPercent || 0).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            {/* TP/SL indicators */}
                            <div className="flex gap-4 mt-2 text-xs">
                                {pos.stopLoss && (
                                    <span className="text-red-400">SL: ${pos.stopLoss.toFixed(2)}</span>
                                )}
                                {pos.takeProfit && (
                                    <span className="text-green-400">TP: ${pos.takeProfit.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
