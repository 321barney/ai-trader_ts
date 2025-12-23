"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface SystemStatus {
    rl: { available: boolean; training: boolean };
    scheduler: { running: boolean };
    activeModel: any;
}

export default function CommandCentrePage() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            const [rlRes, modelRes] = await Promise.all([
                fetch(`${API_BASE}/api/agents/rl/status`, { headers }).catch(() => null),
                fetch(`${API_BASE}/api/models/active`, { headers }).catch(() => null)
            ]);

            const rlData = rlRes?.ok ? await rlRes.json() : { data: { available: false } };
            const modelData = modelRes?.ok ? await modelRes.json() : { data: null };

            setStatus({
                rl: { available: rlData.data?.available || false, training: rlData.data?.training?.isTraining || false },
                scheduler: { running: true },
                activeModel: modelData.data
            });
        } catch (err) {
            console.error('Status fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const executeAction = async (action: string, endpoint: string, method = 'POST') => {
        setActionLoading(action);
        try {
            const token = api.getAccessToken();
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                alert(`${action} completed successfully!`);
                fetchStatus();
            } else {
                alert(`Failed: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const actions = [
        { id: 'analyze', label: 'Run Market Analysis', icon: '🔍', endpoint: '/api/trading/analyze', color: 'indigo' },
        { id: 'signals', label: 'Generate Signals', icon: '📡', endpoint: '/api/signals/generate', color: 'green' },
        { id: 'retrain', label: 'Retrain RL Model', icon: '🔄', endpoint: '/api/rl/train', color: 'purple' },
        { id: 'stop-rl', label: 'Stop RL Model', icon: '⏹️', endpoint: '/api/rl/stop', color: 'red' },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">🎮 Command Centre</h1>
                <p className="text-gray-400">Quick actions and system controls</p>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* RL Status */}
                <div className="card glass">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${status?.rl?.available ? 'bg-green-500/20' : 'bg-gray-500/20'
                            }`}>
                            🤖
                        </div>
                        <div>
                            <div className="text-white font-bold">RL Model</div>
                            <div className={`text-sm ${status?.rl?.available ? 'text-green-400' : 'text-gray-500'}`}>
                                {status?.rl?.training ? 'Training...' : status?.rl?.available ? 'Active' : 'Offline'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scheduler Status */}
                <div className="card glass">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl">
                            ⏰
                        </div>
                        <div>
                            <div className="text-white font-bold">Scheduler</div>
                            <div className="text-green-400 text-sm">4h Analysis Active</div>
                        </div>
                    </div>
                </div>

                {/* Active Model */}
                <div className="card glass">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-2xl">
                            🧠
                        </div>
                        <div>
                            <div className="text-white font-bold">Active Model</div>
                            <div className="text-sm text-gray-400">
                                {status?.activeModel ? `v${status.activeModel.version} - ${status.activeModel.methodology}` : 'None'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {actions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => executeAction(action.label, action.endpoint)}
                            disabled={actionLoading === action.id}
                            className={`p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center ${actionLoading === action.id ? 'opacity-50' : ''
                                }`}
                        >
                            <div className="text-4xl mb-3">{action.icon}</div>
                            <div className="text-white font-medium">{action.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* API Endpoints Reference */}
            <div className="card glass">
                <h2 className="text-xl font-bold text-white mb-4">📋 Available Endpoints</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <div className="text-indigo-400 font-bold">Models</div>
                        <code className="block p-2 bg-white/5 rounded">GET /api/models</code>
                        <code className="block p-2 bg-white/5 rounded">POST /api/models/:id/backtest</code>
                        <code className="block p-2 bg-white/5 rounded">POST /api/models/:id/activate</code>
                    </div>
                    <div className="space-y-2">
                        <div className="text-green-400 font-bold">Trading</div>
                        <code className="block p-2 bg-white/5 rounded">POST /api/trading/analyze</code>
                        <code className="block p-2 bg-white/5 rounded">GET /api/signals</code>
                        <code className="block p-2 bg-white/5 rounded">GET /api/agents/decisions</code>
                    </div>
                </div>
            </div>
        </div>
    );
}
