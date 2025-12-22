"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface Signal {
    id: string;
    symbol: string;
    direction: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    status: string;
    executed: boolean;
    createdAt: string;
    strategyVersion?: string;
    pnlPercent?: number;
    actualOutcome?: string;
    reasoning?: any; // JSON object from DB
    agentReasoning?: {
        strategyConsultant?: string;
        riskOfficer?: string;
        marketAnalyst?: string;
    };
    executionPrice?: number;
    orderId?: string;
}

export default function SignalsPage() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'win' | 'loss'>('all');

    useEffect(() => {
        fetchSignals();
        const interval = setInterval(fetchSignals, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchSignals = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/trading/signals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && Array.isArray(data.data)) {
                // Map DB signals to UI format if needed, or use as is
                // Backend likely returns flat object, we might need to parse 'reasoning'
                const formatted = data.data.map((s: any) => ({
                    ...s,
                    // If reasoning is stored as JSON string/object in DB, ensure it's accessible
                    agentReasoning: typeof s.reasoning === 'string' ? JSON.parse(s.reasoning) : s.reasoning || {},
                    // Map DB status to UI filter status if needed
                    actualOutcome: s.pnlPercent ? (s.pnlPercent > 0 ? 'WIN' : 'LOSS') : undefined
                }));
                setSignals(formatted);
            }
        } catch (error) {
            console.error("Failed to fetch signals:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSignals = signals.filter(s => {
        if (filter === 'all') return true;
        if (filter === 'pending') return s.status === 'PENDING';
        if (filter === 'win') return s.actualOutcome === 'WIN' || (s.pnlPercent || 0) > 0;
        if (filter === 'loss') return s.actualOutcome === 'LOSS' || (s.pnlPercent || 0) < 0;
        return true;
    });

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Signal History</h1>
                <p className="text-gray-400">All tracked signals with AI agent reasoning</p>
                <button
                    onClick={fetchSignals}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                    <span>🔄</span> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                {(['all', 'pending', 'win', 'loss'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg transition-all capitalize ${filter === f
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                    >
                        {f === 'all' ? 'All Signals' : f}
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Signal List */}
                <div className="space-y-4">
                    {loading && filteredSignals.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Loading signals...</div>
                    ) : filteredSignals.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No signals found</div>
                    ) : (
                        filteredSignals.map(signal => (
                            <div
                                key={signal.id}
                                onClick={() => setSelectedSignal(signal)}
                                className={`card glass cursor-pointer transition-all hover:border-indigo-500/30 ${selectedSignal?.id === signal.id ? 'border-indigo-500/50 bg-indigo-500/5' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-bold text-white">{signal.symbol}</span>
                                        <span className={`badge ${signal.direction === 'LONG' ? 'badge-success' : 'badge-danger'}`}>
                                            {signal.direction}
                                        </span>
                                    </div>
                                    <span className={`badge ${signal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        signal.actualOutcome === 'WIN' ? 'badge-success' : 'badge-danger'
                                        }`}>
                                        {signal.status === 'PENDING' ? '⏳ Tracking' : signal.actualOutcome}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500">Entry</div>
                                        <div className="text-white font-medium">${signal.entryPrice.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">SL / TP</div>
                                        <div className="text-white font-medium">
                                            <span className="text-red-400">${signal.stopLoss.toLocaleString()}</span>
                                            {' / '}
                                            <span className="text-green-400">${signal.takeProfit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Confidence</div>
                                        <div className="text-indigo-400 font-bold">{Math.round(signal.confidence * 100)}%</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-gray-500 text-xs">{signal.strategyVersion}</span>
                                    <span className="text-gray-500 text-xs">{new Date(signal.createdAt).toLocaleString()}</span>
                                    {signal.pnlPercent !== undefined && (
                                        <span className={`font-bold ${signal.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Agent Thoughts Panel */}
                <div className="lg:sticky lg:top-8">
                    {selectedSignal ? (
                        <div className="card glass">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>🧠</span> Agent Reasoning - {selectedSignal.symbol}
                            </h2>

                            {/* Strategy Consultant */}
                            {selectedSignal.agentReasoning?.strategyConsultant && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">🎯</span>
                                        <span className="text-white font-bold">Strategy Consultant</span>
                                    </div>
                                    <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                            {selectedSignal.agentReasoning.strategyConsultant}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Risk Officer */}
                            {selectedSignal.agentReasoning?.riskOfficer && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">🛡️</span>
                                        <span className="text-white font-bold">Risk Officer</span>
                                    </div>
                                    <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                            {selectedSignal.agentReasoning.riskOfficer}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Market Analyst */}
                            {selectedSignal.agentReasoning?.marketAnalyst && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">📊</span>
                                        <span className="text-white font-bold">Market Analyst</span>
                                    </div>
                                    <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                            {selectedSignal.agentReasoning.marketAnalyst}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Fallback if no reasoning */}
                            {!selectedSignal.agentReasoning && (
                                <div className="text-gray-500 italic text-center p-4">
                                    No detailed reasoning available for this signal.
                                </div>
                            )}

                            {/* Execution info */}
                            {selectedSignal.executed && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <div className="text-gray-400 text-sm">
                                        <span className="text-green-400">✓ Executed</span>
                                        {selectedSignal.orderId && ` | Order: ${selectedSignal.orderId}`}
                                        {selectedSignal.executionPrice && ` | Price: $${selectedSignal.executionPrice}`}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card glass flex items-center justify-center h-96">
                            <div className="text-center text-gray-500">
                                <div className="text-4xl mb-4">🧠</div>
                                <p>Select a signal to view agent reasoning</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
