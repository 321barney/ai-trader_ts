"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

interface StepData {
    asterApiKey?: string;
    asterApiSecret?: string;
    asterTestnet?: boolean;
    leverage?: number;
    selectedPairs?: string[];
    marketType?: string;
    methodology?: string;
    deepseekApiKey?: string;
}

interface ConnectionResult {
    connected: boolean;
    balance?: { asset: string; available: number }[];
    availablePairs?: { symbol: string; baseAsset: string; quoteAsset: string }[];
    totalPairs?: number;
    error?: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
    const [availablePairs, setAvailablePairs] = useState<string[]>([]);
    const [data, setData] = useState<StepData>({
        asterTestnet: true,
        leverage: 10,
        selectedPairs: [],
        marketType: "perp",
        methodology: "SMC",
    });

    const totalSteps = 6;

    const steps = [
        { title: "Exchange API", description: "Connect your Aster exchange" },
        { title: "Leverage", description: "Set your leverage preference" },
        { title: "Trading Pairs", description: "Select pairs to trade" },
        { title: "Market Type", description: "Choose perp or spot" },
        { title: "Methodology", description: "Select trading strategy" },
        { title: "DeepSeek AI", description: "Connect AI provider" },
    ];

    const defaultPairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "ARBUSDT"];
    const tradingPairs = availablePairs.length > 0 ? availablePairs : defaultPairs;
    const methodologies = [
        { id: "SMC", name: "Smart Money Concepts", desc: "Order blocks, liquidity grabs" },
        { id: "ICT", name: "ICT Methodology", desc: "Institutional trading concepts" },
        { id: "Gann", name: "Gann Theory", desc: "Time and price analysis" },
        { id: "Custom", name: "Custom Rules", desc: "AI learns from your rules" },
    ];

    const testConnection = async () => {
        if (!data.asterApiKey || !data.asterApiSecret) {
            setConnectionResult({ connected: false, error: "Please enter API key and secret" });
            return;
        }

        setIsTesting(true);
        setConnectionResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/onboarding/test-connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: data.asterApiKey,
                    apiSecret: data.asterApiSecret,
                    testnet: data.asterTestnet,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setConnectionResult({
                    connected: true,
                    balance: result.data.balance,
                    availablePairs: result.data.availablePairs,
                    totalPairs: result.data.totalPairs,
                });
                // Set available pairs for Step 3
                if (result.data.availablePairs) {
                    setAvailablePairs(result.data.availablePairs.slice(0, 10).map((p: any) => p.symbol));
                }
            } else {
                setConnectionResult({ connected: false, error: result.error });
            }
        } catch (error: any) {
            setConnectionResult({ connected: false, error: error.message || "Connection failed" });
        } finally {
            setIsTesting(false);
        }
    };

    const handleNext = async () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            // Complete onboarding
            setIsLoading(true);
            try {
                // Would call API here
                await new Promise(resolve => setTimeout(resolve, 1500));
                router.push("/dashboard");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const togglePair = (pair: string) => {
        const pairs = data.selectedPairs || [];
        if (pairs.includes(pair)) {
            setData({ ...data, selectedPairs: pairs.filter(p => p !== pair) });
        } else {
            setData({ ...data, selectedPairs: [...pairs, pair] });
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
            </div>

            {/* Sidebar - Steps */}
            <aside className="w-80 border-r border-white/5 p-8 relative z-10">
                <div className="flex items-center gap-2 mb-12">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">AI</span>
                    </div>
                    <span className="text-xl font-bold text-white">Trader</span>
                </div>

                <div className="space-y-4">
                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${currentStep === i + 1
                                ? "bg-indigo-500/10 border border-indigo-500/30"
                                : currentStep > i + 1
                                    ? "opacity-60"
                                    : "opacity-40"
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep > i + 1
                                ? "bg-green-500 text-white"
                                : currentStep === i + 1
                                    ? "bg-indigo-500 text-white"
                                    : "bg-white/10 text-gray-400"
                                }`}>
                                {currentStep > i + 1 ? "✓" : i + 1}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm">{step.title}</div>
                                <div className="text-gray-500 text-xs">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-lg">
                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Step {currentStep} of {totalSteps}</span>
                            <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="card glass p-8">
                        {/* Step 1: Exchange API */}
                        {currentStep === 1 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">Connect Exchange</h2>
                                <p className="text-gray-400 mb-6">Enter your AsterDex API credentials</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                                        <input
                                            type="text"
                                            value={data.asterApiKey || ""}
                                            onChange={(e) => setData({ ...data, asterApiKey: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white focus:border-indigo-500 outline-none"
                                            placeholder="Enter API key"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">API Secret</label>
                                        <input
                                            type="password"
                                            value={data.asterApiSecret || ""}
                                            onChange={(e) => setData({ ...data, asterApiSecret: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white focus:border-indigo-500 outline-none"
                                            placeholder="Enter API secret"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.asterTestnet}
                                            onChange={(e) => setData({ ...data, asterTestnet: e.target.checked })}
                                            className="w-5 h-5 rounded bg-[#1a1a25] border-white/10"
                                        />
                                        <span className="text-gray-300">Use Testnet (recommended for testing)</span>
                                    </label>

                                    {/* Test Connection Button */}
                                    <button
                                        onClick={testConnection}
                                        disabled={isTesting || !data.asterApiKey || !data.asterApiSecret}
                                        className="w-full py-3 rounded-lg border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 font-medium hover:bg-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isTesting ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                Testing Connection...
                                            </>
                                        ) : (
                                            <>
                                                <span>🔌</span>
                                                Test Connection
                                            </>
                                        )}
                                    </button>

                                    {/* Connection Result */}
                                    {connectionResult && (
                                        <div className={`rounded-lg p-4 border ${connectionResult.connected
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-red-500/10 border-red-500/30"
                                            }`}>
                                            {connectionResult.connected ? (
                                                <>
                                                    <div className="flex items-center gap-2 text-green-400 font-medium mb-3">
                                                        <span>✓</span> Connection Successful!
                                                    </div>
                                                    {connectionResult.balance && connectionResult.balance.length > 0 && (
                                                        <div className="mb-2">
                                                            <div className="text-gray-400 text-sm mb-1">Available Balance:</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {connectionResult.balance.filter(b => b.available > 0).slice(0, 3).map(b => (
                                                                    <span key={b.asset} className="bg-white/5 px-2 py-1 rounded text-white text-sm">
                                                                        {b.available.toFixed(2)} {b.asset}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="text-gray-400 text-sm">
                                                        {connectionResult.totalPairs} trading pairs available
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-red-400">
                                                    <span className="font-medium">✗ Connection Failed</span>
                                                    <p className="text-sm mt-1">{connectionResult.error}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Step 2: Leverage */}
                        {currentStep === 2 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">Set Leverage</h2>
                                <p className="text-gray-400 mb-6">Choose your default leverage (1x - 100x)</p>

                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="text-5xl font-bold gradient-text mb-2">{data.leverage}x</div>
                                        <div className="text-gray-500">leverage</div>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={data.leverage}
                                        onChange={(e) => setData({ ...data, leverage: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-gray-500 text-sm">
                                        <span>1x (Safe)</span>
                                        <span>100x (High Risk)</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 3: Trading Pairs */}
                        {currentStep === 3 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">Select Pairs</h2>
                                <p className="text-gray-400 mb-6">Choose which pairs the AI should trade</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {tradingPairs.map((pair) => (
                                        <button
                                            key={pair}
                                            onClick={() => togglePair(pair)}
                                            className={`p-4 rounded-lg border transition-all ${data.selectedPairs?.includes(pair)
                                                ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                                                }`}
                                        >
                                            <div className="font-bold">{pair}</div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-gray-500 text-sm mt-4">
                                    Selected: {data.selectedPairs?.length || 0} pairs
                                </p>
                            </>
                        )}

                        {/* Step 4: Market Type */}
                        {currentStep === 4 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">Market Type</h2>
                                <p className="text-gray-400 mb-6">Choose perpetual futures or spot trading</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setData({ ...data, marketType: "perp" })}
                                        className={`p-6 rounded-lg border transition-all ${data.marketType === "perp"
                                            ? "bg-indigo-500/20 border-indigo-500/50"
                                            : "bg-white/5 border-white/10 hover:border-white/20"
                                            }`}
                                    >
                                        <div className="text-3xl mb-2">📈</div>
                                        <div className="text-white font-bold">Perpetual</div>
                                        <div className="text-gray-500 text-sm">Leveraged futures</div>
                                    </button>
                                    <button
                                        onClick={() => setData({ ...data, marketType: "spot" })}
                                        className={`p-6 rounded-lg border transition-all ${data.marketType === "spot"
                                            ? "bg-indigo-500/20 border-indigo-500/50"
                                            : "bg-white/5 border-white/10 hover:border-white/20"
                                            }`}
                                    >
                                        <div className="text-3xl mb-2">💰</div>
                                        <div className="text-white font-bold">Spot</div>
                                        <div className="text-gray-500 text-sm">Direct ownership</div>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Step 5: Methodology */}
                        {currentStep === 5 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">Trading Methodology</h2>
                                <p className="text-gray-400 mb-6">Select your preferred trading strategy</p>

                                <div className="space-y-3">
                                    {methodologies.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setData({ ...data, methodology: m.id })}
                                            className={`w-full p-4 rounded-lg border text-left transition-all ${data.methodology === m.id
                                                ? "bg-indigo-500/20 border-indigo-500/50"
                                                : "bg-white/5 border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            <div className="text-white font-bold">{m.name}</div>
                                            <div className="text-gray-500 text-sm">{m.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Step 6: DeepSeek */}
                        {currentStep === 6 && (
                            <>
                                <h2 className="text-2xl font-bold text-white mb-2">DeepSeek AI</h2>
                                <p className="text-gray-400 mb-6">Connect DeepSeek for AI-powered analysis</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                                        <input
                                            type="password"
                                            value={data.deepseekApiKey || ""}
                                            onChange={(e) => setData({ ...data, deepseekApiKey: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-lg text-white focus:border-indigo-500 outline-none"
                                            placeholder="sk-..."
                                        />
                                    </div>
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                                        <div className="text-indigo-400 font-medium mb-1">💡 Tip</div>
                                        <p className="text-gray-400 text-sm">
                                            Get your API key from{" "}
                                            <a href="https://platform.deepseek.com" target="_blank" className="text-indigo-400 hover:underline">
                                                platform.deepseek.com
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Navigation */}
                        <div className="flex gap-4 mt-8">
                            {currentStep > 1 && (
                                <button onClick={handleBack} className="btn-secondary flex-1 py-3">
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={isLoading}
                                className="btn-primary flex-1 py-3 disabled:opacity-50"
                            >
                                {isLoading ? "Completing..." : currentStep === totalSteps ? "Complete Setup" : "Continue"}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
