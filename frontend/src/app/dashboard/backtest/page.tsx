'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

interface BacktestSession {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
    symbol: string;
    currentDate: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    portfolioValue: number;
    portfolioHistory: { date: string; value: number }[];
    initialCapital: number;
    totalReturn?: number;
    maxDrawdown?: number;
}

interface Strategy {
    id: string;
    version: number;
    status: string;
    baseMethodology: string;
}

function BacktestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const strategyIdFromUrl = searchParams.get('strategyId');

    const [config, setConfig] = useState({
        initDate: '2024-01-01',
        endDate: '2024-03-31',
        initialCapital: 10000,
        symbol: 'BTCUSDT'
    });

    const [session, setSession] = useState<BacktestSession | null>(null);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
    const [userPairs, setUserPairs] = useState<string[]>(['BTCUSDT', 'ETHUSDT']);
    const [isStarting, setIsStarting] = useState(false);

    // Fetch user data and check for active backtest
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                // Fetch user settings
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
                    if (strategyIdFromUrl) {
                        setSelectedStrategyId(strategyIdFromUrl);
                    } else {
                        const draft = stratData.data.find((s: Strategy) => s.status === 'DRAFT');
                        if (draft) setSelectedStrategyId(draft.id);
                    }
                }

                // Check for active backtest
                const activeRes = await fetch(`${API_BASE}/api/backtest/active`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const activeData = await activeRes.json();
                if (activeData.success && activeData.data) {
                    // Resume polling for active backtest
                    pollStatus(activeData.data.id);
                }
            } catch (e) {
                console.error('Failed to fetch data:', e);
            }
        };
        fetchData();
    }, [strategyIdFromUrl]);

    // Poll for status updates
    const pollStatus = async (sessionId: string) => {
        const token = localStorage.getItem('token');
        const poll = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/backtest/status/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSession(data.data);
                    // Continue polling if still running
                    if (data.data.status === 'RUNNING' || data.data.status === 'PENDING') {
                        setTimeout(poll, 1000);
                    }
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        };
        poll();
    };

    // Start new backtest
    const startBacktest = async () => {
        if (!selectedStrategyId) {
            alert('Please select a strategy');
            return;
        }

        setIsStarting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/backtest/start`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    strategyVersionId: selectedStrategyId,
                    symbol: config.symbol,
                    initDate: config.initDate,
                    endDate: config.endDate,
                    initialCapital: config.initialCapital
                })
            });
            const data = await res.json();
            if (data.success) {
                setSession(data.data);
                pollStatus(data.data.id);
            } else {
                alert(data.error || 'Failed to start backtest');
            }
        } catch (e) {
            console.error('Start error:', e);
            alert('Failed to start backtest');
        } finally {
            setIsStarting(false);
        }
    };

    // Pause backtest
    const pauseBacktest = async () => {
        if (!session) return;
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/backtest/pause/${session.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        setSession({ ...session, status: 'PAUSED' });
    };

    // Resume backtest
    const resumeBacktest = async () => {
        if (!session) return;
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/backtest/resume/${session.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        setSession({ ...session, status: 'RUNNING' });
        pollStatus(session.id);
    };

    // Approve strategy
    const approveStrategy = async () => {
        if (!selectedStrategyId) return;
        try {
            const token = localStorage.getItem('token');
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
                alert('✅ Strategy approved! Go to Strategy Lab to promote it.');
                router.push('/dashboard/strategy');
            } else {
                alert(`❌ ${data.error}`);
            }
        } catch (e) {
            alert('Failed to approve strategy');
        }
    };

    const isRunning = session?.status === 'RUNNING' || session?.status === 'PENDING';
    const isCompleted = session?.status === 'COMPLETED';
    const isPaused = session?.status === 'PAUSED';

    return (
        <div className="p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white">Backtest Lab</h1>
                <p className="text-gray-400">Backend-driven strategy backtesting</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="bg-[#12121a] border border-white/5 rounded-xl p-6 space-y-4 h-fit">
                    <h2 className="text-lg font-semibold text-white">Configuration</h2>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Symbol</label>
                        <select
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={config.symbol}
                            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                            disabled={isRunning}
                        >
                            {userPairs.map(pair => (
                                <option key={pair} value={pair}>{pair}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Strategy</label>
                        <select
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                            value={selectedStrategyId}
                            onChange={(e) => setSelectedStrategyId(e.target.value)}
                            disabled={isRunning}
                        >
                            {strategies.length === 0 && <option value="">No strategies</option>}
                            {strategies.map(s => (
                                <option key={s.id} value={s.id}>
                                    v{s.version} - {s.baseMethodology} ({s.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Start</label>
                            <input
                                type="date"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                                value={config.initDate}
                                onChange={(e) => setConfig({ ...config, initDate: e.target.value })}
                                disabled={isRunning}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">End</label>
                            <input
                                type="date"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white"
                                value={config.endDate}
                                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                                disabled={isRunning}
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
                            disabled={isRunning}
                        />
                    </div>

                    {!session || isCompleted ? (
                        <button
                            onClick={startBacktest}
                            disabled={isStarting || !selectedStrategyId}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
                        >
                            {isStarting ? 'Starting...' : 'Start Backtest'}
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            {isRunning && (
                                <button
                                    onClick={pauseBacktest}
                                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 rounded-lg"
                                >
                                    ⏸️ Pause
                                </button>
                            )}
                            {isPaused && (
                                <button
                                    onClick={resumeBacktest}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg"
                                >
                                    ▶️ Resume
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Progress Bar */}
                    {session && (
                        <div className="bg-[#12121a] border border-white/5 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Progress</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-mono ${session.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                        session.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' :
                                            session.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                    }`}>{session.status}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-3">
                                <div
                                    className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${session.progress || 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm text-gray-400 mt-2">
                                <span>Step {session.currentStep} / {session.totalSteps}</span>
                                <span>${session.portfolioValue?.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Equity Curve */}
                    <div className="bg-[#12121a] border border-white/5 rounded-xl p-6 h-64">
                        <h3 className="text-sm text-gray-400 mb-4">Portfolio Equity</h3>
                        {session?.portfolioHistory && session.portfolioHistory.length > 1 ? (
                            <div className="h-full flex items-end gap-1">
                                {(() => {
                                    const values = session.portfolioHistory.map(p => p.value);
                                    const min = Math.min(...values) * 0.95;
                                    const max = Math.max(...values) * 1.05;
                                    const range = max - min || 1;
                                    return session.portfolioHistory.slice(-50).map((p, i) => {
                                        const height = ((p.value - min) / range) * 100;
                                        const isGain = p.value >= session.initialCapital;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 ${isGain ? 'bg-green-500/50' : 'bg-red-500/50'} rounded-t`}
                                                style={{ height: `${height}%` }}
                                            />
                                        );
                                    });
                                })()}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                Start backtest to see equity curve
                            </div>
                        )}
                    </div>

                    {/* Completed Results */}
                    {isCompleted && (
                        <div className="bg-[#12121a] border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">
                                        ${session.portfolioValue?.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-400">Final Value</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${(session.totalReturn || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {(session.totalReturn || 0) >= 0 ? '+' : ''}{session.totalReturn?.toFixed(2)}%
                                    </div>
                                    <div className="text-sm text-gray-400">Total Return</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-400">
                                        -{session.maxDrawdown?.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-gray-400">Max Drawdown</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {session.progress}%
                                    </div>
                                    <div className="text-sm text-gray-400">Completed</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={approveStrategy}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
                                >
                                    ✓ Approve & Mark Tested
                                </button>
                                <button
                                    onClick={() => setSession(null)}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg"
                                >
                                    Run New Test
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BacktestPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
            <BacktestContent />
        </Suspense>
    );
}
