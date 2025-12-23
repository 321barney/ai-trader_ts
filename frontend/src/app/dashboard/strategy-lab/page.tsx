"use client";

import { useState } from "react";
import { api, API_BASE } from "@/lib/api";

const METHODOLOGIES = [
    { id: 'SMC', name: 'Smart Money Concepts', description: 'Order Blocks, FVG, Liquidity Sweeps' },
    { id: 'ICT', name: 'Inner Circle Trader', description: 'Kill Zones, OTE, Silver Bullet' },
    { id: 'GANN', name: 'Gann Analysis', description: 'Time/Price squares, Geometric angles' },
];

const TIMEFRAMES = ['5m', '15m', '1h', '4h'];

export default function StrategyLabPage() {
    const [methodology, setMethodology] = useState('SMC');
    const [selectedTimeframes, setSelectedTimeframes] = useState(['1h', '4h']);
    const [userRecommendation, setUserRecommendation] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const toggleTimeframe = (tf: string) => {
        setSelectedTimeframes(prev =>
            prev.includes(tf)
                ? prev.filter(t => t !== tf)
                : [...prev, tf]
        );
    };

    const handleLaunchTest = async () => {
        if (selectedTimeframes.length === 0) {
            alert('Select at least one timeframe');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const token = api.getAccessToken();
            const res = await fetch(`${API_BASE}/api/models`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    methodology,
                    timeframes: selectedTimeframes,
                    parameters: {
                        entryRules: { indicators: ['RSI', 'MACD', 'EMA'], conditions: [] },
                        exitRules: { stopLossPercent: 2, takeProfitPercent: 4 },
                        timeframes: selectedTimeframes,
                        methodology,
                        riskPerTrade: 2,
                        userRecommendation: userRecommendation || undefined
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                setResult({ model: data.data, status: 'created' });
                // Auto-start backtest
                const backtestRes = await fetch(`${API_BASE}/api/models/${data.data.id}/backtest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        symbol: 'BTCUSDT',
                        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                        endDate: new Date().toISOString()
                    })
                });
                const btData = await backtestRes.json();
                if (btData.success) {
                    setResult({ model: btData.data, status: 'backtesting' });
                }
            } else {
                alert(data.error || 'Failed to create model');
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">🧪 Strategy Lab</h1>
                <p className="text-gray-400">Design, customize, and test trading strategies</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    {/* Methodology Selection */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>📐</span> Methodology
                        </h3>
                        <div className="grid gap-3">
                            {METHODOLOGIES.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setMethodology(m.id)}
                                    className={`p-4 rounded-xl border text-left transition-all ${methodology === m.id
                                        ? 'border-indigo-500 bg-indigo-500/20'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="font-bold text-white">{m.name}</div>
                                    <div className="text-sm text-gray-400">{m.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeframe Selection */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>⏱️</span> Timeframes
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {TIMEFRAMES.map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => toggleTimeframe(tf)}
                                    className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${selectedTimeframes.includes(tf)
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                            Multi-timeframe analysis uses all selected timeframes
                        </p>
                    </div>

                    {/* User Recommendation (Optional) */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>💡</span> Your Recommendation
                            <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                        </h3>
                        <textarea
                            value={userRecommendation}
                            onChange={(e) => setUserRecommendation(e.target.value)}
                            placeholder="Add your trading insights, market observations, or special conditions for the AI to consider..."
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Preview & Launch Panel */}
                <div className="space-y-6">
                    {/* Strategy Preview */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>👁️</span> Strategy Preview
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Methodology</span>
                                <span className="text-white font-bold">{methodology}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Timeframes</span>
                                <span className="text-white font-bold">{selectedTimeframes.join(', ') || 'None'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Risk per Trade</span>
                                <span className="text-white font-bold">2%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Stop Loss</span>
                                <span className="text-red-400 font-bold">2%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Take Profit</span>
                                <span className="text-green-400 font-bold">4%</span>
                            </div>
                            {userRecommendation && (
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                    <span className="text-indigo-400 text-sm">Your notes:</span>
                                    <p className="text-gray-300 text-sm mt-1">{userRecommendation.substring(0, 100)}...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Launch Button */}
                    <button
                        onClick={handleLaunchTest}
                        disabled={loading || selectedTimeframes.length === 0}
                        className="w-full py-5 rounded-2xl font-bold text-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <span className="animate-spin">⚙️</span>
                                Creating Strategy...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                🚀 Launch Strategy Test
                            </span>
                        )}
                    </button>

                    {/* Result Card */}
                    {result && (
                        <div className="card glass border-green-500/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">
                                    ✅
                                </div>
                                <div>
                                    <div className="text-white font-bold">Strategy Created!</div>
                                    <div className="text-gray-400 text-sm">Version {result.model?.version}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    <div className="text-gray-400">Status</div>
                                    <div className="text-yellow-400 font-bold">{result.model?.status}</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg">
                                    <div className="text-gray-400">Methodology</div>
                                    <div className="text-white font-bold">{result.model?.methodology}</div>
                                </div>
                            </div>
                            <a
                                href="/dashboard/backtest"
                                className="mt-4 block text-center py-3 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                            >
                                View in Backtest Hub →
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
