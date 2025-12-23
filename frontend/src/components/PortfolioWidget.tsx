"use client";

import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";

interface PortfolioData {
    totalEquity: number;
    availableBalance: number;
    usedMargin: number;
    unrealizedPnl: number;
    realizedPnlToday: number;
    totalExposure: number;
    exposurePercent: number;
    positions: any[];
    assetAllocation: any[];
}

interface RiskStatus {
    withinLimits: boolean;
    currentDrawdown: number;
    dailyPnl: number;
    openPositions: number;
    exposurePercent: number;
    violations: string[];
}

export default function PortfolioWidget() {
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [risk, setRisk] = useState<RiskStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = api.getAccessToken();
            if (!token) return;

            const [portfolioRes, riskRes] = await Promise.all([
                fetch(`${API_BASE}/api/portfolio`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/portfolio/risk`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const portfolioData = await portfolioRes.json();
            const riskData = await riskRes.json();

            if (portfolioData.success) setPortfolio(portfolioData.data);
            if (riskData.success) setRisk(riskData.data);
        } catch (error) {
            console.error("Failed to fetch portfolio:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="card glass animate-pulse">
                <div className="h-48 bg-white/5 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="card glass">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>💰</span> Portfolio Overview
                </h3>
                {risk && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${risk.withinLimits
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                        {risk.withinLimits ? '✓ Risk OK' : '⚠ Risk Alert'}
                    </div>
                )}
            </div>

            {portfolio && (
                <>
                    {/* Equity */}
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 mb-4">
                        <div className="text-sm text-gray-400 mb-1">Total Equity</div>
                        <div className="text-3xl font-bold text-white">
                            ${portfolio.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`text-sm mt-1 ${portfolio.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {portfolio.unrealizedPnl >= 0 ? '+' : ''}${portfolio.unrealizedPnl.toFixed(2)} unrealized
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Available</div>
                            <div className="text-lg font-semibold text-white">
                                ${portfolio.availableBalance.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Margin Used</div>
                            <div className="text-lg font-semibold text-white">
                                ${portfolio.usedMargin.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Today's P/L</div>
                            <div className={`text-lg font-semibold ${portfolio.realizedPnlToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {portfolio.realizedPnlToday >= 0 ? '+' : ''}${portfolio.realizedPnlToday.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-gray-500">Exposure</div>
                            <div className="text-lg font-semibold text-white">
                                {portfolio.exposurePercent.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Risk Indicators */}
                    {risk && (
                        <div className="border-t border-white/10 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-400">Drawdown</span>
                                <span className={`text-sm font-medium ${risk.currentDrawdown > 10 ? 'text-red-400' :
                                        risk.currentDrawdown > 5 ? 'text-yellow-400' : 'text-green-400'
                                    }`}>
                                    {risk.currentDrawdown.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${risk.currentDrawdown > 10 ? 'bg-red-500' :
                                            risk.currentDrawdown > 5 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${Math.min(risk.currentDrawdown * 5, 100)}%` }}
                                ></div>
                            </div>

                            {/* Violations */}
                            {risk.violations.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {risk.violations.map((v, i) => (
                                        <div key={i} className="text-xs text-red-400 flex items-center gap-1">
                                            <span>⚠️</span> {v}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
