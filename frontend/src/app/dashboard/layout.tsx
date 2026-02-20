"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import NotificationsBell from "@/components/NotificationsBell";
import ReportProblemModal from "@/components/ReportProblemModal";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mode, setMode] = useState<"test" | "live">("test");
    const [userEmail, setUserEmail] = useState("trader@example.com");
    const [showReportModal, setShowReportModal] = useState(false);

    useEffect(() => {
        const savedMode = localStorage.getItem("tradingMode") as "test" | "live";
        if (savedMode) setMode(savedMode);

        const token = api.getAccessToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.email) setUserEmail(payload.email);
            } catch { }
        }
    }, []);

    const handleModeChange = (newMode: "test" | "live") => {
        setMode(newMode);
        localStorage.setItem("tradingMode", newMode);
    };

    const navItems = [
        { href: "/dashboard", icon: "📊", label: "Overview" },
        { href: "/dashboard/strategy-lab", icon: "⚗️", label: "Strategy Lab" },
        { href: "/dashboard/backtest", icon: "🔬", label: "Backtest" },
        { href: "/dashboard/agents", icon: "🤖", label: "AI Agents" },
        { href: "/dashboard/performance", icon: "📈", label: "Performance" },
        { href: "/dashboard/risk", icon: "🛡️", label: "Risk" },
        { href: "/dashboard/history", icon: "📋", label: "History" },
        { href: "/dashboard/command", icon: "⚡", label: "Command" },
        { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex selection:bg-green-500/30">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0a0a0a] border-r border-gray-800/50 flex flex-col fixed h-full z-50 shadow-2xl shadow-black/50">
                {/* Logo */}
                <div className="p-6 border-b border-gray-800">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-11 h-11 flex items-center justify-center">
                            <div className="absolute inset-0 bg-green-500 rounded-lg rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20 blur-md"></div>
                            <div className="relative w-full h-full bg-gradient-to-br from-[#0a0a0a] to-[#141414] border border-gray-700 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <span className="text-xl">🛡️</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-bold text-white tracking-wide font-mono">CoTrader</span>
                            <div className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Institutional Intelligence</div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-green-500/10 text-green-400 shadow-lg shadow-green-900/30 border border-green-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent"
                                    }`}
                            >
                                <span className={`text-lg transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"} filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100`}>
                                    {item.icon}
                                </span>
                                <span className="font-mono tracking-tight">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Report Problem */}
                <div className="px-4 py-2 border-t border-slate-800/50 pt-4">
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-all w-full border border-transparent hover:border-slate-700"
                    >
                        <span>🐛</span>
                        <span>Report a Problem</span>
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-4 bg-[#020408]/30">
                    <div className="bg-[#0f172a] rounded-lg p-1 border border-slate-800">
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => handleModeChange("test")}
                                className={`relative py-2 px-3 rounded-md text-xs font-bold transition-all duration-300 font-mono ${mode === "test"
                                    ? "bg-emerald-500/10 text-emerald-400 shadow-inner border border-emerald-500/20"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${mode === "test" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-600"}`} />
                                    PAPER
                                </div>
                            </button>
                            <button
                                onClick={() => handleModeChange("live")}
                                className={`relative py-2 px-3 rounded-md text-xs font-bold transition-all duration-300 font-mono ${mode === "live"
                                    ? "bg-red-500/10 text-red-400 shadow-inner border border-red-500/20"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${mode === "live" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse" : "bg-slate-600"}`} />
                                    LIVE
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-800 relative bg-[#0b1121]">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-emerald-600 to-slate-700 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform font-mono text-sm">
                                {userEmail.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Trader</div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px] font-mono">{userEmail}</div>
                            </div>
                        </div>
                        <NotificationsBell />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 overflow-auto bg-[#020408] relative">
                {/* Top ambient glow */}
                <div className="absolute top-0 left-0 w-full h-96 bg-emerald-900/5 blur-[120px] pointer-events-none" />

                <div className="min-h-full relative z-10">
                    {children}
                </div>
            </main>

            {/* Report Problem Modal */}
            <ReportProblemModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
            />
        </div>
    );
}
