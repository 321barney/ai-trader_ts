"use client";

import { useState } from "react";

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        tradingEnabled: false,
        tradingMode: "signal",
        strategyMode: "hybrid",
        methodology: "SMC",
        leverage: 10,
        selectedPairs: ["BTC-USD", "ETH-USD"],
    });

    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">Configure your trading preferences</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Trading Settings */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>⚙️</span> Trading Settings
                    </h2>

                    <div className="space-y-6">
                        {/* Trading Enabled */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white font-medium">Enable Trading</div>
                                <div className="text-gray-500 text-sm">Allow AI to generate signals/trades</div>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, tradingEnabled: !settings.tradingEnabled })}
                                className={`w-14 h-8 rounded-full transition-colors ${settings.tradingEnabled ? 'bg-green-500' : 'bg-gray-600'
                                    }`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full transition-transform mx-1 ${settings.tradingEnabled ? 'translate-x-6' : ''
                                    }`} />
                            </button>
                        </div>

                        {/* Trading Mode */}
                        <div>
                            <label className="text-white font-medium block mb-3">Trading Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['signal', 'trade'].map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setSettings({ ...settings, tradingMode: mode })}
                                        className={`p-4 rounded-lg border transition-all ${settings.tradingMode === mode
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="font-bold capitalize">{mode}</div>
                                        <div className="text-xs mt-1 opacity-75">
                                            {mode === 'signal' ? 'Signals only' : 'Auto-execute'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Strategy Mode */}
                        <div>
                            <label className="text-white font-medium block mb-3">Strategy Mode</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'deepseek', label: 'DeepSeek', desc: 'AI Analysis' },
                                    { id: 'rl', label: 'RL Model', desc: 'Cost Efficient' },
                                    { id: 'hybrid', label: 'Hybrid', desc: 'Best of Both' },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSettings({ ...settings, strategyMode: mode.id })}
                                        className={`p-3 rounded-lg border transition-all text-center ${settings.strategyMode === mode.id
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">{mode.label}</div>
                                        <div className="text-xs opacity-75">{mode.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Leverage */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-white font-medium">Leverage</label>
                                <span className="text-indigo-400 font-bold">{settings.leverage}x</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={settings.leverage}
                                onChange={(e) => setSettings({ ...settings, leverage: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* API Keys */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🔑</span> API Keys
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="text-white font-medium block mb-2">Aster API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value="••••••••••••••••"
                                    readOnly
                                    className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-gray-400"
                                />
                                <button className="btn-secondary px-4">Edit</button>
                            </div>
                            <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                Connected (Testnet)
                            </div>
                        </div>

                        <div>
                            <label className="text-white font-medium block mb-2">DeepSeek API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value="••••••••••••••••"
                                    readOnly
                                    className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-gray-400"
                                />
                                <button className="btn-secondary px-4">Edit</button>
                            </div>
                            <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                Connected
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trading Pairs */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>💹</span> Trading Pairs
                    </h2>

                    <div className="flex flex-wrap gap-2">
                        {['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'ARB-USD'].map((pair) => (
                            <button
                                key={pair}
                                onClick={() => {
                                    const pairs = settings.selectedPairs.includes(pair)
                                        ? settings.selectedPairs.filter(p => p !== pair)
                                        : [...settings.selectedPairs, pair];
                                    setSettings({ ...settings, selectedPairs: pairs });
                                }}
                                className={`px-4 py-2 rounded-lg border transition-all ${settings.selectedPairs.includes(pair)
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                            >
                                {pair}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Methodology */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>📈</span> Methodology
                    </h2>

                    <div className="space-y-2">
                        {['SMC', 'ICT', 'Gann', 'Custom'].map((m) => (
                            <button
                                key={m}
                                onClick={() => setSettings({ ...settings, methodology: m })}
                                className={`w-full p-4 rounded-lg border text-left transition-all ${settings.methodology === m
                                        ? 'bg-indigo-500/20 border-indigo-500/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="text-white font-medium">{m}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="btn-primary px-8 py-3">
                    {saved ? '✓ Saved' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
