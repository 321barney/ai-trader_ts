'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, API_BASE } from '@/lib/api';

interface BacktestSession {
    id: string;
    strategyVersionId: string;
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

interface TradingModel {
    id: string;
    version: number;
    methodology: string;
    status: string;
    isActive: boolean;
    winRate?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    totalReturn?: number;
    currentDrawdown?: number;
    approvedBy?: string[];
    createdAt: string;
    // Backtest config
    symbol?: string;
    timeframes?: string[];
    backtestData?: {
        symbol?: string;
        startDate?: string;
        endDate?: string;
    };
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
    const [tradingModels, setTradingModels] = useState<TradingModel[]>([]);

    // Fetch user data and check for active backtest
    useEffect(() => {
        const fetchData = async () => {
            const token = api.getAccessToken();
            if (!token) return;

            try {
                // Fetch user settings
                const userRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = await userRes.json();
                // Read selectedPairs from user data (correct path)
                if (userData.success && userData.data?.selectedPairs && Array.isArray(userData.data.selectedPairs)) {
                    setUserPairs(userData.data.selectedPairs);
                    if (userData.data.selectedPairs.length > 0) {
                        setConfig(prev => ({ ...prev, symbol: userData.data.selectedPairs[0] }));
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

                // Fetch trading models
                const modelsRes = await fetch(`${API_BASE}/api/models`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const modelsData = await modelsRes.json();
                if (modelsData.success && Array.isArray(modelsData.data)) {
                    setTradingModels(modelsData.data);
                }
            } catch (e) {
                console.error('Failed to fetch data:', e);
            }
        };
        fetchData();
    }, [strategyIdFromUrl]);

    // Poll for status updates
    const pollStatus = async (sessionId: string) => {
        const token = api.getAccessToken();
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
            const token = api.getAccessToken();
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
        const token = api.getAccessToken();
        await fetch(`${API_BASE}/api/backtest/pause/${session.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        setSession({ ...session, status: 'PAUSED' });
    };

    // Resume backtest
    const resumeBacktest = async () => {
        if (!session) return;
        const token = api.getAccessToken();
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
            const token = api.getAccessToken();
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
                router.push('/dashboard/strategy-lab');
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
                <h1 className="text-2xl font-bold text-white">Backtest Hub</h1>
                <p className="text-gray-400">Manage and test your trading strategies</p>
            </header>

            {/* Strategy Models - NOW AT TOP */}
            {tradingModels.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">📊 Your Strategies</h2>
                        {/* Summary Metrics */}
                        <div className="flex gap-4 text-sm">
                            <div className="px-3 py-1 bg-green-500/10 rounded-lg">
                                <span className="text-gray-400">Active: </span>
                                <span className="text-green-400 font-bold">{tradingModels.filter(m => m.isActive).length}</span>
                            </div>
                            <div className="px-3 py-1 bg-purple-500/10 rounded-lg">
                                <span className="text-gray-400">Backtesting: </span>
                                <span className="text-purple-400 font-bold">{tradingModels.filter(m => m.status === 'BACKTESTING').length}</span>
                            </div>
                            <div className="px-3 py-1 bg-yellow-500/10 rounded-lg">
                                <span className="text-gray-400">Pending: </span>
                                <span className="text-yellow-400 font-bold">{tradingModels.filter(m => m.status === 'PENDING_APPROVAL').length}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tradingModels.map((model) => (
                            <div key={model.id} className={`bg-[#12121a] border rounded-xl p-5 ${model.isActive ? 'border-green-500/50' : 'border-white/10'
                                }`}>
                                {/* Header with version, status, and delete */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-white font-bold text-lg">v{model.version}</div>
                                        <div className="text-sm text-gray-400">{model.methodology}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${model.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                            model.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400' :
                                                model.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    model.status === 'BACKTESTING' ? 'bg-purple-500/20 text-purple-400' :
                                                        model.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {model.status}
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!confirm(`Delete strategy v${model.version}? This cannot be undone.`)) return;
                                                const token = api.getAccessToken();
                                                const res = await fetch(`${API_BASE}/api/models/${model.id}`, {
                                                    method: 'DELETE',
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                if (res.ok) {
                                                    alert('Strategy deleted');
                                                    window.location.reload();
                                                } else {
                                                    const data = await res.json();
                                                    alert(`Failed: ${data.message || 'Unknown error'}`);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                            title="Delete strategy"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Pair and Timeframe info */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs font-medium">
                                        {model.backtestData?.symbol || model.symbol || 'BTCUSDT'}
                                    </span>
                                    {model.timeframes?.map(tf => (
                                        <span key={tf} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">
                                            {tf}
                                        </span>
                                    )) || <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">1H</span>}
                                </div>

                                {/* Metrics (show if has backtest data) */}
                                {(model.winRate || model.backtestData) && (
                                    <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-gray-500">Win</div>
                                            <div className="text-white font-bold">{model.winRate?.toFixed(0) || '-'}%</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-gray-500">Sharpe</div>
                                            <div className="text-white font-bold">{model.sharpeRatio?.toFixed(1) || '-'}</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-gray-500">Return</div>
                                            <div className={`font-bold ${(model.totalReturn || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {model.totalReturn?.toFixed(0) || '-'}%
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-gray-500">DD</div>
                                            <div className="text-red-400 font-bold">{model.maxDrawdown?.toFixed(0) || '-'}%</div>
                                        </div>
                                    </div>
                                )}

                                {/* Unified Config Section - ALL cards get this */}
                                <div className="space-y-3 pt-3 border-t border-white/5">
                                    {/* Status Message */}
                                    {model.status === 'BACKTESTING' && (
                                        <div className="bg-purple-500/10 rounded-lg p-3">
                                            {session?.strategyVersionId === model.id ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs text-purple-300">
                                                        <span className="flex items-center gap-1"><span className="animate-spin">⚙️</span> Running...</span>
                                                        <span>{session.currentStep} / {session.totalSteps} steps</span>
                                                    </div>
                                                    <div className="w-full bg-purple-900/40 rounded-full h-1.5">
                                                        <div
                                                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.min(100, Math.round((session.currentStep / session.totalSteps) * 100))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-purple-400 text-sm flex items-center justify-center gap-2">
                                                    <span className="animate-spin">⚙️</span> Backtest running...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {model.isActive && (
                                        <div className="text-center py-2 bg-green-500/10 rounded-lg text-green-400 font-bold text-sm">
                                            ✅ Currently Active
                                        </div>
                                    )}

                                    {/* Config inputs - show for non-active, non-running models */}
                                    {!model.isActive && model.status !== 'BACKTESTING' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500">Pair</label>
                                                    <select
                                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                                                        defaultValue={model.backtestData?.symbol || 'BTCUSDT'}
                                                        id={`pair-${model.id}`}
                                                    >
                                                        {userPairs.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Capital</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                                                        defaultValue={10000}
                                                        id={`capital-${model.id}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500">Start</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                                                        defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                                        id={`start-${model.id}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">End</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                                                        defaultValue={new Date().toISOString().split('T')[0]}
                                                        id={`end-${model.id}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const pair = (document.getElementById(`pair-${model.id}`) as HTMLSelectElement)?.value || 'BTCUSDT';
                                                        const startDate = (document.getElementById(`start-${model.id}`) as HTMLInputElement)?.value;
                                                        const endDate = (document.getElementById(`end-${model.id}`) as HTMLInputElement)?.value;
                                                        const capital = (document.getElementById(`capital-${model.id}`) as HTMLInputElement)?.value || '10000';

                                                        const token = api.getAccessToken();
                                                        const res = await fetch(`${API_BASE}/api/models/${model.id}/backtest`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({
                                                                symbol: pair,
                                                                startDate: startDate,
                                                                endDate: endDate,
                                                                initialCapital: Number(capital)
                                                            })
                                                        });
                                                        if (res.ok) {
                                                            alert('Backtest started!');
                                                            window.location.reload();
                                                        } else {
                                                            alert('Failed to start backtest');
                                                        }
                                                    }}
                                                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors text-sm"
                                                >
                                                    🚀 Start
                                                </button>
                                                {(model.status === 'APPROVED' || model.status === 'COMPLETED' || model.status === 'PENDING_APPROVAL') && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(`Activate strategy v${model.version} for live trading? This will approve and deploy the strategy.`)) return;
                                                            const token = api.getAccessToken();
                                                            const res = await fetch(`${API_BASE}/api/models/${model.id}/activate`, {
                                                                method: 'POST',
                                                                headers: { Authorization: `Bearer ${token}` }
                                                            });
                                                            if (res.ok) {
                                                                alert('Strategy activated successfully! 🚀');
                                                                window.location.reload();
                                                            } else {
                                                                const data = await res.json();
                                                                alert(`Activation failed: ${data.message}`);
                                                            }
                                                        }}
                                                        className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors text-sm"
                                                    >
                                                        ⚡ Activate
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No models message */}
            {tradingModels.length === 0 && (
                <div className="text-center py-16 bg-[#12121a] rounded-xl border border-white/5">
                    <div className="text-5xl mb-4">🧪</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Strategies Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first strategy in the Strategy Lab</p>
                    <a href="/dashboard/strategy-lab" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium">
                        Go to Strategy Lab →
                    </a>
                </div>
            )}

            {/* Active Backtest Progress (if running) */}
            {session && (session.status === 'RUNNING' || session.status === 'PENDING' || session.status === 'PAUSED') && (
                <div className="bg-[#12121a] border border-purple-500/30 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="animate-spin">⚙️</span> Active Backtest
                    </h2>

                    {/* Results Panel */}
                    {session && (
                        <div className="bg-[#12121a] border border-white/5 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Progress</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-mono ${session.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' :
                                    session.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-purple-500/20 text-purple-400'
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
            )}
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
