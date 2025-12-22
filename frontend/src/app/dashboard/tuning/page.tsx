"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

export default function TuningPage() {
    // Context Management State
    const [resetting, setResetting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // RL Parameters State
    const [rlParams, setRlParams] = useState({
        learning_rate: 0.0003,
        gamma: 0.99,
        batch_size: 64
    });
    const [savingParams, setSavingParams] = useState(false);

    const handleResetStrategy = async () => {
        if (!confirm("Are you sure you want to reset the strategy memory? This will clear all agent decision history.")) {
            return;
        }

        setResetting(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/agents/reset`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: "Strategy memory reset successfully. Agents will start fresh." });
            } else {
                setMessage({ type: 'error', text: data.error || "Failed to reset strategy" });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setResetting(false);
        }
    };

    const handleSaveParams = async () => {
        setSavingParams(true);
        setMessage(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/agents/rl/params`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(rlParams)
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: "RL parameters updated successfully." });
            } else {
                setMessage({ type: 'error', text: data.error || "Failed to update parameters" });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSavingParams(false);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Agent Tuning</h1>
                <p className="text-gray-400">Fine-tune agent behavior and manage strategy context</p>
            </div>

            {message && (
                <div className={`mb-6 px-4 py-3 rounded-lg border ${message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Context Management */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🔄</span> Context Management
                    </h2>

                    <div className="space-y-4">
                        <p className="text-gray-300 text-sm">
                            Agents build context over time based on past decisions. If you change agent roles or significant configuration,
                            it is recommended to reset this memory to ensure fresh analysis.
                        </p>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <h3 className="text-yellow-400 font-medium mb-1">Warning</h3>
                            <p className="text-yellow-400/80 text-xs">
                                This action is irreversible. It will wipe all historical decision data used for context.
                                Defined settings and balances will strictly remain safe.
                            </p>
                        </div>

                        <button
                            onClick={handleResetStrategy}
                            disabled={resetting}
                            className="w-full btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
                        >
                            {resetting ? 'Resetting...' : 'Reset Strategy Memory'}
                        </button>
                    </div>
                </div>

                {/* Agent Performance / RL Tuning */}
                <div className="card glass">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🎛️</span> Strategy Hyperparameters
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Adjust internal reinforcement learning parameters effectively altering how the agent learns and adapts.
                    </p>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300 font-medium">Learning Rate (Alpha)</label>
                                <span className="text-indigo-400 font-mono text-sm">{rlParams.learning_rate}</span>
                            </div>
                            <input
                                type="range"
                                min="0.0001"
                                max="0.01"
                                step="0.0001"
                                value={rlParams.learning_rate}
                                onChange={(e) => setRlParams({ ...rlParams, learning_rate: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lower values mean slower but more stable learning. (Default: 0.0003)</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300 font-medium">Discount Factor (Gamma)</label>
                                <span className="text-indigo-400 font-mono text-sm">{rlParams.gamma}</span>
                            </div>
                            <input
                                type="range"
                                min="0.90"
                                max="0.999"
                                step="0.001"
                                value={rlParams.gamma}
                                onChange={(e) => setRlParams({ ...rlParams, gamma: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">Importance of future rewards vs immediate ones. (Default: 0.99)</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-300 font-medium">Batch Size</label>
                                <span className="text-indigo-400 font-mono text-sm">{rlParams.batch_size}</span>
                            </div>
                            <input
                                type="range"
                                min="32"
                                max="512"
                                step="32"
                                value={rlParams.batch_size}
                                onChange={(e) => setRlParams({ ...rlParams, batch_size: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">Number of samples used per training update. (Default: 64)</p>
                        </div>

                        <button
                            onClick={handleSaveParams}
                            disabled={savingParams}
                            className="w-full btn-primary mt-4"
                        >
                            {savingParams ? 'Saving...' : 'Apply Parameters'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
