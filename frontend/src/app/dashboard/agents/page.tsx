"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

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

    const fetchAgentsData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch decisions for all agent types
            const res = await fetch(`${API_BASE}/api/agents/decisions?limit=10`, { headers });
            const json = await res.json();

            if (json.success) {
                // Group by agent type and get latest
                const decisions = json.data.map((d: any) => ({
                    ...d,
                    agent: d.agentType, // Map agentType -> agent for display logic
                    timestamp: new Date(d.createdAt).toLocaleString(),
                    // Ensure thoughtSteps is array
                    thoughtSteps: Array.isArray(d.thoughtSteps) ? d.thoughtSteps : []
                }));
                // We could filter to show only latest 3 distinct agents if desired, 
                // but for now let's just show the recent stream or latest per agent.
                // Let's filter to get 1 latest per agent type for the "Overview" cards
                const uniqueAgents = ['Strategy Consultant', 'Risk Officer', 'Market Analyst'];
                const latest = uniqueAgents.map(type =>
                    decisions.find((d: any) => d.agentType === type) || null
                ).filter(Boolean);

                if (latest.length > 0) {
                    setLatestDecisions(latest);
                } else {
                    // Keep empty or show placeholder if no decisions ever made
                    setLatestDecisions([]);
                }
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
    }, []);

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

    if (loading && latestDecisions.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading Agents...</div>;
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">AI Agent Dashboard</h1>
                <p className="text-gray-400">View live agent reasoning and Chain-of-Thought analysis</p>
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
                                    <div className={`badge ${getDecisionColor(agent.decision)}`}>
                                        {agent.decision}
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
                                        <div className="text-gray-500 italic">No structured thought process steps available.</div>
                                    )}
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
