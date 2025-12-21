export default function PnLPage() {
    // Mock PnL data
    const pnlData = {
        pnl1D: 1234.50,
        pnl7D: 3456.78,
        pnl30D: 8901.23,
        totalPnL: 15234.50,
        portfolioValue: 52340.50,
        totalTrades: 156,
        winRate: 68,
    };

    const pnlByPair = [
        { pair: "BTC-USD", pnl: 8500, trades: 45, winRate: 71 },
        { pair: "ETH-USD", pnl: 4200, trades: 52, winRate: 65 },
        { pair: "SOL-USD", pnl: 2100, trades: 38, winRate: 66 },
        { pair: "AVAX-USD", pnl: 434.50, trades: 21, winRate: 62 },
    ];

    const pnlByStrategy = [
        { strategy: "SMC", pnl: 9800, trades: 78, winRate: 72 },
        { strategy: "ICT", pnl: 3400, trades: 45, winRate: 64 },
        { strategy: "RL Model", pnl: 2034.50, trades: 33, winRate: 67 },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">PnL Analytics</h1>
                <p className="text-gray-400">Track your trading performance</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total PnL</div>
                    <div className="text-3xl font-bold text-green-400">
                        +${pnlData.totalPnL.toLocaleString()}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                    <div className="text-3xl font-bold text-white">
                        ${pnlData.portfolioValue.toLocaleString()}
                    </div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Total Trades</div>
                    <div className="text-3xl font-bold text-white">{pnlData.totalTrades}</div>
                </div>
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                    <div className="text-3xl font-bold text-indigo-400">{pnlData.winRate}%</div>
                </div>
            </div>

            {/* Time Period PnL */}
            <div className="card glass mb-8">
                <h2 className="text-xl font-bold text-white mb-6">PnL by Period</h2>
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { label: "24 Hours", value: pnlData.pnl1D },
                        { label: "7 Days", value: pnlData.pnl7D },
                        { label: "30 Days", value: pnlData.pnl30D },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center p-6 bg-white/5 rounded-lg">
                            <div className="text-gray-400 text-sm mb-2">{label}</div>
                            <div className={`text-2xl font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {value >= 0 ? '+' : ''}${value.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PnL Breakdown */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* By Pair */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6">PnL by Pair</h2>
                    <div className="space-y-4">
                        {pnlByPair.map((item) => (
                            <div key={item.pair} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <div className="text-white font-bold">{item.pair}</div>
                                    <div className="text-gray-500 text-sm">{item.trades} trades • {item.winRate}% win</div>
                                </div>
                                <div className={`text-xl font-bold ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Strategy */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6">PnL by Strategy</h2>
                    <div className="space-y-4">
                        {pnlByStrategy.map((item) => (
                            <div key={item.strategy} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <div className="text-white font-bold">{item.strategy}</div>
                                    <div className="text-gray-500 text-sm">{item.trades} trades • {item.winRate}% win</div>
                                </div>
                                <div className={`text-xl font-bold ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
