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
        <div className="min-h-screen bg-[#080810] flex">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0c0c14] border-r border-white/5 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-white font-bold text-lg">AI</span>
                        </div>
                        <div>
                            <span className="text-xl font-bold text-white">Trader</span>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pro Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-l-2 border-indigo-500"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Mode Toggle */}
                <div className="p-4 border-t border-white/5">
                    <div className="bg-[#12121a] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Trading Mode</span>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${mode === "test"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${mode === "test" ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
                                {mode === "test" ? "PAPER" : "LIVE"}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleModeChange("test")}
                                className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${mode === "test"
                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                                    }`}
                            >
                                Paper
                            </button>
                            <button
                                onClick={() => handleModeChange("live")}
                                className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${mode === "live"
                                    ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                                    }`}
                            >
                                Live
                            </button>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                                {userEmail.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">Trader</div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px]">{userEmail}</div>
                            </div>
                        </div>
                        <NotificationsBell />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#080810]">
                <div className="min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
