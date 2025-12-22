"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mode, setMode] = useState<"test" | "live">("test");
    const [userName, setUserName] = useState("Trader");
    const [userEmail, setUserEmail] = useState("trader@example.com");

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem("tradingMode") as "test" | "live";
        if (savedMode) setMode(savedMode);

        // Try to get user info
        const token = localStorage.getItem("token");
        if (token) {
            // Decode JWT to get user info (basic decode, not verification)
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
        { href: "/dashboard/market", icon: "🌐", label: "Market Intel" },
        { href: "/dashboard/agents", icon: "🤖", label: "AI Agents" },
        { href: "/dashboard/backtest", icon: "⏪", label: "Backtest" },
        { href: "/dashboard/analytics", icon: "📈", label: "Analytics" },
        { href: "/dashboard/signals", icon: "📡", label: "Signals" },
        { href: "/dashboard/pnl", icon: "💹", label: "PnL" },
        { href: "/dashboard/history", icon: "📜", label: "History" },
        { href: "/dashboard/dev", icon: "🔧", label: "Dev Area" },
        { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 p-6 flex flex-col">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">AI</span>
                    </div>
                    <span className="text-xl font-bold text-white">Trader</span>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Mode Toggle */}
                <div className="border-t border-white/5 pt-6 mt-6">
                    <div className="bg-[#12121a] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-400">Mode</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${mode === "test"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}>
                                {mode === "test" ? "TEST" : "LIVE"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleModeChange("test")}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === "test"
                                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                        : "text-gray-500 hover:bg-white/5"
                                    }`}
                            >
                                Test
                            </button>
                            <button
                                onClick={() => handleModeChange("live")}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === "live"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "text-gray-500 hover:bg-white/5"
                                    }`}
                            >
                                Live
                            </button>
                        </div>
                    </div>
                </div>

                {/* User */}
                <div className="border-t border-white/5 pt-6 mt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                            {userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Trader</div>
                            <div className="text-xs text-gray-500 truncate max-w-[140px]">{userEmail}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}

