"use client";

import { useState } from "react";

// Mock signal data - in real app, fetch from API
const mockSignals = [
    {
        id: "1",
        symbol: "BTCUSDT",
        direction: "LONG",
        entryPrice: 42500,
        stopLoss: 41650,
        takeProfit: 44625,
        confidence: 0.78,
        status: "PENDING",
        executed: false,
        createdAt: "2024-01-15T14:30:00Z",
        strategyVersion: "SMC v3",
        agentReasoning: {
            strategyConsultant: `Step 1: [Market Analysis]
Analyzing BTC-USD market conditions. Current RSI at 45 indicates neutral territory with room for upside. MACD showing bullish crossover forming - histogram turning positive. Volume is 1.2x average, confirming interest.

Step 2: [Strategy Selection]
Using hybrid mode. DeepSeek for pattern recognition, RL timing is on standby. SMC methodology detected Order Block at 42,200 level which price has respected.

Step 3: [Trading Decision]
Based on Order Block retest with bullish MACD confirmation, I recommend a LONG position with 78% confidence.

DECISION: LONG
CONFIDENCE: 0.78
ENTRY: 42500
STOP_LOSS: 41650
TAKE_PROFIT: 44625`,
            riskOfficer: `Step 1: [Risk Assessment]
Current portfolio value: $50,000. Position size request: 5% = $2,500.
Risk per trade: 2% = $1,000 max loss.

Step 2: [Position Sizing - Kelly Criterion]
Win rate: 62%, Avg Win: 2.8%, Avg Loss: 1.5%
Kelly fraction: 0.28, Half-Kelly: 0.14
Recommended position: $7,000 (14% of portfolio)

Step 3: [Stop Loss Validation]
Proposed SL at 41650 = -2% from entry. Within acceptable risk.
R:R ratio = 2.5:1 ✓

RISK_APPROVED: YES
POSITION_SIZE: $2,500 (conservative)
MAX_LOSS: $50 (0.1% portfolio)`,
            marketAnalyst: `Step 1: [Sentiment Analysis]
Twitter/X sentiment: Bullish (67% positive mentions)
Fear & Greed Index: 58 (Greed)
Funding rates: Neutral (0.01%)

Step 2: [On-Chain Data]
Whale accumulation detected - 3 large buys >$10M in last 6 hours.
Exchange outflows increasing (bullish).
Active addresses trending up.

Step 3: [News Impact]
No major negative news. ETF approval rumors circulating.
Fed meeting in 5 days - potential volatility.

SENTIMENT: BULLISH
ON_CHAIN: ACCUMULATION
NEWS_IMPACT: NEUTRAL_POSITIVE`
        }
    },
    {
        id: "2",
        symbol: "ETHUSDT",
        direction: "SHORT",
        entryPrice: 2380,
        stopLoss: 2450,
        takeProfit: 2280,
        confidence: 0.65,
        status: "HIT_TP",
        actualOutcome: "WIN",
        pnlPercent: 4.2,
        executed: false,
        createdAt: "2024-01-14T10:15:00Z",
        strategyVersion: "SMC v2",
        agentReasoning: {
            strategyConsultant: `Step 1: [Market Analysis]
ETH showing weakness against BTC. RSI at 68 approaching overbought. Price rejected from 2400 resistance twice.

Step 2: [Strategy Selection]
ICT Optimal Trade Entry zone identified at 62% retracement. Bearish divergence on RSI.

DECISION: SHORT
CONFIDENCE: 0.65`,
            riskOfficer: `Position validated. R:R = 1.4:1
RISK_APPROVED: YES`,
            marketAnalyst: `Sentiment: Mixed
On-chain shows ETH selling pressure.`
        }
    },
    {
        id: "3",
        symbol: "SOLUSDT",
        direction: "LONG",
        entryPrice: 98.50,
        stopLoss: 94.20,
        takeProfit: 108.50,
        confidence: 0.72,
        status: "HIT_SL",
        actualOutcome: "LOSS",
        pnlPercent: -4.4,
        executed: true,
        orderId: "ORD-12345",
        executionPrice: 98.65,
        createdAt: "2024-01-13T16:00:00Z",
        strategyVersion: "SMC v2",
        agentReasoning: {
            strategyConsultant: `Bullish setup on SOL. Market structure break confirmed.
DECISION: LONG
CONFIDENCE: 0.72`,
            riskOfficer: `R:R = 2.3:1. APPROVED`,
            marketAnalyst: `Altcoin season indicator positive.`
        }
    }
];

