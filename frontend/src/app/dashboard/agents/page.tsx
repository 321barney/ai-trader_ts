"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface ThoughtStep {
    step: number;
    thought: string;
}

interface AgentDecision {
    id: string;
    agentType: string;
    decision: string;
    confidence: number;
    reasoning: string;
    thoughtSteps: ThoughtStep[];
    timestamp: string;
    symbol?: string;
    createdAt: string;
    sourceMode?: string; // BACKTEST | SIGNAL | TRADE
}

interface RLStatus {
    available: boolean;
    sharpeRatio?: number;
    winRate?: number;
    totalEpisodes?: number;
    training: {
        isTraining: boolean;
        currentEpisode?: number;
        totalEpisodes?: number;
        progress?: number;
    };
}

export default function AgentDashboardPage() {
    const [expandedAgent, setExpandedAgent] = useState<string | null>("Strategy Consultant");
    // const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]); // Use if we want detailed history list
    // For now, we want the LATEST decision for each agent to display as "Current Status"
    const [latestDecisions, setLatestDecisions] = useState<AgentDecision[]>([]);
    const [rlStatus, setRlStatus] = useState<RLStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [includeBacktest, setIncludeBacktest] = useState(false);

    const fetchAgentsData = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch decisions for all agent types
            const res = await fetch(`${API_BASE}/api/agents/decisions?limit=10&includeBacktest=${includeBacktest}`, { headers });
            const json = await res.json();

            if (json.success) {
                // Map agentType enum to display names
                const agentTypeDisplayMap: Record<string, string> = {
                    'STRATEGY_CONSULTANT': 'Strategy Consultant',
                    'RISK_OFFICER': 'Risk Officer',
                    'MARKET_ANALYST': 'Market Analyst',
                    'ORCHESTRATOR': 'Orchestrator'
                };

                // Group by agent type and get latest
                const decisions = json.data.map((d: any) => ({
                    ...d,
                    agentType: agentTypeDisplayMap[d.agentType] || d.agentType,
                    timestamp: new Date(d.createdAt).toLocaleString(),
                    thoughtSteps: Array.isArray(d.thoughtSteps) ? d.thoughtSteps : []
                }));

                // Get latest for each agent type (including Orchestrator)
                const uniqueAgents = ['Strategy Consultant', 'Risk Officer', 'Market Analyst', 'Orchestrator'];
                const latest = uniqueAgents.map(type =>
                    decisions.find((d: any) => d.agentType === type) || null
                ).filter(Boolean);

                setLatestDecisions(latest.length > 0 ? latest : decisions.slice(0, 5));
            }

            // Fetch RL Status
            const rlRes = await fetch(`${API_BASE}/api/agents/rl/status`, { headers });
            const rlJson = await rlRes.json();
            if (rlJson.success) {
                setRlStatus(rlJson.data);
            }

        } catch (error) {
            console.error("Failed to fetch agent data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgentsData();
        const interval = setInterval(fetchAgentsData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [includeBacktest]);

    const getAgentIcon = (agent: string) => {
        if (agent.includes("Strategy")) return "🧠";
        if (agent.includes("Risk")) return "🛡️";
        if (agent.includes("Orchestrator")) return "🎯";
        return "🔍";
    };

    const getAgentColor = (agent: string) => {
        if (agent.includes("Strategy")) return "from-indigo-500 to-purple-600";
        if (agent.includes("Risk")) return "from-emerald-500 to-teal-600";
        if (agent.includes("Orchestrator")) return "from-amber-500 to-orange-600";
        return "from-cyan-500 to-blue-600";
    };

    const getDecisionColor = (decision: string) => {
        if (decision === "LONG" || decision === "APPROVED" || decision === "BULLISH") return "badge-success";
        if (decision === "SHORT" || decision === "REJECTED" || decision === "BEARISH") return "badge-danger";
        return "badge-warning";
    };

    const getSourceModeBadge = (mode?: string) => {
        switch (mode) {
            case 'BACKTEST':
                return <span className="px-2 py-0.5 text-xs font-mono bg-purple-500/20 text-purple-300 rounded">[BACKTEST]</span>;
            case 'TRADE':
                return <span className="px-2 py-0.5 text-xs font-mono bg-green-500/20 text-green-300 rounded">[TRADE]</span>;
            case 'SIGNAL':
            default:
                return <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/20 text-blue-300 rounded">[SIGNAL]</span>;
        }
    };

    const [runningAnalysis, setRunningAnalysis] = useState(false);

    const runAnalysis = async () => {
        setRunningAnalysis(true);
        try {
            const token = api.getAccessToken();
            const res = await fetch(`${API_BASE}/api/trading/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ symbol: "BTC-USD" })
            });
            const data = await res.json();
            if (data.success) {
                await fetchAgentsData();
                // Optional: Show success toast
            } else {
                alert("Analysis failed: " + (data.error || "Unknown error"));
            }
        } catch (err: any) {
            alert("Network error: " + err.message);
        } finally {
            setRunningAnalysis(false);
        }
    };

    if (loading && latestDecisions.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading Agents...</div>;
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">🏛️ Agent Council</h1>
                    <p className="text-gray-400">3-Agent deliberation with orchestrator consensus</p>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={runAnalysis}
                        disabled={runningAnalysis}
                        className="btn-primary px-4 py-2 flex items-center gap-2"
                    >
                        {runningAnalysis ? (
                            <>
                                <span className="animate-spin text-lg">↻</span>
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <span>▶</span>
                                <span>Run Manual Analysis</span>
                            </>
                        )}
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <input
                            type="checkbox"
                            checked={includeBacktest}
                            onChange={(e) => setIncludeBacktest(e.target.checked)}
                            className="checkbox checkbox-primary checkbox-sm"
                        />
                        <span className="text-sm text-gray-300">Show Backtest History</span>
                    </label>
                    <div className="flex gap-2 text-sm">
                        <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Live System Active</span>
                    </div>
                </div>
            </div>

            {/* Agent Status Overview */}
            {latestDecisions.length === 0 ? (
                <div className="text-center py-12 bg-[#12121a] rounded-xl border border-white/5 mb-8">
                    <p className="text-gray-400">No agent decisions recorded yet.</p>
                    <p className="text-sm text-gray-600 mt-2">Start a trading analysis to see agents in action.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {latestDecisions.map((agent: any) => (
                        <div
                            key={agent.id}
                            className={`card glass glass-hover cursor-pointer ${expandedAgent === agent.agentType ? 'ring-2 ring-indigo-500/50' : ''}`}
                            onClick={() => setExpandedAgent(expandedAgent === agent.agentType ? null : agent.agentType)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAgentColor(agent.agentType || '')} flex items-center justify-center text-2xl`}>
                                    {getAgentIcon(agent.agentType || '')}
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-bold">{agent.agentType}</div>
                                    <div className="text-gray-500 text-sm">{agent.timestamp}</div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        {getSourceModeBadge(agent.sourceMode)}
                                        <div className={`badge ${getDecisionColor(agent.decision)}`}>
                                            {agent.decision}
                                        </div>
                                    </div>
                                    <div className="text-gray-500 text-sm mt-1">
                                        {Math.round((agent.confidence || 0) * 100)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expanded Agent Detail */}
            {expandedAgent && latestDecisions.find(a => a.agentType === expandedAgent) && (
                <div className="card glass">
                    {latestDecisions.filter(a => a.agentType === expandedAgent).map((agent: any) => (
                        <div key={agent.id}>
                            {/* Agent Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAgentColor(agent.agentType || '')} flex items-center justify-center text-3xl`}>
                                        {getAgentIcon(agent.agentType || '')}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{agent.agentType}</h2>
                                        <div className="text-gray-400">
                                            {agent.symbol || 'General'} • {agent.timestamp}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`badge ${getDecisionColor(agent.decision)} text-lg px-4 py-2`}>
                                        {agent.decision}
                                    </div>
                                    <div className="text-gray-400 mt-2">
                                        Confidence: {Math.round((agent.confidence || 0) * 100)}%
                                    </div>
                                </div>
                            </div>

                            {/* Chain of Thought */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-indigo-400">🔗</span> Chain of Thought
                                </h3>
                                <div className="space-y-4">
                                    {agent.thoughtSteps && agent.thoughtSteps.map((step: ThoughtStep, i: number) => (
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
                                    {(!agent.thoughtSteps || agent.thoughtSteps.length === 0) && (
                                        <div className="text-gray-500 italic p-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-center">
                                            No structured reasoning steps recorded for this decision.
                                            <br />
                                            <span className="text-xs opacity-75">Check the summary below for details.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                                <div className="text-indigo-400 font-medium mb-1">Summary</div>
                                <p className="text-gray-300">{agent.reasoning?.substring(0, 500)}</p>
                            </div>

                            {/* Counsel Debate (for Orchestrator with debate content) */}
                            {agent.agentType === 'Orchestrator' && agent.reasoning?.includes('🎯') && (
                                <div className="mt-6 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-lg p-5">
                                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <span>🏛️</span> Agent Counsel Debate
                                    </h4>
                                    <div className="space-y-4 text-sm">
                                        {agent.reasoning.split('\n').map((line: string, i: number) => {
                                            if (line.includes('🎯 STRATEGY') || line.includes('STRATEGY (bold)')) {
                                                return <div key={i} className="p-3 bg-green-500/10 border-l-4 border-green-500 rounded">
                                                    <div className="text-green-400 font-bold mb-1">🎯 Strategy Consultant</div>
                                                    <p className="text-gray-300">{line.replace(/🎯.*?:/, '').trim()}</p>
                                                </div>;
                                            }
                                            if (line.includes('🛡️ RISK') || line.includes('RISK (cautious)')) {
                                                return <div key={i} className="p-3 bg-orange-500/10 border-l-4 border-orange-500 rounded">
                                                    <div className="text-orange-400 font-bold mb-1">🛡️ Risk Officer</div>
                                                    <p className="text-gray-300">{line.replace(/🛡️.*?:/, '').trim()}</p>
                                                </div>;
                                            }
                                            if (line.includes('📊 MARKET') || line.includes('MARKET (mediator)')) {
                                                return <div key={i} className="p-3 bg-blue-500/10 border-l-4 border-blue-500 rounded">
                                                    <div className="text-blue-400 font-bold mb-1">📊 Market Analyst</div>
                                                    <p className="text-gray-300">{line.replace(/📊.*?:/, '').trim()}</p>
                                                </div>;
                                            }
                                            if (line.includes('VERDICT:') || line.includes('FINAL')) {
                                                return <div key={i} className="p-3 bg-purple-500/20 border border-purple-500/40 rounded text-center">
                                                    <p className="text-purple-300 font-bold">{line}</p>
                                                </div>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
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
                            <div className={rlStatus?.available ? "text-green-400 font-bold" : "text-gray-500 font-bold"}>
                                {rlStatus?.training?.isTraining ? 'Training...' : rlStatus?.available ? 'Active' : 'Offline'}
                            </div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Sharpe Ratio</div>
                            <div className="text-white font-bold">{rlStatus?.sharpeRatio?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Win Rate</div>
                            <div className="text-white font-bold">{rlStatus?.winRate ? (rlStatus.winRate * 100).toFixed(1) + '%' : 'N/A'}</div>
                        </div>
                        <div className="bg-[#1a1a25] rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Episodes</div>
                            <div className="text-gray-300 font-bold text-sm">{rlStatus?.totalEpisodes || 0}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
