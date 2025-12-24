/**
 * Portfolio Aggregation Service
 * 
 * Multi-asset portfolio view:
 * - Total equity calculation
 * - Exposure metrics
 * - Correlation analysis
 */

import { prisma } from '../utils/prisma.js';
import { AsterService } from './aster.service.js';

const db = prisma as any;

export interface PortfolioSummary {
    totalEquity: number;
    availableBalance: number;
    usedMargin: number;
    unrealizedPnl: number;
    realizedPnlToday: number;
    totalExposure: number;
    exposurePercent: number;
    positions: PositionSummary[];
    assetAllocation: AssetAllocation[];
}

export interface PositionSummary {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    weight: number; // % of portfolio
}

export interface AssetAllocation {
    asset: string;
    value: number;
    percent: number;
}

class PortfolioService {
    /**
     * Get full portfolio summary
     */
    async getSummary(userId: string): Promise<PortfolioSummary> {
        try {
            // Get user credentials
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { asterApiKey: true, asterApiSecret: true }
            });

            if (!user?.asterApiKey || !user?.asterApiSecret) {
                // User hasn't configured API keys yet
                return this.getEmptySummary();
            }

            // Create user-specific AsterService instance
            const userAsterService = new AsterService(
                user.asterApiKey,
                user.asterApiSecret
            );

            // Get user's balances from exchange
            const balances = await userAsterService.getBalance();

            // Get open positions
            const openPositions = await db.position.findMany({
                where: { userId, status: 'OPEN' }
            });

            // Calculate total equity
            const totalBalance = balances.reduce((sum: number, b: any) => sum + b.total, 0);
            const availableBalance = balances.reduce((sum: number, b: any) => sum + b.available, 0);
            const usedMargin = totalBalance - availableBalance;

            // Calculate position values and PnL
            let unrealizedPnl = 0;
            let totalExposure = 0;
            const positionSummaries: PositionSummary[] = [];

            for (const pos of openPositions) {
                const currentPrice = await userAsterService.getPrice(pos.symbol).catch(() => pos.entryPrice);
                const positionValue = pos.size * currentPrice;
                const entryValue = pos.size * pos.entryPrice;

                const pnl = pos.side === 'LONG'
                    ? positionValue - entryValue
                    : entryValue - positionValue;
                const pnlPercent = (pnl / entryValue) * 100;

                unrealizedPnl += pnl;
                totalExposure += positionValue;

                positionSummaries.push({
                    symbol: pos.symbol,
                    side: pos.side,
                    size: pos.size,
                    value: positionValue,
                    pnl,
                    pnlPercent,
                    weight: 0 // Will calculate after
                });
            }

            // Calculate weights
            positionSummaries.forEach(p => {
                p.weight = totalExposure > 0 ? (p.value / totalExposure) * 100 : 0;
            });

            // Get today's realized PnL
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const realizedToday = await db.position.aggregate({
                where: {
                    userId,
                    status: 'CLOSED',
                    closedAt: { gte: today }
                },
                _sum: { realizedPnl: true }
            });

            // Asset allocation from balances
            const assetAllocation: AssetAllocation[] = balances
                .filter((b: any) => b.total > 0)
                .map((b: any) => ({
                    asset: b.asset,
                    value: b.total,
                    percent: (b.total / totalBalance) * 100
                }));

            return {
                totalEquity: totalBalance + unrealizedPnl,
                availableBalance,
                usedMargin,
                unrealizedPnl,
                realizedPnlToday: realizedToday._sum?.realizedPnl || 0,
                totalExposure,
                exposurePercent: totalBalance > 0 ? (totalExposure / totalBalance) * 100 : 0,
                positions: positionSummaries,
                assetAllocation
            };
        } catch (error) {
            console.error('[Portfolio] Error getting summary:', error);
            return this.getEmptySummary();
        }
    }

    private getEmptySummary(): PortfolioSummary {
        return {
            totalEquity: 0,
            availableBalance: 0,
            usedMargin: 0,
            unrealizedPnl: 0,
            realizedPnlToday: 0,
            totalExposure: 0,
            exposurePercent: 0,
            positions: [],
            assetAllocation: []
        };
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(userId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const closedPositions = await db.position.findMany({
            where: {
                userId,
                status: 'CLOSED',
                closedAt: { gte: startDate }
            },
            orderBy: { closedAt: 'asc' }
        });

        const totalTrades = closedPositions.length;
        const winningTrades = closedPositions.filter((p: any) => p.realizedPnl > 0).length;
        const totalPnl = closedPositions.reduce((sum: number, p: any) => sum + (p.realizedPnl || 0), 0);

        const wins = closedPositions.filter((p: any) => p.realizedPnl > 0);
        const avgWin = wins.length > 0 ? wins.reduce((sum: number, p: any) => sum + p.realizedPnl, 0) / wins.length : 0;

        const losses = closedPositions.filter((p: any) => p.realizedPnl < 0);
        const avgLoss = losses.length > 0 ? losses.reduce((sum: number, p: any) => sum + p.realizedPnl, 0) / losses.length : 0;

        return {
            totalTrades,
            winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
            totalPnl,
            avgWin,
            avgLoss,
            profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
            expectancy: totalTrades > 0 ? totalPnl / totalTrades : 0
        };
    }
}

export const portfolioService = new PortfolioService();
