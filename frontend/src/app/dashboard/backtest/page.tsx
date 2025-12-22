'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

interface Strategy {
    id: string;
    version: number;
    status: string;
    baseMethodology: string;
}

function BacktestContent() {
    const searchParams = useSearchParams();
    const strategyIdFromUrl = searchParams.get('strategyId');
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
    const [autoPlay, setAutoPlay] = useState(false);
    const autoPlayRef = useRef(autoPlay);

    // User's selected pairs from settings
    const [userPairs, setUserPairs] = useState<string[]>(['BTCUSDT', 'ETHUSDT']);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');

    // Fetch user pairs and strategies on mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fetch user settings for pairs
                const userRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = await userRes.json();
                if (userData.success && userData.data?.tradingSettings?.pairs) {
                    setUserPairs(userData.data.tradingSettings.pairs);
                    if (userData.data.tradingSettings.pairs.length > 0) {
                        setConfig(prev => ({ ...prev, symbol: userData.data.tradingSettings.pairs[0] }));
                    }
                }

                // Fetch strategies
                const stratRes = await fetch(`${API_BASE}/api/strategies`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const stratData = await stratRes.json();
                if (stratData.success && Array.isArray(stratData.data)) {
                    setStrategies(stratData.data);
                    // Use strategyId from URL if present, otherwise default to first DRAFT
                    if (strategyIdFromUrl) {
                        setSelectedStrategyId(strategyIdFromUrl);
                    } else {
                        const draft = stratData.data.find((s: Strategy) => s.status === 'DRAFT');
                        if (draft) setSelectedStrategyId(draft.id);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch user data:', e);
            }
        };
        fetchUserData();
    }, [strategyIdFromUrl]);

    // Keep ref in sync with state
    useEffect(() => {
        autoPlayRef.current = autoPlay;
    }, [autoPlay]);

    // Auto-play loop
    useEffect(() => {
        if (!autoPlay || status !== 'running') return;

        const interval = setInterval(async () => {
            if (!autoPlayRef.current) return;
            await advanceTime();
        }, 1000); // 1 step per second

        return () => clearInterval(interval);
    }, [autoPlay, status]);

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

            if (!data.success) {
                // Stop auto play on error (e.g., session expired)
                setAutoPlay(false);
                setStatus('idle');
                setSessionId(null);
                if (data.code === 'SESSION_EXPIRED') {
                    alert('Session expired. Please start a new backtest.');
                }
                return;
            }

            if (data.data.status === 'completed') setStatus('completed');
            setCurrentDate(data.data.currentDate);
            const newValue = data.data.portfolio.totalValue;
            setPortfolioValue(newValue);
            setPortfolioHistory(prev => [...prev, { date: data.data.currentDate, value: newValue }]);
        } catch (error) {
            console.error('Failed to advance time:', error);
            // Stop auto play on network error
            setAutoPlay(false);
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
                        <label className="text-sm text-gray-400">Symbol (from your settings)</label>
                        <select
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={config.symbol}
                            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                        >
                            {userPairs.map(pair => (
                                <option key={pair} value={pair}>{pair}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Strategy to Test</label>
                        <select
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={selectedStrategyId}
                            onChange={(e) => setSelectedStrategyId(e.target.value)}
                        >
                            {strategies.length === 0 && (
                                <option value="">No strategies - create one first</option>
                            )}
                            {strategies.map(s => (
                                <option key={s.id} value={s.id}>
                                    v{s.version} - {s.baseMethodology} ({s.status})
                                </option>
                            ))}
                        </select>
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
                            <button
                                onClick={() => setAutoPlay(!autoPlay)}
                                disabled={status !== 'running'}
                                className={`${autoPlay ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-30 text-white p-2 rounded-lg`}
                            >
                                {autoPlay ? '⏹️ Stop' : '▶️ Auto Play'}
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

                    {/* Backtest Summary & Approval - Shows when completed */}
                    {status === 'completed' && (
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                📊 Backtest Summary
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="text-gray-400 text-sm">Final Value</div>
                                    <div className={`text-2xl font-bold ${portfolioValue >= config.initialCapital ? 'text-green-400' : 'text-red-400'}`}>
                                        ${portfolioValue.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="text-gray-400 text-sm">Total Return</div>
                                    <div className={`text-2xl font-bold ${portfolioValue >= config.initialCapital ? 'text-green-400' : 'text-red-400'}`}>
                                        {(((portfolioValue - config.initialCapital) / config.initialCapital) * 100).toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="text-gray-400 text-sm">Duration</div>
                                    <div className="text-2xl font-bold text-white">
                                        {portfolioHistory.length} days
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4">
                                    <div className="text-gray-400 text-sm">Max Drawdown</div>
                                    <div className="text-2xl font-bold text-yellow-400">
                                        {(() => {
                                            let peak = config.initialCapital;
                                            let maxDD = 0;
                                            portfolioHistory.forEach(p => {
                                                if (p.value > peak) peak = p.value;
                                                const dd = ((peak - p.value) / peak) * 100;
                                                if (dd > maxDD) maxDD = dd;
                                            });
                                            return maxDD.toFixed(1);
                                        })()}%
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={async () => {
                                        if (!selectedStrategyId) {
                                            alert('No strategy selected');
                                            return;
                                        }
                                        try {
                                            const token = localStorage.getItem('token');
                                            // First mark backtest as completed
                                            await fetch(`${API_BASE}/api/strategies/${selectedStrategyId}/backtest-complete`, {
                                                method: 'PUT',
                                                headers: {
                                                    Authorization: `Bearer ${token}`,
                                                    'Content-Type': 'application/json'
                                                }
                                            });
                                            // Then mark as tested
                                            const res = await fetch(`${API_BASE}/api/strategies/${selectedStrategyId}/test`, {
                                                method: 'PUT',
                                                headers: {
                                                    Authorization: `Bearer ${token}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: '{}'
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                alert('✅ Strategy approved and marked as TESTED! Go to Strategy Lab to promote it to ACTIVE.');
                                            } else {
                                                alert(`❌ ${data.error || 'Failed to approve'}`);
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('Failed to approve strategy');
                                        }
                                    }}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                                >
                                    ✓ Approve Strategy
                                </button>
                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setSessionId(null);
                                        setPortfolioHistory([]);
                                        setPortfolioValue(config.initialCapital);
                                    }}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                >
                                    Run Another Test
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Wrapper component with Suspense for useSearchParams
export default function BacktestPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
            <BacktestContent />
        </Suspense>
    );
}
