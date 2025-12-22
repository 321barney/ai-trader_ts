"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface ConnectionTest {
    testing: boolean;
    result: { connected: boolean; message?: string; error?: string } | null;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        tradingEnabled: false,
        tradingMode: "signal",
        strategyMode: "hybrid",
        methodology: "SMC",
        leverage: 10,
        selectedPairs: ["BTC-USD", "ETH-USD"],
        marketType: "perp",
        // API Keys
        asterApiKey: "",
        asterApiSecret: "",
        asterTestnet: true,
        deepseekApiKey: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);

    // Connection test states
    const [asterTest, setAsterTest] = useState<ConnectionTest>({ testing: false, result: null });
    const [deepseekTest, setDeepseekTest] = useState<ConnectionTest>({ testing: false, result: null });

    // Test Aster connection
    const testAsterConnection = async () => {
        if (!settings.asterApiKey) {
            setAsterTest({ testing: false, result: { connected: false, error: "Please enter your API key first" } });
            return;
        }
        setAsterTest({ testing: true, result: null });
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/trading/test-aster`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    // If masked, don't send keys so backend uses stored ones
                    apiKey: settings.asterApiKey.includes("••••") ? undefined : settings.asterApiKey,
                    apiSecret: settings.asterApiSecret?.includes("••••") ? undefined : settings.asterApiSecret,
                    testnet: true
                })
            });
            const data = await res.json();
            setAsterTest({ testing: false, result: data.data || data });
        } catch (err: any) {
            setAsterTest({ testing: false, result: { connected: false, error: err.message } });
        }
    };

    // Test DeepSeek connection
    const testDeepseekConnection = async () => {
        if (!settings.deepseekApiKey) {
            setDeepseekTest({ testing: false, result: { connected: false, error: "Please enter your API key first" } });
            return;
        }
        setDeepseekTest({ testing: true, result: null });
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/trading/test-deepseek`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    apiKey: settings.deepseekApiKey.includes("••••") ? undefined : settings.deepseekApiKey
                })
            });
            const data = await res.json();
            setDeepseekTest({ testing: false, result: data.data || data });
        } catch (err: any) {
            setDeepseekTest({ testing: false, result: { connected: false, error: err.message } });
        }
    };

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const user = data.data;
                    setSettings(prev => ({
                        ...prev,
                        tradingEnabled: user.tradingSettings?.enabled || false,
                        tradingMode: user.tradingSettings?.mode || "signal",
                        strategyMode: user.tradingSettings?.strategyMode || "hybrid",
                        methodology: user.tradingSettings?.methodology || "SMC",
                        leverage: user.tradingSettings?.leverage || 10,
                        selectedPairs: user.tradingSettings?.pairs || ["BTC-USD", "ETH-USD"],
                        marketType: user.marketType || "perp",
                        asterApiKey: user.asterApiKey ? "••••••••" : "",
                        asterApiSecret: user.asterApiSecret ? "••••••••" : "",
                        asterTestnet: user.asterTestnet ?? true,
                        deepseekApiKey: user.deepseekApiKey ? "••••••••" : "",
                    }));
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/trading/settings`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    tradingEnabled: settings.tradingEnabled,
                    tradingMode: settings.tradingMode,
                    strategyMode: settings.strategyMode,
                    methodology: settings.methodology,
                    leverage: settings.leverage,

                    selectedPairs: settings.selectedPairs,
                    marketType: settings.marketType,
                    // Only send API keys if they were edited (not masked)
                    ...(settings.deepseekApiKey && !settings.deepseekApiKey.includes("••••")
                        ? { deepseekApiKey: settings.deepseekApiKey } : {}),
                    ...(settings.asterApiKey && !settings.asterApiKey.includes("••••")
                        ? { asterApiKey: settings.asterApiKey } : {}),
                    ...(settings.asterApiSecret && !settings.asterApiSecret.includes("••••")
                        ? { asterApiSecret: settings.asterApiSecret } : {}),
                    asterTestnet: settings.asterTestnet,
                })
            });

            const data = await res.json();
            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                setEditingKey(null);
            } else {
                setError(data.error || "Failed to save settings");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">Configure your trading preferences</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

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

                        {/* Market Type */}
                        <div>
                            <label className="text-white font-medium block mb-3">Market Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['perp', 'spot'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSettings({ ...settings, marketType: type })}
                                        className={`p-4 rounded-lg border transition-all ${settings.marketType === type
                                            ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="font-bold capitalize flex items-center gap-2 justify-center">
                                            <span>{type === 'perp' ? '📈' : '💰'}</span>
                                            {type === 'perp' ? 'Perpetual Futures' : 'Spot Trading'}
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
                        {/* Aster API Key */}
                        <div>
                            <label className="text-white font-medium block mb-2">Aster API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type={editingKey === 'aster' ? 'text' : 'password'}
                                    value={settings.asterApiKey}
                                    onChange={(e) => setSettings({ ...settings, asterApiKey: e.target.value })}
                                    readOnly={editingKey !== 'aster'}
                                    placeholder="Enter API key"
                                    className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                                />
                                <button
                                    onClick={() => setEditingKey(editingKey === 'aster' ? null : 'aster')}
                                    className="btn-secondary px-4"
                                >
                                    {editingKey === 'aster' ? 'Done' : 'Edit'}
                                </button>
                                <button
                                    onClick={testAsterConnection}
                                    disabled={asterTest.testing}
                                    className="btn-secondary px-4"
                                >
                                    {asterTest.testing ? '...' : 'Test'}
                                </button>
                            </div>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.asterTestnet}
                                    onChange={(e) => setSettings({ ...settings, asterTestnet: e.target.checked })}
                                    className="w-4 h-4 rounded bg-[#1a1a25] border-white/10"
                                />
                                <span className="text-sm text-gray-400">Use Testnet</span>
                            </label>

                            {asterTest.result && (
                                <div className={`text-sm mt-2 flex items-center gap-1 ${asterTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className={`w-2 h-2 rounded-full ${asterTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                    {asterTest.result.connected ? asterTest.result.message : asterTest.result.error}
                                </div>
                            )}
                        </div>

                        {/* DeepSeek API Key */}
                        <div>
                            <label className="text-white font-medium block mb-2">DeepSeek API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type={editingKey === 'deepseek' ? 'text' : 'password'}
                                    value={settings.deepseekApiKey}
                                    onChange={(e) => setSettings({ ...settings, deepseekApiKey: e.target.value })}
                                    readOnly={editingKey !== 'deepseek'}
                                    placeholder="sk-..."
                                    className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                                />
                                <button
                                    onClick={() => setEditingKey(editingKey === 'deepseek' ? null : 'deepseek')}
                                    className="btn-secondary px-4"
                                >
                                    {editingKey === 'deepseek' ? 'Done' : 'Edit'}
                                </button>
                                <button
                                    onClick={testDeepseekConnection}
                                    disabled={deepseekTest.testing}
                                    className="btn-secondary px-4"
                                >
                                    {deepseekTest.testing ? '...' : 'Test'}
                                </button>
                            </div>
                            {deepseekTest.result && (
                                <div className={`text-sm mt-2 flex items-center gap-1 ${deepseekTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className={`w-2 h-2 rounded-full ${deepseekTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                    {deepseekTest.result.connected ? deepseekTest.result.message : deepseekTest.result.error}
                                </div>
                            )}
                            <div className="text-gray-500 text-sm mt-2">
                                Get your key from{" "}
                                <a href="https://platform.deepseek.com" target="_blank" className="text-indigo-400 hover:underline">
                                    platform.deepseek.com
                                </a>
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
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-8 py-3 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
                </button>
            </div >
        </div >
    );
}

