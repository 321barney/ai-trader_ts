"use client";

import { useState } from "react";

interface ThoughtStep {
    step: number;
    thought: string;
}

interface AgentDecision {
    agent: string;
    decision: string;
    confidence: number;
    reasoning: string;
    thoughtSteps: ThoughtStep[];
    timestamp: string;
    symbol?: string;
}

export default function AgentDashboardPage() {
    const [expandedAgent, setExpandedAgent] = useState<string | null>("Strategy Consultant");

    // Mock agent data with COT
    const agentDecisions: AgentDecision[] = [
        {
            agent: "Strategy Consultant",
            decision: "LONG",
            confidence: 0.72,
            symbol: "BTC-USD",
            timestamp: "2 minutes ago",
            reasoning: "Based on market analysis and RL performance, recommending hybrid strategy.",
            thoughtSteps: [
                { step: 1, thought: "Market Analysis: Analyzing BTC-USD. RSI at 52 (neutral), MACD showing bullish crossover forming. Volume is average. Overall sentiment cautiously optimistic." },
                { step: 2, thought: "Strategy Selection: Given moderate volatility and clear technical patterns, using DeepSeek for pattern analysis. RL model for execution timing optimization." },
                { step: 3, thought: "RL Performance Review: Sharpe Ratio at 1.2 - performing well. Win rate 58% acceptable. No parameter changes needed." },
                { step: 4, thought: "Trading Decision: Bullish MACD crossover + neutral RSI with room to grow = LONG position. Confidence moderate due to average volume." },
                { step: 5, thought: "Risk Parameters: Entry at 42,500 (above current for breakout confirmation). Stop-loss at 41,650 (2% below). Take-profit at 44,625 (5% above)." },
            ],
        },
        {
            agent: "Risk Officer",
            decision: "APPROVED",
            confidence: 0.85,
            symbol: "BTC-USD",
            timestamp: "2 minutes ago",
            reasoning: "Trade approved with standard risk parameters.",
            thoughtSteps: [
                { step: 1, thought: "Trade Analysis: Reviewing proposed LONG on BTC-USD. Entry price reasonable at current market level. Aligns with trend direction." },
                { step: 2, thought: "Volatility Assessment: ATR indicates moderate volatility. 24h range 3% within normal bounds. Risk manageable with standard parameters." },
                { step: 3, thought: "Position Sizing: Portfolio $50,000. Max risk 2% = $1,000. With 2.5% stop-loss, optimal position is 4% of portfolio ($2,000)." },
                { step: 4, thought: "Risk Assessment: Overall MEDIUM risk. Moderate volatility, acceptable position size, good 1:2.5 risk/reward. Trade APPROVED." },
            ],
        },
        {
            agent: "Market Analyst",
            decision: "BULLISH",
            confidence: 0.65,
            symbol: "BTC-USD",
            timestamp: "5 minutes ago",
            reasoning: "On-chain data supports accumulation thesis.",
            thoughtSteps: [
                { step: 1, thought: "On-Chain Analysis: Whale activity detected - 3 large transfers (>1000 BTC) in 24h, 2 moving to cold storage. Net exchange outflow 5,200 BTC (bullish accumulation signal)." },
                { step: 2, thought: "News Analysis: ETF inflows continue showing institutional interest. No major regulatory concerns. Layer 2 adoption increasing." },
                { step: 3, thought: "Social Sentiment: Twitter/X sentiment 0.35 (slightly bullish). Reddit moderately positive. Fear & Greed at 62 (Greed - watch for overbought)." },
                { step: 4, thought: "Synthesis: Overall BULLISH. On-chain strongly supports accumulation. Institutional interest steady. Social sentiment positive but not euphoric." },
            ],
        },
    ];

    const getAgentIcon = (agent: string) => {
        if (agent.includes("Strategy")) return "🧠";
        if (agent.includes("Risk")) return "🛡️";
        return "🔍";
    };

    const getAgentColor = (agent: string) => {
        if (agent.includes("Strategy")) return "from-indigo-500 to-purple-600";
        if (agent.includes("Risk")) return "from-emerald-500 to-teal-600";
        return "from-cyan-500 to-blue-600";
    };

    const getDecisionColor = (decision: string) => {
        if (decision === "LONG" || decision === "APPROVED" || decision === "BULLISH") return "badge-success";
        if (decision === "SHORT" || decision === "REJECTED" || decision === "BEARISH") return "badge-danger";
        return "badge-warning";
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">AI Agent Dashboard</h1>
                <p className="text-gray-400">View agent reasoning and Chain-of-Thought analysis</p>
            </div>

            {/* Agent Status Overview */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {agentDecisions.map((agent) => (
                    <div
                        key={agent.agent}
                        className={`card glass glass-hover cursor-pointer ${expandedAgent === agent.agent ? 'ring-2 ring-indigo-500/50' : ''}`}
                        onClick={() => setExpandedAgent(expandedAgent === agent.agent ? null : agent.agent)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAgentColor(agent.agent)} flex items-center justify-center text-2xl`}>
                                {getAgentIcon(agent.agent)}
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-bold">{agent.agent}</div>
                                <div className="text-gray-500 text-sm">{agent.timestamp}</div>
                            </div>
                            <div className="text-right">
                                <div className={`badge ${getDecisionColor(agent.decision)}`}>
                                    {agent.decision}
                                </div>
                                <div className="text-gray-500 text-sm mt-1">
                                    {Math.round(agent.confidence * 100)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Expanded Agent Detail */}
            {expandedAgent && (
                <div className="card glass">
                    {agentDecisions.filter(a => a.agent === expandedAgent).map((agent) => (
                        <div key={agent.agent}>
                            {/* Agent Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAgentColor(agent.agent)} flex items-center justify-center text-3xl`}>
                                        {getAgentIcon(agent.agent)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{agent.agent}</h2>
                                        <div className="text-gray-400">
                                            {agent.symbol} • {agent.timestamp}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`badge ${getDecisionColor(agent.decision)} text-lg px-4 py-2`}>
                                        {agent.decision}
                                    </div>
                                    <div className="text-gray-400 mt-2">
                                        Confidence: {Math.round(agent.confidence * 100)}%
                                    </div>
                                </div>
                            </div>

                            {/* Chain of Thought */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-indigo-400">🔗</span> Chain of Thought
                                </h3>
                                <div className="space-y-4">
                                    {agent.thoughtSteps.map((step, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                                    {step.step}
                                                </div>
                                                {i < agent.thoughtSteps.length - 1 && (
                                                    <div className="w-px h-full bg-indigo-500/20 mx-auto mt-2" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="bg-[#1a1a25] rounded-lg p-4 border border-white/5">
                                                    <p className="text-gray-300 text-sm leading-relaxed">
                                                        {step.thought}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                                <div className="text-indigo-400 font-medium mb-1">Summary</div>
                                <p className="text-gray-300">{agent.reasoning}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* RL Control Panel (for Strategy Consultant) */}
            {expandedAgent === "Strategy Consultant" && (
                <div className="card glass mt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>🎮</span> RL Model Control
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Status</div>
                            <div className="text-green-400 font-bold">Active</div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                            <div className="text-white font-bold">1.24</div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Win Rate</div>
                            <div className="text-white font-bold">58%</div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Last Action</div>
                            <div className="text-gray-300 font-bold text-sm">None</div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button className="btn-secondary flex-1 py-3">
                            Modify Parameters
                        </button>
                        <button className="btn-secondary flex-1 py-3">
                            Retrain Model
                        </button>
                        <button className="bg-red-500/10 border border-red-500/30 text-red-400 flex-1 py-3 rounded-lg font-medium hover:bg-red-500/20 transition-colors">
                            Stop RL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
