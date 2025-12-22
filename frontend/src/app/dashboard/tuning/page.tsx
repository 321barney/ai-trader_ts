"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";

export default function TuningPage() {
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

                {/* Agent Performance (Placeholder for future fine-tuning) */}
                <div className="card glass opacity-75">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🎛️</span> Fine-Tuning (Coming Soon)
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Advanced prompt engineering and parameter tuning will be available here.
                    </p>
                    <div className="space-y-4 pointer-events-none grayscale">
                        <div>
                            <label className="text-gray-500 font-medium block mb-2">Risk Tolerance</label>
                            <input type="range" className="w-full accent-indigo-500" disabled />
                        </div>
                        <div>
                            <label className="text-gray-500 font-medium block mb-2">Analysis Depth</label>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded bg-white/5 text-gray-600 border border-white/5">Fast</span>
                                <span className="px-3 py-1 rounded bg-white/5 text-gray-600 border border-white/5">Balanced</span>
                                <span className="px-3 py-1 rounded bg-white/5 text-gray-600 border border-white/5">Deep</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
