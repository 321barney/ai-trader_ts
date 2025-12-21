'use client';

import { useState } from 'react';
import { API_BASE } from '@/lib/api';

interface ReplayConfig {
    initDate: string;
    endDate: string;
    initialCapital: number;
    symbol: string;
}

interface PortfolioSnapshot {
    date: string;
    value: number;
}

export default function BacktestPage() {
    const [config, setConfig] = useState<ReplayConfig>({
        initDate: '2024-01-01',
        endDate: '2024-03-31',
        initialCapital: 10000,
        symbol: 'BTCUSDT'
    });
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState('idle');
    const [currentDate, setCurrentDate] = useState('');
    const [portfolioValue, setPortfolioValue] = useState(10000);
    const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);

    const startReplay = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/features/replay/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...config,
                    speed: 1,
                    mode: 'daily',
                    symbols: [config.symbol]
                })
            });
            const data = await res.json();
            if (data.success) {
                setSessionId(data.data.id);
                setStatus('running');
                setCurrentDate(data.data.currentDate);
                setPortfolioHistory([{ date: data.data.currentDate, value: config.initialCapital }]);
            }
        } catch (error) {
            console.error('Failed to start replay:', error);
        }
    };

    const advanceTime = async () => {
        if (!sessionId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/features/replay/action/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'advance', steps: 1 })
            });
            const data = await res.json();
            if (data.success) {
                if (data.data.status === 'completed') setStatus('completed');
                setCurrentDate(data.data.currentDate);
                const newValue = data.data.portfolio.totalValue;
                setPortfolioValue(newValue);
                setPortfolioHistory(prev => [...prev, { date: data.data.currentDate, value: newValue }]);
            }
        } catch (error) {
            console.error('Failed to advance time:', error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white">Historical Replay</h1>
                <p className="text-gray-400">Backtest your strategies with anti-look-ahead protection</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="bg-[#12121a] border border-white/5 rounded-xl p-6 space-y-4 h-fit">
                    <h2 className="text-lg font-semibold text-white">Simulation Config</h2>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Symbol</label>
                        <input
                            type="text"
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={config.symbol}
                            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Start Date</label>
                            <input
                                type="date"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                                value={config.initDate}
                                onChange={(e) => setConfig({ ...config, initDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">End Date</label>
                            <input
                                type="date"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                                value={config.endDate}
                                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Initial Capital ($)</label>
                        <input
                            type="number"
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={config.initialCapital}
                            onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
                        />
                    </div>

                    <button
                        onClick={startReplay}
                        disabled={status === 'running'}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                        {status === 'running' ? 'Simulation Active' : 'Start Simulation'}
                    </button>
                </div>

                {/* Simulation View */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Bar */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                        <div>
                            <div className="text-sm text-gray-400">Current Date</div>
                            <div className="text-xl font-mono text-white">{currentDate ? new Date(currentDate).toDateString() : '---'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400">Portfolio Value</div>
                            <div className={`text-2xl font-bold ${portfolioValue >= config.initialCapital ? 'text-green-400' : 'text-red-400'}`}>
                                ${portfolioValue.toLocaleString()}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={advanceTime}
                                disabled={status !== 'running'}
                                className="bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white p-2 rounded-lg"
                            >
                                Step Forward ⏭️
                            </button>
                            <button className="bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white p-2 rounded-lg">
                                ▶️ Auto Play
                            </button>
                        </div>
                    </div>

                    {/* Portfolio Equity Curve */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6 h-80 relative overflow-hidden">
                        <h3 className="text-sm text-gray-400 mb-2">Portfolio Equity Curve</h3>
                        {portfolioHistory.length > 1 ? (
                            <div className="absolute bottom-4 left-4 right-4 top-10 flex items-end gap-1">
                                {(() => {
                                    const values = portfolioHistory.map(p => p.value);
                                    const min = Math.min(...values) * 0.95;
                                    const max = Math.max(...values) * 1.05;
                                    const range = max - min || 1;
                                    return portfolioHistory.map((p, i) => {
                                        const height = ((p.value - min) / range) * 100;
                                        const isGain = p.value >= config.initialCapital;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-t transition-all duration-300 ${isGain ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                                                style={{ height: `${Math.max(5, height)}%` }}
                                                title={`${new Date(p.date).toLocaleDateString()}: $${p.value.toLocaleString()}`}
                                            />
                                        );
                                    });
                                })()}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Start simulation to see equity curve
                            </div>
                        )}
                    </div>

                    {/* Recent Trades */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Trade Log</h3>
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="pb-2">Time</th>
                                    <th className="pb-2">Side</th>
                                    <th className="pb-2">Price</th>
                                    <th className="pb-2">Qty</th>
                                    <th className="pb-2">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} className="py-4 text-center text-gray-600">No trades executed yet</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
