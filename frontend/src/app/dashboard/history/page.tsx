export default function TradeHistoryPage() {
    // Mock trade history
    const trades = [
        { id: "1", symbol: "BTC-USD", side: "LONG", entryPrice: 41200, exitPrice: 42500, pnl: 1300, pnlPercent: 3.15, status: "CLOSED", openedAt: "2024-01-15 14:30", closedAt: "2024-01-15 18:45" },
        { id: "2", symbol: "ETH-USD", side: "SHORT", entryPrice: 2450, exitPrice: 2380, pnl: 700, pnlPercent: 2.86, status: "CLOSED", openedAt: "2024-01-15 10:15", closedAt: "2024-01-15 12:30" },
        { id: "3", symbol: "SOL-USD", side: "LONG", entryPrice: 98.50, exitPrice: null, pnl: 234, pnlPercent: 2.37, status: "OPEN", openedAt: "2024-01-15 16:00", closedAt: null },
        { id: "4", symbol: "BTC-USD", side: "LONG", entryPrice: 40800, exitPrice: 40200, pnl: -600, pnlPercent: -1.47, status: "CLOSED", openedAt: "2024-01-14 09:00", closedAt: "2024-01-14 11:30" },
        { id: "5", symbol: "ETH-USD", side: "LONG", entryPrice: 2320, exitPrice: 2410, pnl: 900, pnlPercent: 3.88, status: "CLOSED", openedAt: "2024-01-13 15:45", closedAt: "2024-01-13 22:00" },
        { id: "6", symbol: "AVAX-USD", side: "SHORT", entryPrice: 38.20, exitPrice: 36.50, pnl: 170, pnlPercent: 4.45, status: "CLOSED", openedAt: "2024-01-13 08:30", closedAt: "2024-01-13 14:15" },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
                <p className="text-gray-400">View all your past and active trades</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <button className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-indigo-400">
                    All
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-white/20">
                    Open
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-white/20">
                    Closed
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-white/20">
                    Winners
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:border-white/20">
                    Losers
                </button>
            </div>

            {/* Trades Table */}
            <div className="card glass overflow-hidden">
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
                        {trades.map((trade) => (
                            <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
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
                                    <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
                                    </div>
                                    <div className={`text-xs ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`badge ${trade.status === 'OPEN'
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                        }`}>
                                        {trade.status}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">{trade.openedAt}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <div className="text-gray-500 text-sm">
                    Showing 1-6 of 156 trades
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                        Previous
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/50 text-indigo-400">
                        1
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                        2
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                        3
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
