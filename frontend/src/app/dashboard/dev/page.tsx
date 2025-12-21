"use client";

import { useState } from "react";

// Mock data - in real app, fetch from API
const mockStrategyVersions = [
    { version: 1, winRate: 52, signals: 15, createdAt: "2024-01-10", learnings: ["Initial SMC strategy"] },
    { version: 2, winRate: 58, signals: 22, createdAt: "2024-01-12", learnings: ["RSI < 30 for longs works better", "Avoid trading during low volume"] },
    { version: 3, winRate: 63, signals: 18, createdAt: "2024-01-14", learnings: ["Added EMA crossover confirmation", "Tightened stop loss to 1.5x ATR"] },
    { version: 4, winRate: 67, signals: 25, createdAt: "2024-01-16", learnings: ["Order block entries more effective at 62% retracement"] },
];

export default function DevAreaPage() {
    const [testMode, setTestMode] = useState(true);
    const [executionMode, setExecutionMode] = useState<'signal' | 'trade' | 'test'>('signal');
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
    const [analyzing, setAnalyzing] = useState(false);

    // Test Session State
    const [testSession, setTestSession] = useState<{
        active: boolean;
        startedAt?: string;
        signals: number;
        wins: number;
        losses: number;
        currentVersion: number;
        evolutionCount: number;
    }>({
        active: false,
        signals: 0,
        wins: 0,
        losses: 0,
        currentVersion: 1,
        evolutionCount: 0,
    });

    const [strategyVersions, setStrategyVersions] = useState(mockStrategyVersions);
    const [selectedVersion, setSelectedVersion] = useState<typeof mockStrategyVersions[0] | null>(null);

    const handleAnalyze = () => {
        setAnalyzing(true);
        setTimeout(() => {
            setAnalyzing(false);
            if (testSession.active) {
                // Simulate signal generation
                const isWin = Math.random() > 0.4;
                setTestSession(prev => ({
                    ...prev,
                    signals: prev.signals + 1,
                    wins: isWin ? prev.wins + 1 : prev.wins,
                    losses: !isWin ? prev.losses + 1 : prev.losses,
                }));
            }
        }, 2000);
    };

    const startTestSession = () => {
        setTestSession({
            active: true,
            startedAt: new Date().toISOString(),
            signals: 0,
            wins: 0,
            losses: 0,
            currentVersion: strategyVersions.length,
            evolutionCount: 0,
        });
        setExecutionMode('test');
    };

    const stopTestSession = () => {
        // Simulate creating a new evolved strategy
        const newVersion = {
            version: strategyVersions.length + 1,
            winRate: Math.round((testSession.wins / (testSession.signals || 1)) * 100),
            signals: testSession.signals,
            createdAt: new Date().toISOString().split('T')[0],
            learnings: ["Enhanced based on test session results"],
        };
        setStrategyVersions(prev => [...prev, newVersion]);
        setTestSession(prev => ({ ...prev, active: false }));
        setSelectedVersion(newVersion);
    };

    const evolveStrategy = () => {
        if (!testSession.active) return;
        setTestSession(prev => ({
            ...prev,
            currentVersion: prev.currentVersion + 1,
            evolutionCount: prev.evolutionCount + 1,
        }));
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dev Area</h1>
                <p className="text-gray-400">Strategy testing, evolution, and mode controls</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Mode Controls */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🔧</span> Mode Controls
                    </h2>

                    {/* Test/Live Toggle */}
                    <div className="mb-6">
                        <label className="text-white font-medium block mb-3">Environment</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setTestMode(true)}
                                className={`p-4 rounded-lg border transition-all ${testMode
                                    ? 'bg-green-500/20 border-green-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🧪</div>
                                <div className="font-bold">Test Mode</div>
                                <div className="text-sm opacity-75">Paper trading</div>
                            </button>
                            <button
                                onClick={() => setTestMode(false)}
                                className={`p-4 rounded-lg border transition-all ${!testMode
                                    ? 'bg-red-500/20 border-red-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🔴</div>
                                <div className="font-bold">Live Mode</div>
                                <div className="text-sm opacity-75">Real money</div>
                            </button>
                        </div>
                    </div>

                    {/* Execution Mode */}
                    <div className="mb-6">
                        <label className="text-white font-medium block mb-3">Execution</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setExecutionMode('signal')}
                                className={`p-3 rounded-lg border transition-all ${executionMode === 'signal'
                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="text-xl mb-1">📡</div>
                                <div className="font-bold text-sm">Signals</div>
                            </button>
                            <button
                                onClick={() => setExecutionMode('trade')}
                                className={`p-3 rounded-lg border transition-all ${executionMode === 'trade'
                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="text-xl mb-1">⚡</div>
                                <div className="font-bold text-sm">Auto Trade</div>
                            </button>
                            <button
                                onClick={() => setExecutionMode('test')}
                                className={`p-3 rounded-lg border transition-all ${executionMode === 'test'
                                    ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="text-xl mb-1">🧬</div>
                                <div className="font-bold text-sm">Strategy Test</div>
                            </button>
                        </div>
                    </div>

                    {/* Warning for Live + Auto Trade */}
                    {!testMode && executionMode === 'trade' && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="text-red-400 font-bold mb-1">⚠️ Warning</div>
                            <p className="text-red-400/80 text-sm">
                                Auto-trading in live mode will execute real trades with real money.
                            </p>
                        </div>
                    )}
                </div>

                {/* Test Session Controls */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🧬</span> Strategy Test Session
                    </h2>

                    {!testSession.active ? (
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">🚀</div>
                            <p className="text-gray-400 mb-6">
                                Start a test session to let the AI evolve your strategy
                            </p>
                            <button
                                onClick={startTestSession}
                                className="btn-primary px-8 py-4"
                            >
                                Start Test Session
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Session Status */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-purple-400 font-bold flex items-center gap-2">
                                        <span className="animate-pulse">●</span> Session Active
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                        Started {new Date(testSession.startedAt!).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="text-gray-300 text-sm">
                                    Strategy v{testSession.currentVersion} | {testSession.evolutionCount} evolutions
                                </div>
                            </div>

                            {/* Session Stats */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                                    <div className="text-gray-400 text-xs">Signals</div>
                                    <div className="text-white font-bold text-xl">{testSession.signals}</div>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                                    <div className="text-gray-400 text-xs">Wins</div>
                                    <div className="text-green-400 font-bold text-xl">{testSession.wins}</div>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                                    <div className="text-gray-400 text-xs">Losses</div>
                                    <div className="text-red-400 font-bold text-xl">{testSession.losses}</div>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                                    <div className="text-gray-400 text-xs">Win Rate</div>
                                    <div className="text-indigo-400 font-bold text-xl">
                                        {testSession.signals > 0 ? Math.round((testSession.wins / testSession.signals) * 100) : 0}%
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                    className="flex-1 btn-primary py-3"
                                >
                                    {analyzing ? 'Generating Signal...' : 'Generate Signal'}
                                </button>
                                <button
                                    onClick={evolveStrategy}
                                    disabled={testSession.signals < 5}
                                    className="flex-1 btn-secondary py-3 disabled:opacity-50"
                                >
                                    Evolve Strategy
                                </button>
                            </div>

                            {/* Stop Session */}
                            <button
                                onClick={stopTestSession}
                                className="w-full bg-green-500/10 border border-green-500/30 text-green-400 py-3 rounded-lg font-medium hover:bg-green-500/20 transition-colors"
                            >
                                ✓ Stop & Save Enhanced Strategy
                            </button>
                        </div>
                    )}
                </div>

                {/* Strategy Evolution History */}
                <div className="card glass lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>📈</span> Strategy Evolution History
                    </h2>

                    <div className="flex gap-6">
                        {/* Version Timeline */}
                        <div className="flex-1 space-y-3">
                            {strategyVersions.map((v, i) => (
                                <button
                                    key={v.version}
                                    onClick={() => setSelectedVersion(v)}
                                    className={`w-full p-4 rounded-lg border transition-all text-left ${selectedVersion?.version === v.version
                                            ? 'bg-indigo-500/20 border-indigo-500/50'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white font-bold">Strategy v{v.version}</span>
                                        <span className={`font-bold ${v.winRate >= 60 ? 'text-green-400' : v.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {v.winRate}% win rate
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-400">
                                        <span>{v.signals} signals tested</span>
                                        <span>{v.createdAt}</span>
                                    </div>
                                    {i < strategyVersions.length - 1 && (
                                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-sm">
                                            <span className="text-green-400">
                                                +{strategyVersions[i + 1].winRate - v.winRate}% improvement
                                            </span>
                                            <span className="text-gray-500">→</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Selected Version Details */}
                        <div className="w-80">
                            {selectedVersion ? (
                                <div className="bg-[#1a1a25] rounded-lg p-6 border border-white/5 sticky top-8">
                                    <h3 className="text-white font-bold mb-4">
                                        Strategy v{selectedVersion.version} Details
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-gray-400 text-sm mb-1">Performance</div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-3xl font-bold text-green-400">
                                                    {selectedVersion.winRate}%
                                                </div>
                                                <div className="text-gray-400 text-sm">
                                                    win rate from<br />{selectedVersion.signals} signals
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-gray-400 text-sm mb-2">Learnings Applied</div>
                                            <ul className="space-y-2">
                                                {selectedVersion.learnings.map((l, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                        <span className="text-indigo-400">•</span>
                                                        {l}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button className="w-full btn-primary py-3 mt-4">
                                            Use This Strategy
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#1a1a25] rounded-lg p-6 border border-white/5 text-center">
                                    <div className="text-gray-500">
                                        Select a version to view details
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