export default function SignalsPage() {
    const [selectedSignal, setSelectedSignal] = useState<typeof mockSignals[0] | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'win' | 'loss'>('all');

    const filteredSignals = mockSignals.filter(s => {
        if (filter === 'all') return true;
        if (filter === 'pending') return s.status === 'PENDING';
        if (filter === 'win') return s.actualOutcome === 'WIN';
        if (filter === 'loss') return s.actualOutcome === 'LOSS';
        return true;
    });

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Signal History</h1>
                <p className="text-gray-400">All tracked signals with AI agent reasoning</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                {(['all', 'pending', 'win', 'loss'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg transition-all capitalize ${filter === f
                                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                    >
                        {f === 'all' ? 'All Signals' : f}
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Signal List */}
                <div className="space-y-4">
                    {filteredSignals.map(signal => (
                        <div
                            key={signal.id}
                            onClick={() => setSelectedSignal(signal)}
                            className={`card glass cursor-pointer transition-all hover:border-indigo-500/30 ${selectedSignal?.id === signal.id ? 'border-indigo-500/50 bg-indigo-500/5' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-white">{signal.symbol}</span>
                                    <span className={`badge ${signal.direction === 'LONG' ? 'badge-success' : 'badge-danger'}`}>
                                        {signal.direction}
                                    </span>
                                </div>
                                <span className={`badge ${signal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        signal.actualOutcome === 'WIN' ? 'badge-success' : 'badge-danger'
                                    }`}>
                                    {signal.status === 'PENDING' ? '⏳ Tracking' : signal.actualOutcome}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500">Entry</div>
                                    <div className="text-white font-medium">${signal.entryPrice.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">SL / TP</div>
                                    <div className="text-white font-medium">
                                        <span className="text-red-400">${signal.stopLoss.toLocaleString()}</span>
                                        {' / '}
                                        <span className="text-green-400">${signal.takeProfit.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Confidence</div>
                                    <div className="text-indigo-400 font-bold">{Math.round(signal.confidence * 100)}%</div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-gray-500 text-xs">{signal.strategyVersion}</span>
                                <span className="text-gray-500 text-xs">{new Date(signal.createdAt).toLocaleString()}</span>
                                {signal.pnlPercent && (
                                    <span className={`font-bold ${signal.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent}%
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Agent Thoughts Panel */}
                <div className="lg:sticky lg:top-8">
                    {selectedSignal ? (
                        <div className="card glass">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>🧠</span> Agent Reasoning - {selectedSignal.symbol}
                            </h2>

                            {/* Strategy Consultant */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">🎯</span>
                                    <span className="text-white font-bold">Strategy Consultant</span>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                        {selectedSignal.agentReasoning.strategyConsultant}
                                    </pre>
                                </div>
                            </div>

                            {/* Risk Officer */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">🛡️</span>
                                    <span className="text-white font-bold">Risk Officer</span>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                        {selectedSignal.agentReasoning.riskOfficer}
                                    </pre>
                                </div>
                            </div>

                            {/* Market Analyst */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">📊</span>
                                    <span className="text-white font-bold">Market Analyst</span>
                                </div>
                                <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                        {selectedSignal.agentReasoning.marketAnalyst}
                                    </pre>
                                </div>
                            </div>

                            {/* Execution info */}
                            {selectedSignal.executed && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <div className="text-gray-400 text-sm">
                                        <span className="text-green-400">✓ Executed</span>
                                        {' | Order: '}{selectedSignal.orderId}
                                        {' | Price: $'}{selectedSignal.executionPrice}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card glass flex items-center justify-center h-96">
                            <div className="text-center text-gray-500">
                                <div className="text-4xl mb-4">🧠</div>
                                <p>Select a signal to view agent reasoning</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
