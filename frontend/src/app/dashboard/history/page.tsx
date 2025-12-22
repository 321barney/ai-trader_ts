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

export default function TradeHistoryPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'WIN' | 'LOSS'>('ALL');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchTrades();
    }, []);

    const fetchTrades = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Fetch a decent amount of recent trades
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

    const filteredTrades = trades.filter(t => {
        if (filter === 'ALL') return true;
        if (filter === 'OPEN') return t.status === 'OPEN';
        if (filter === 'CLOSED') return t.status === 'CLOSED';
        if (filter === 'WIN') return (t.pnl || 0) > 0;
        if (filter === 'LOSS') return (t.pnl || 0) < 0;
        return true;
    });

    // Client-side pagination for smoother UX with small datasets
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
    const paginatedTrades = filteredTrades.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
                    <p className="text-gray-400">View all your past and active trades</p>
                </div>
                <button
                    onClick={fetchTrades}
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                >
                    <span>🔄</span> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                {(['ALL', 'OPEN', 'CLOSED', 'WIN', 'LOSS'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => { setFilter(f); setPage(1); }}
                        className={`px-4 py-2 rounded-lg capitalize transition-all ${filter === f
                                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                    >
                        {f.toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Trades Table */}
            <div className="card glass overflow-hidden">
                <div className="overflow-x-auto">
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
                            ) : paginatedTrades.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No trades found</td></tr>
                            ) : (
                                paginatedTrades.map((trade) => (
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
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <div className="text-gray-500 text-sm">
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredTrades.length)} of {filteredTrades.length} trades
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
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
