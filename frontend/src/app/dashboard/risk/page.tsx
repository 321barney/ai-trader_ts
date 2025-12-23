"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface RiskStatus {
    withinLimits: boolean;
    currentDrawdown: number;
    dailyPnl: number;
    openPositions: number;
    exposurePercent: number;
    violations: string[];
}

interface ConfluenceData {
    symbol: string;
    overallBias: string;
    confluenceScore: number;
    alignedTimeframes: number;
    totalTimeframes: number;
    tradingZone: string;
    entryRecommendation?: string;
}

interface SentimentData {
    symbol: string;
    overallSentiment: string;
    sentimentScore: number;
    sources: any[];
}

export default function RiskDashboardPage() {
    const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null);
    const [confluence, setConfluence] = useState<ConfluenceData | null>(null);
    const [sentiment, setSentiment] = useState<SentimentData | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedSymbol]);

    const fetchData = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };

            const [riskRes, mtfRes, sentRes] = await Promise.all([
                fetch(`${API_BASE}/api/portfolio/risk`, { headers }),
                fetch(`${API_BASE}/api/analytics/mtf/${selectedSymbol}`, { headers }),
                fetch(`${API_BASE}/api/analytics/sentiment/${selectedSymbol}`, { headers })
            ]);

            const riskData = await riskRes.json();
            const mtfData = await mtfRes.json();
            const sentData = await sentRes.json();

            if (riskData.success) setRiskStatus(riskData.data);
            if (mtfData.success) setConfluence(mtfData.data);
            if (sentData.success) setSentiment(sentData.data);
        } catch (error) {
            console.error("Failed to fetch risk data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getZoneColor = (zone: string) => {
        if (zone === 'SAFE') return 'bg-green-500/20 text-green-400';
        if (zone === 'CAUTION') return 'bg-yellow-500/20 text-yellow-400';
        return 'bg-red-500/20 text-red-400';
    };

    const getSentimentColor = (sentiment: string) => {
        if (sentiment === 'BULLISH') return 'text-green-400';
        if (sentiment === 'BEARISH') return 'text-red-400';
        return 'text-gray-400';
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">🛡️ Risk Dashboard</h1>
                    <p className="text-gray-400 mt-1">Monitor risk metrics, multi-timeframe, and sentiment</p>
                </div>
                <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="bg-white/10 text-white rounded-lg px-4 py-2 border border-white/20"
                >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                </select>
            </div>

            {loading ? (
                <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card glass animate-pulse h-64"></div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Risk Status Card */}
                    <div className="grid lg:grid-cols-3 gap-6 mb-8">
                        {/* Account Risk */}
                        <div className="card glass">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span>⚠️</span> Account Risk
                            </h3>
                            {riskStatus && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-sm ${riskStatus.withinLimits
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {riskStatus.withinLimits ? '✓ Safe' : '⚠ Alert'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Drawdown</span>
                                            <span className={riskStatus.currentDrawdown > 10 ? 'text-red-400' : 'text-white'}>
                                                {riskStatus.currentDrawdown.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full ${riskStatus.currentDrawdown > 10 ? 'bg-red-500' :
                                                        riskStatus.currentDrawdown > 5 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                style={{ width: `${Math.min(riskStatus.currentDrawdown * 5, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Open Positions</span>
                                        <span className="text-white font-medium">{riskStatus.openPositions}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Exposure</span>
                                        <span className="text-white font-medium">{riskStatus.exposurePercent.toFixed(1)}%</span>
                                    </div>
                                    {riskStatus.violations.length > 0 && (
                                        <div className="border-t border-white/10 pt-4 space-y-2">
                                            {riskStatus.violations.map((v, i) => (
                                                <div key={i} className="text-xs text-red-400 flex items-center gap-2">
                                                    <span>🚨</span> {v}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Multi-Timeframe */}
                        <div className="card glass">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span>📊</span> Multi-Timeframe
                            </h3>
                            {confluence && (
                                <div className="space-y-4">
                                    <div className="text-center p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                                        <div className={`text-2xl font-bold ${confluence.overallBias === 'BULLISH' ? 'text-green-400' :
                                                confluence.overallBias === 'BEARISH' ? 'text-red-400' : 'text-gray-400'
                                            }`}>
                                            {confluence.overallBias}
                                        </div>
                                        <div className="text-gray-500 text-sm mt-1">Overall Bias</div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Confluence</span>
                                        <span className="text-white font-medium">{confluence.confluenceScore.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Aligned</span>
                                        <span className="text-white font-medium">
                                            {confluence.alignedTimeframes}/{confluence.totalTimeframes} TF
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Zone</span>
                                        <span className={`px-3 py-1 rounded-full text-sm ${getZoneColor(confluence.tradingZone)}`}>
                                            {confluence.tradingZone}
                                        </span>
                                    </div>
                                    {confluence.entryRecommendation && (
                                        <div className="text-xs text-indigo-400 bg-indigo-500/10 p-3 rounded-lg">
                                            💡 {confluence.entryRecommendation}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sentiment */}
                        <div className="card glass">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span>🎭</span> Market Sentiment
                            </h3>
                            {sentiment && (
                                <div className="space-y-4">
                                    <div className="text-center p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                                        <div className={`text-2xl font-bold ${getSentimentColor(sentiment.overallSentiment)}`}>
                                            {sentiment.overallSentiment}
                                        </div>
                                        <div className="text-gray-500 text-sm mt-1">
                                            Score: {sentiment.sentimentScore >= 0 ? '+' : ''}{sentiment.sentimentScore.toFixed(0)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {sentiment.sources.map((src, i) => (
                                            <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                                <span className="text-gray-400 text-sm">{src.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm ${getSentimentColor(src.sentiment)}`}>
                                                        {src.sentiment}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{src.details}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trading Decision Helper */}
                    <div className="card glass">
                        <h3 className="text-lg font-bold text-white mb-4">🎯 Trading Decision Helper</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-xl ${riskStatus?.withinLimits ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <div className="text-sm text-gray-400 mb-1">Risk Check</div>
                                <div className={`font-medium ${riskStatus?.withinLimits ? 'text-green-400' : 'text-red-400'}`}>
                                    {riskStatus?.withinLimits ? '✓ Passed' : '✗ Failed'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl ${confluence?.confluenceScore && confluence.confluenceScore >= 50 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                <div className="text-sm text-gray-400 mb-1">MTF Confirmation</div>
                                <div className={`font-medium ${confluence?.confluenceScore && confluence.confluenceScore >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {confluence?.confluenceScore && confluence.confluenceScore >= 50 ? '✓ Aligned' : '⚠ Weak'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl ${sentiment?.overallSentiment !== 'NEUTRAL' ? 'bg-green-500/10' : 'bg-white/5'}`}>
                                <div className="text-sm text-gray-400 mb-1">Sentiment</div>
                                <div className={`font-medium ${getSentimentColor(sentiment?.overallSentiment || 'NEUTRAL')}`}>
                                    {sentiment?.overallSentiment || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
