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
    { id: "signals", label: "📡 Signals Not Generating" },
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
        const subject = encodeURIComponent(`CoTrader Bug Report: ${problemLabel}`);
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
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0b1121] border border-slate-700/50 rounded-lg p-6 w-full max-w-md shadow-2xl shadow-black/50 ring-1 ring-white/5">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wide">
                        <span className="filter grayscale">🐛</span> Report a Problem
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Problem Type Selection */}
                <div className="space-y-2 mb-4">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">What's the issue?</label>
                    <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {PROBLEM_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`text-left px-4 py-2.5 rounded-lg text-sm transition-all font-medium border ${selectedType === type.id
                                    ? "bg-blue-600/10 text-blue-400 border-blue-500/30"
                                    : "bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2 mb-6">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {selectedType === "other" ? "Describe the problem *" : "Additional details (optional)"}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us what happened..."
                        rows={3}
                        className="w-full bg-black/20 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedType || (selectedType === "other" && !description.trim())}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm uppercase tracking-wide"
                    >
                        Send Report
                    </button>
                </div>
            </div>
        </div>
    );
}
