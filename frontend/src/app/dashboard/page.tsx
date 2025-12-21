export default function DashboardPage() {
    // Mock data
    const portfolioValue = 52340.50;
    const dailyPnL = 1234.50;
    const dailyPnLPercent = 2.42;
    const openPositions = 3;
    const activeSignals = 5;

    const recentSignals = [
        { symbol: "BTC-USD", direction: "LONG", confidence: 0.85, time: "2 min ago" },
        { symbol: "ETH-USD", direction: "HOLD", confidence: 0.62, time: "15 min ago" },
        { symbol: "SOL-USD", direction: "SHORT", confidence: 0.78, time: "1 hr ago" },
    ];

    const agentActivity = [
        { agent: "Strategy Consultant", action: "Generated LONG signal for BTC-USD", time: "2 min ago" },
        { agent: "Risk Officer", action: "Approved trade with 2% position size", time: "2 min ago" },
        { agent: "Market Analyst", action: "Detected whale accumulation", time: "15 min ago" },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Welcome back! Here&apos;s your trading overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Portfolio Value */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                    <div className="text-3xl font-bold text-white">
                        ${portfolioValue.toLocaleString()}
                    </div>
                    <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        +{dailyPnLPercent}% today
                    </div>
                </div>

                {/* Daily PnL */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Daily PnL</div>
                    <div className="text-3xl font-bold text-green-400">
                        +${dailyPnL.toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-sm mt-2">
                        Realized + Unrealized
                    </div>
                </div>

                {/* Open Positions */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Open Positions</div>
                    <div className="text-3xl font-bold text-white">{openPositions}</div>
                    <div className="text-gray-500 text-sm mt-2">
                        Across 3 pairs
                    </div>
                </div>

                {/* Active Signals */}
                <div className="card glass">
                    <div className="text-gray-400 text-sm mb-2">Active Signals</div>
                    <div className="text-3xl font-bold text-indigo-400">{activeSignals}</div>
                    <div className="text-gray-500 text-sm mt-2">
                        2 pending execution
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Signals */}
                <div className="card glass">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Recent Signals</h2>
                        <a href="/dashboard/signals" className="text-indigo-400 text-sm hover:underline">
                            View all
                        </a>
                    </div>
                    <div className="space-y-4">
                        {recentSignals.map((signal, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${signal.direction === "LONG"
                                            ? "bg-green-500/20 text-green-400"
                                            : signal.direction === "SHORT"
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-gray-500/20 text-gray-400"
                                        }`}>
                                        {signal.direction === "LONG" ? "↑" : signal.direction === "SHORT" ? "↓" : "—"}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{signal.symbol}</div>
                                        <div className="text-gray-500 text-sm">{signal.time}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`badge ${signal.direction === "LONG"
                                            ? "badge-success"
                                            : signal.direction === "SHORT"
                                                ? "badge-danger"
                                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                        }`}>
                                        {signal.direction}
                                    </div>
                                    <div className="text-gray-500 text-sm mt-1">
                                        {Math.round(signal.confidence * 100)}% conf
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Agent Activity */}
                <div className="card glass">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Agent Activity</h2>
                        <a href="/dashboard/agents" className="text-indigo-400 text-sm hover:underline">
                            View all
                        </a>
                    </div>
                    <div className="space-y-4">
                        {agentActivity.map((activity, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activity.agent.includes("Strategy")
                                        ? "bg-purple-500/20"
                                        : activity.agent.includes("Risk")
                                            ? "bg-emerald-500/20"
                                            : "bg-blue-500/20"
                                    }`}>
                                    {activity.agent.includes("Strategy")
                                        ? "🧠"
                                        : activity.agent.includes("Risk")
                                            ? "🛡️"
                                            : "🔍"}
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-medium text-sm">{activity.agent}</div>
                                    <div className="text-gray-400 text-sm">{activity.action}</div>
                                    <div className="text-gray-600 text-xs mt-1">{activity.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">🎯</span>
                    <span className="text-white font-medium">New Analysis</span>
                </button>
                <button className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">📊</span>
                    <span className="text-white font-medium">View PnL</span>
                </button>
                <button className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">🤖</span>
                    <span className="text-white font-medium">Agent Settings</span>
                </button>
                <button className="card glass glass-hover flex items-center gap-3 justify-center py-4">
                    <span className="text-xl">⚡</span>
                    <span className="text-white font-medium">Trade Now</span>
                </button>
            </div>
        </div>
    );
}
