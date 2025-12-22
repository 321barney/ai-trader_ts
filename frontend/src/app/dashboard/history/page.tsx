"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface Trade {
    id: string;
    symbol: string;
    side: string;
    entryPrice: number;
    exitPrice?: number;
    pnl?: number;
    pnlPercent?: number;
    status: string;
    openedAt: string;
    closedAt?: string;
}

interface Signal {
    id: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    confidence: number;
    methodology: string;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    status: string;
    sourceMode?: string;
    createdAt: string;
}

export default function TradeHistoryPage() {
    const [activeTab, setActiveTab] = useState<'trades' | 'signals'>('signals');
    const [trades, setTrades] = useState<Trade[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'EXECUTED' | 'BACKTEST'>('ALL');
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (activeTab === 'trades') {
            fetchTrades();
        } else {
            fetchSignals();
        }
    }, [activeTab]);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/trading/trades?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTrades(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch trades:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSignals = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch(`${API_BASE}/api/trading/signals?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSignals(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch signals:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSignals = signals.filter(s => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') return s.status === 'ACTIVE';
        if (filter === 'EXECUTED') return s.status === 'EXECUTED';
        if (filter === 'BACKTEST') return s.sourceMode === 'BACKTEST';
        return true;
    });

    const filteredTrades = trades.filter(t => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') return t.status === 'OPEN';
        if (filter === 'EXECUTED') return t.status === 'CLOSED';
        return true;
    });

    const ITEMS_PER_PAGE = 15;
    const items = activeTab === 'signals' ? filteredSignals : filteredTrades;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'EXECUTED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'HIT_TP': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'HIT_SL': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'EXPIRED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getSourceBadge = (sourceMode?: string) => {
        if (!sourceMode) return null;
        const colors: Record<string, string> = {
            'BACKTEST': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'SIGNAL': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'TRADE': 'bg-green-500/20 text-green-400 border-green-500/30',
        };
        return (
            <span className={`badge text-xs ${colors[sourceMode] || 'bg-gray-500/20 text-gray-400'}`}>
                {sourceMode}
            </span>
        );
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">History</h1>
                    <p className="text-gray-400">View all your signals and trades</p>
                </div>
                <button
                    onClick={() => activeTab === 'signals' ? fetchSignals() : fetchTrades()}
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                    <span>🔄</span> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => { setActiveTab('signals'); setPage(1); setFilter('ALL'); }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'signals'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                >
                    📡 Signals ({signals.length})
                </button>
                <button
                    onClick={() => { setActiveTab('trades'); setPage(1); setFilter('ALL'); }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'trades'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                >
                    💼 Trades ({trades.length})
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                {activeTab === 'signals' ? (
                    ['ALL', 'ACTIVE', 'EXECUTED', 'BACKTEST'].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f as any); setPage(1); }}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${filter === f
                                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                        >
                            {f.toLowerCase()}
                        </button>
                    ))
                ) : (
                    ['ALL', 'ACTIVE', 'EXECUTED'].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f as any); setPage(1); }}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${filter === f
                                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                        >
                            {f.toLowerCase()}
                        </button>
                    ))
                )}
            </div>

            {/* Content */}
            <div className="card glass overflow-hidden">
                <div className="overflow-x-auto">
                    {activeTab === 'signals' ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Direction</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Entry</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">SL / TP</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Confidence</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Method</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Source</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500">Loading signals...</td></tr>
                                ) : paginatedItems.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500">No signals found</td></tr>
                                ) : (
                                    (paginatedItems as Signal[]).map((signal) => (
                                        <tr key={signal.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <span className="text-white font-bold">{signal.symbol}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${signal.direction === 'LONG' ? 'badge-success' : 'badge-danger'}`}>
                                                    {signal.direction === 'LONG' ? '📈' : '📉'} {signal.direction}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300">${signal.entryPrice?.toLocaleString()}</td>
                                            <td className="p-4 text-sm">
                                                <div className="text-red-400">SL: ${signal.stopLoss?.toLocaleString() || '—'}</div>
                                                <div className="text-green-400">TP: ${signal.takeProfit?.toLocaleString() || '—'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${signal.confidence > 0.7 ? 'bg-green-500' : signal.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${signal.confidence * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-300 text-sm">{(signal.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs">
                                                    {signal.methodology || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge border ${getStatusColor(signal.status)}`}>
                                                    {signal.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {getSourceBadge(signal.sourceMode)}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {new Date(signal.createdAt).toLocaleDateString()} {new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Side</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Entry</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Exit</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">PnL</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-left p-4 text-gray-400 font-medium">Opened</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading trades...</td></tr>
                                ) : paginatedItems.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No trades found</td></tr>
                                ) : (
                                    (paginatedItems as Trade[]).map((trade) => (
                                        <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <span className="text-white font-bold">{trade.symbol}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${trade.side === 'LONG' ? 'badge-success' : 'badge-danger'}`}>
                                                    {trade.side}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300">${trade.entryPrice.toLocaleString()}</td>
                                            <td className="p-4 text-gray-300">
                                                {trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="p-4">
                                                <div className={`font-bold ${!trade.pnl ? 'text-gray-400' : trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toLocaleString()}` : '—'}
                                                </div>
                                                {trade.pnlPercent !== undefined && trade.pnlPercent !== null && (
                                                    <div className={`text-xs ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${trade.status === 'OPEN'
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                    }`}>
                                                    {trade.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {new Date(trade.openedAt).toLocaleDateString()} {new Date(trade.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <div className="text-gray-500 text-sm">
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, items.length)} of {items.length} {activeTab}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`px-4 py-2 rounded-lg border ${page === i + 1
                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
