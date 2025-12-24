"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import NotificationsBell from "@/components/NotificationsBell";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mode, setMode] = useState<"test" | "live">("test");
    const [userEmail, setUserEmail] = useState("trader@example.com");

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
        <div className="min-h-screen bg-[#05050a] text-white flex selection:bg-indigo-500/30">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0a0a12]/80 backdrop-blur-xl border-r border-white/5 flex flex-col fixed h-full z-50">
                {/* Logo */}
                <div className="p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-500 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20 blur-md"></div>
                            <div className="relative w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                                    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.035.84-1.875 1.875-1.875h.75c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.035.84-1.875 1.875-1.875h.75c1.035 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">AI Trader</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded">Pro</span>
                                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Dashboard</span>
                            </div>
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
                                className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                        ? "bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <span className={`text-lg transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Mode Toggle */}
                <div className="p-4 border-t border-white/5 bg-[#0a0a12]/50">
                    <div className="bg-[#12121a] rounded-xl p-1 border border-white/5">
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => handleModeChange("test")}
                                className={`relative py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ${mode === "test"
                                        ? "bg-emerald-500/10 text-emerald-400 shadow-inner"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                    }`}
                            >
                                {mode === "test" && (
                                    <span className="absolute inset-0 border border-emerald-500/20 rounded-lg"></span>
                                )}
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${mode === "test" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-gray-600"}`} />
                                    PAPER
                                </div>
                            </button>
                            <button
                                onClick={() => handleModeChange("live")}
                                className={`relative py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 ${mode === "live"
                                        ? "bg-red-500/10 text-red-400 shadow-inner"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                    }`}
                            >
                                {mode === "live" && (
                                    <span className="absolute inset-0 border border-red-500/20 rounded-lg"></span>
                                )}
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${mode === "live" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse" : "bg-gray-600"}`} />
                                    LIVE
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-white/5 relative overflow-hidden">
                    {/* Background glow for profile */}
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                {userEmail.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Trader</div>
                                <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{userEmail}</div>
                            </div>
                        </div>
                        <NotificationsBell />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-72 overflow-auto bg-[#05050a] relative">
                {/* Top ambient glow */}
                <div className="absolute top-0 left-0 w-full h-96 bg-indigo-500/5 blur-[100px] pointer-events-none" />

                <div className="min-h-full relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
