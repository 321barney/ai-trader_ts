"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ApiKeysSettings from "@/components/settings/ApiKeysSettings";

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
        openaiApiKey: "",
        anthropicApiKey: "",
        geminiApiKey: "",
        // Agent Configuration
        marketAnalystModel: "deepseek",
        riskOfficerModel: "deepseek",
        strategyConsultantModel: "deepseek",
        orchestratorModel: "deepseek",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);

    // Connection test states
    const [asterTest, setAsterTest] = useState<ConnectionTest>({ testing: false, result: null });
    const [deepseekTest, setDeepseekTest] = useState<ConnectionTest>({ testing: false, result: null });
    const [openaiTest, setOpenaiTest] = useState<ConnectionTest>({ testing: false, result: null });
    const [anthropicTest, setAnthropicTest] = useState<ConnectionTest>({ testing: false, result: null });
    const [geminiTest, setGeminiTest] = useState<ConnectionTest>({ testing: false, result: null });

    const [availablePairs, setAvailablePairs] = useState<{ symbol: string, maxLeverage?: number }[]>([]);

    // Helper for testing connections
    const testConnection = async (
        url: string,
        key: string,
        stateSetter: (val: ConnectionTest) => void,
        keyName: string
    ) => {
        if (!key) {
            stateSetter({ testing: false, result: { connected: false, error: "Please enter your API key first" } });
            return;
        }
        stateSetter({ testing: true, result: null });
        try {
            const data: any = await api.post(url, { apiKey: key.includes("••••") ? undefined : key });
            stateSetter({ testing: false, result: data.data || data });
        } catch (err: any) {
            stateSetter({ testing: false, result: { connected: false, error: err.message } });
        }
    };

    // Test Aster connection
    const testAsterConnection = async () => {
        if (!settings.asterApiKey) {
            setAsterTest({ testing: false, result: { connected: false, error: "Please enter your API key first" } });
            return;
        }
        setAsterTest({ testing: true, result: null });
        try {
            const data: any = await api.post('/api/trading/test-aster', {
                // If masked, don't send keys so backend uses stored ones
                apiKey: settings.asterApiKey.includes("••••") ? undefined : settings.asterApiKey,
                apiSecret: settings.asterApiSecret?.includes("••••") ? undefined : settings.asterApiSecret,
                testnet: true
            });
            setAsterTest({ testing: false, result: data.data || data });
        } catch (err: any) {
            setAsterTest({ testing: false, result: { connected: false, error: err.message } });
        }
    };

    const testDeepseekConnection = () => testConnection('/api/trading/test-deepseek', settings.deepseekApiKey, setDeepseekTest, 'deepseek');
    const testOpenaiConnection = () => testConnection('/api/trading/test-openai', settings.openaiApiKey, setOpenaiTest, 'openai');
    const testAnthropicConnection = () => testConnection('/api/trading/test-anthropic', settings.anthropicApiKey, setAnthropicTest, 'anthropic');
    const testGeminiConnection = () => testConnection('/api/trading/test-gemini', settings.geminiApiKey, setGeminiTest, 'gemini');

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data: any = await api.get('/api/auth/me');
                if (data.success && data.data) {
                    const user = data.data;
                    setSettings(prev => ({
                        ...prev,
                        tradingEnabled: user.tradingEnabled ?? false,
                        tradingMode: user.tradingMode || "signal",
                        strategyMode: user.strategyMode || "hybrid",
                        methodology: user.methodology || "SMC",
                        leverage: user.leverage || 10,
                        selectedPairs: user.selectedPairs || ["BTC-USD", "ETH-USD"],
                        marketType: user.marketType || "perp",
                        asterApiKey: user.asterApiKey ? "••••••••" : "",
                        asterApiSecret: user.asterApiSecret ? "••••••••" : "",
                        asterTestnet: user.asterTestnet ?? true,
                        deepseekApiKey: user.deepseekApiKey ? "••••••••" : "",
                        openaiApiKey: user.openaiApiKey ? "••••••••" : "",
                        anthropicApiKey: user.anthropicApiKey ? "••••••••" : "",
                        geminiApiKey: user.geminiApiKey ? "••••••••" : "",
                        marketAnalystModel: user.marketAnalystModel || "deepseek",
                        riskOfficerModel: user.riskOfficerModel || "deepseek",
                        strategyConsultantModel: user.strategyConsultantModel || "deepseek",
                        orchestratorModel: user.orchestratorModel || "deepseek",
                    }));
                }

                // Fetch available pairs
                const pairsData: any = await api.get('/api/trading/symbols');
                if (pairsData.success && Array.isArray(pairsData.data)) {
                    setAvailablePairs(pairsData.data.map((p: any) => ({
                        symbol: p.symbol,
                        maxLeverage: p.maxLeverage
                    })));
                } else {
                    // Fallback pairs
                    setAvailablePairs([
                        { symbol: 'BTC-USD', maxLeverage: 20 },
                        { symbol: 'ETH-USD', maxLeverage: 20 },
                        { symbol: 'SOL-USD', maxLeverage: 10 },
                        { symbol: 'AVAX-USD', maxLeverage: 10 },
                        { symbol: 'ARB-USD', maxLeverage: 10 }
                    ]);
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
            const data: any = await api.put('/api/trading/settings', {
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
                ...(settings.openaiApiKey && !settings.openaiApiKey.includes("••••")
                    ? { openaiApiKey: settings.openaiApiKey } : {}),
                ...(settings.anthropicApiKey && !settings.anthropicApiKey.includes("••••")
                    ? { anthropicApiKey: settings.anthropicApiKey } : {}),
                ...(settings.geminiApiKey && !settings.geminiApiKey.includes("••••")
                    ? { geminiApiKey: settings.geminiApiKey } : {}),
                ...(settings.asterApiKey && !settings.asterApiKey.includes("••••")
                    ? { asterApiKey: settings.asterApiKey } : {}),
                ...(settings.asterApiSecret && !settings.asterApiSecret.includes("••••")
                    ? { asterApiSecret: settings.asterApiSecret } : {}),

                marketAnalystModel: settings.marketAnalystModel,
                riskOfficerModel: settings.riskOfficerModel,
                strategyConsultantModel: settings.strategyConsultantModel,
                orchestratorModel: settings.orchestratorModel,

                asterTestnet: settings.asterTestnet,
            });

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
                            <label className="text-white font-medium block mb-3">Agent Decision Mode</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'deepseek', label: 'AI Agents', desc: 'LLM Analysis' },
                                    { id: 'rl', label: 'RL Only', desc: 'Trained Model' },
                                    { id: 'hybrid', label: 'Hybrid', desc: 'AI + RL Combined' },
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
                            <label className="text-white font-medium block mb-2">Aster API Key & Secret</label>
                            <div className="space-y-3">
                                <div>
                                    <input
                                        type={editingKey === 'aster' ? 'text' : 'password'}
                                        value={settings.asterApiKey}
                                        onChange={(e) => setSettings({ ...settings, asterApiKey: e.target.value })}
                                        readOnly={editingKey !== 'aster'}
                                        placeholder="API Key"
                                        className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white mb-2"
                                    />
                                    <input
                                        type={editingKey === 'aster' ? 'text' : 'password'}
                                        value={settings.asterApiSecret}
                                        onChange={(e) => setSettings({ ...settings, asterApiSecret: e.target.value })}
                                        readOnly={editingKey !== 'aster'}
                                        placeholder="API Secret"
                                        className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (editingKey === 'aster') {
                                                handleSave();
                                                setEditingKey(null);
                                            } else {
                                                setEditingKey('aster');
                                            }
                                        }}
                                        className={`px-4 flex-1 rounded-lg border transition-all ${editingKey === 'aster'
                                            ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                                            : 'btn-secondary'
                                            }`}
                                    >
                                        {editingKey === 'aster' ? 'Save & Close' : 'Edit Credentials'}
                                    </button>
                                    <button
                                        onClick={testAsterConnection}
                                        disabled={asterTest.testing}
                                        className="btn-secondary px-4 flex-1"
                                    >
                                        {asterTest.testing ? 'Testing...' : 'Test Connection'}
                                    </button>
                                </div>
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

                    </div>

                    {/* DeepSeek API Key */}
                </div>
            </div>

            {/* API Keys (Bot Access) */}
            <ApiKeysSettings />

            {/* AI Model Keys */}
            <div className="card glass relative">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>🧠</span> AI Model Keys
                </h2>

                <div className="space-y-4">
                    {/* DeepSeek */}
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
                                {deepseekTest.testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        {deepseekTest.result && (
                            <div className={`text-sm mt-2 flex items-center gap-1 ${deepseekTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${deepseekTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                {deepseekTest.result.connected ? deepseekTest.result.message : deepseekTest.result.error}
                            </div>
                        )}
                    </div>

                    {/* OpenAI */}
                    <div>
                        <label className="text-white font-medium block mb-2">OpenAI API Key (ChatGPT)</label>
                        <div className="flex gap-2">
                            <input
                                type={editingKey === 'openai' ? 'text' : 'password'}
                                value={settings.openaiApiKey}
                                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                                readOnly={editingKey !== 'openai'}
                                placeholder="sk-..."
                                className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                            />
                            <button
                                onClick={() => setEditingKey(editingKey === 'openai' ? null : 'openai')}
                                className="btn-secondary px-4"
                            >
                                {editingKey === 'openai' ? 'Done' : 'Edit'}
                            </button>
                            <button
                                onClick={testOpenaiConnection}
                                disabled={openaiTest.testing}
                                className="btn-secondary px-4"
                            >
                                {openaiTest.testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        {openaiTest.result && (
                            <div className={`text-sm mt-2 flex items-center gap-1 ${openaiTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${openaiTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                {openaiTest.result.connected ? openaiTest.result.message : openaiTest.result.error}
                            </div>
                        )}
                    </div>

                    {/* Anthropic */}
                    <div>
                        <label className="text-white font-medium block mb-2">Anthropic API Key (Claude)</label>
                        <div className="flex gap-2">
                            <input
                                type={editingKey === 'anthropic' ? 'text' : 'password'}
                                value={settings.anthropicApiKey}
                                onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                                readOnly={editingKey !== 'anthropic'}
                                placeholder="sk-ant-..."
                                className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                            />
                            <button
                                onClick={() => setEditingKey(editingKey === 'anthropic' ? null : 'anthropic')}
                                className="btn-secondary px-4"
                            >
                                {editingKey === 'anthropic' ? 'Done' : 'Edit'}
                            </button>
                            <button
                                onClick={testAnthropicConnection}
                                disabled={anthropicTest.testing}
                                className="btn-secondary px-4"
                            >
                                {anthropicTest.testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        {anthropicTest.result && (
                            <div className={`text-sm mt-2 flex items-center gap-1 ${anthropicTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${anthropicTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                {anthropicTest.result.connected ? anthropicTest.result.message : anthropicTest.result.error}
                            </div>
                        )}
                    </div>

                    {/* Gemini */}
                    <div>
                        <label className="text-white font-medium block mb-2">Google Gemini API Key</label>
                        <div className="flex gap-2">
                            <input
                                type={editingKey === 'gemini' ? 'text' : 'password'}
                                value={settings.geminiApiKey}
                                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                readOnly={editingKey !== 'gemini'}
                                placeholder="AIza..."
                                className="flex-1 px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white"
                            />
                            <button
                                onClick={() => setEditingKey(editingKey === 'gemini' ? null : 'gemini')}
                                className="btn-secondary px-4"
                            >
                                {editingKey === 'gemini' ? 'Done' : 'Edit'}
                            </button>
                            <button
                                onClick={testGeminiConnection}
                                disabled={geminiTest.testing}
                                className="btn-secondary px-4"
                            >
                                {geminiTest.testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        {geminiTest.result && (
                            <div className={`text-sm mt-2 flex items-center gap-1 ${geminiTest.result.connected ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${geminiTest.result.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                                {geminiTest.result.connected ? geminiTest.result.message : geminiTest.result.error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Agent Configuration */}
            <div className="card glass">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>🤖</span> Agent Configuration
                </h2>
                <p className="text-gray-400 text-sm mb-4">Select which AI model powers each agent.</p>

                <div className="space-y-4">
                    {[
                        { id: 'marketAnalystModel', label: 'Market Analyst', icon: '📊' },
                        { id: 'riskOfficerModel', label: 'Risk Officer', icon: '🛡️' },
                        { id: 'strategyConsultantModel', label: 'Strategy Consultant', icon: '💡' },
                        { id: 'orchestratorModel', label: 'Orchestrator', icon: '🎼' }
                    ].map((agent) => (
                        <div key={agent.id}>
                            <label className="text-white font-medium block mb-2 flex items-center gap-2">
                                <span>{agent.icon}</span> {agent.label}
                            </label>
                            <select
                                value={(settings as any)[agent.id]}
                                onChange={(e) => setSettings({ ...settings, [agent.id]: e.target.value })}
                                className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white appearance-none cursor-pointer hover:border-white/20 transition-colors"
                            >
                                <option value="deepseek">DeepSeek (Default)</option>
                                <option value="openai">OpenAI (GPT-4)</option>
                                <option value="anthropic">Anthropic (Claude 3)</option>
                                <option value="gemini">Google (Gemini 1.5)</option>
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trading Pairs */}
            <div className="card glass">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>💹</span> Trading Pairs
                </h2>

                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-2">
                    {availablePairs.map((pairData) => (
                        <button
                            key={pairData.symbol}
                            onClick={() => {
                                const pairs = settings.selectedPairs.includes(pairData.symbol)
                                    ? settings.selectedPairs.filter(p => p !== pairData.symbol)
                                    : [...settings.selectedPairs, pairData.symbol];
                                setSettings({ ...settings, selectedPairs: pairs });
                            }}
                            className={`px-4 py-2 rounded-lg border transition-all text-sm flex items-center gap-2 ${settings.selectedPairs.includes(pairData.symbol)
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                        >
                            <span>{pairData.symbol}</span>
                            {pairData.maxLeverage && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${settings.selectedPairs.includes(pairData.symbol)
                                    ? 'bg-indigo-500/30'
                                    : 'bg-white/10'
                                    }`}>
                                    {pairData.maxLeverage}x
                                </span>
                            )}
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
