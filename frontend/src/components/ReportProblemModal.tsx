"use client";

import { useState } from "react";

interface ReportProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROBLEM_TYPES = [
    { id: "login", label: "🔐 Login/Authentication Issues" },
    { id: "trading", label: "📊 Trading Not Working" },
    { id: "signals", label: "📡 Signals Not Generating" },
    { id: "payment", label: "💳 Payment/Subscription Issue" },
    { id: "backtest", label: "🔬 Backtest Problems" },
    { id: "api", label: "🔗 API Connection Errors" },
    { id: "ui", label: "🎨 UI/Display Bug" },
    { id: "slow", label: "🐌 Slow Performance" },
    { id: "other", label: "❓ Other" },
];

export default function ReportProblemModal({ isOpen, onClose }: ReportProblemModalProps) {
    const [selectedType, setSelectedType] = useState<string>("");
    const [description, setDescription] = useState("");
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        const problemLabel = PROBLEM_TYPES.find(p => p.id === selectedType)?.label || selectedType;
        const subject = encodeURIComponent(`AISTER Bug Report: ${problemLabel}`);
        const body = encodeURIComponent(
            `Problem Type: ${problemLabel}\n\n` +
            `Description:\n${description}\n\n` +
            `---\n` +
            `Browser: ${navigator.userAgent}\n` +
            `URL: ${window.location.href}\n` +
            `Time: ${new Date().toISOString()}`
        );

        window.location.href = `mailto:barnros89@gmail.com?subject=${subject}&body=${body}`;
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🐛</span> Report a Problem
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Problem Type Selection */}
                <div className="space-y-2 mb-4">
                    <label className="text-sm text-gray-400">What's the issue?</label>
                    <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {PROBLEM_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`text-left px-4 py-2.5 rounded-xl text-sm transition-all ${selectedType === type.id
                                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                        : "bg-white/5 text-gray-300 border border-transparent hover:bg-white/10"
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2 mb-6">
                    <label className="text-sm text-gray-400">
                        {selectedType === "other" ? "Describe the problem *" : "Additional details (optional)"}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us what happened..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedType || (selectedType === "other" && !description.trim())}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Send Report
                    </button>
                </div>
            </div>
        </div>
    );
}
