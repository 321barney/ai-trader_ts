/**
 * Performance Analytics Service
 * 
 * Calculates comprehensive portfolio performance metrics:
 * - Sharpe Ratio
 * - Maximum Drawdown
 * - Win Rate, Profit Factor
 * - Annualized Returns
 * - Sortino Ratio, Calmar Ratio
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
    // Returns
    totalReturn: number;          // Total percentage return
    annualizedReturn: number;     // Annualized return
    dailyReturns: number[];       // Array of daily returns

    // Risk Metrics
    sharpeRatio: number;          // Risk-adjusted return (vs risk-free rate)
    sortinoRatio: number;         // Downside risk-adjusted return
    calmarRatio: number;          // Return / Max Drawdown
    volatility: number;           // Standard deviation of returns

    // Drawdown
    maxDrawdown: number;          // Maximum peak-to-trough decline
    maxDrawdownDate: string;      // Date of max drawdown
    currentDrawdown: number;      // Current drawdown from peak

    // Win/Loss
    winRate: number;              // Percentage of winning trades
    profitFactor: number;         // Gross profit / Gross loss
    averageWin: number;           // Average winning trade
    averageLoss: number;          // Average losing trade
    largestWin: number;           // Largest single win
    largestLoss: number;          // Largest single loss

    // Trade Statistics
    totalTrades: number;          // Total number of trades
    winningTrades: number;        // Number of winning trades
    losingTrades: number;         // Number of losing trades
    averageHoldingPeriod: number; // Average days held

    // Benchmark Comparison
    benchmarkReturn?: number;     // Benchmark return (e.g., BTC, S&P500)
    alpha?: number;               // Excess return vs benchmark
    beta?: number;                // Correlation to benchmark
}

export interface TradeForAnalysis {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    pnl?: number;
    pnlPercent?: number;
    entryDate: Date;
    exitDate?: Date;
    status: string;
}

export interface DailySnapshot {
    date: string;
    portfolioValue: number;
    dailyReturn: number;
}

export class PerformanceService {
    private riskFreeRate: number = 0.05; // 5% annual risk-free rate

    /**
     * Calculate all performance metrics for a user's portfolio
     */
    async calculateMetrics(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<PerformanceMetrics> {
        // Fetch trades
        const trades = await this.fetchTrades(userId, startDate, endDate);

        // Calculate daily returns from trades
        const dailySnapshots = this.calculateDailySnapshots(trades, 10000); // Assuming $10k initial
        const dailyReturns = dailySnapshots.map(s => s.dailyReturn);

        // Core metrics
        const totalReturn = this.calculateTotalReturn(dailySnapshots);
        const annualizedReturn = this.annualizeReturn(totalReturn, dailySnapshots.length);
        const volatility = this.calculateVolatility(dailyReturns);

        // Risk-adjusted metrics
        const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
        const sortinoRatio = this.calculateSortinoRatio(dailyReturns);
        const { maxDrawdown, maxDrawdownDate, currentDrawdown } = this.calculateDrawdown(dailySnapshots);
        const calmarRatio = maxDrawdown !== 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0;

        // Trade statistics
        const {
            winRate, profitFactor, averageWin, averageLoss,
            largestWin, largestLoss, winningTrades, losingTrades,
            averageHoldingPeriod
        } = this.calculateTradeStats(trades);

        return {
            totalReturn,
            annualizedReturn,
            dailyReturns,
            sharpeRatio,
            sortinoRatio,
            calmarRatio,
            volatility,
            maxDrawdown,
            maxDrawdownDate,
            currentDrawdown,
            winRate,
            profitFactor,
            averageWin,
            averageLoss,
            largestWin,
            largestLoss,
            totalTrades: trades.length,
            winningTrades,
            losingTrades,
            averageHoldingPeriod,
        };
    }

    /**
     * Fetch trades from database
     */
    private async fetchTrades(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<TradeForAnalysis[]> {
        const where: any = { userId };

        if (startDate || endDate) {
            where.openedAt = {};
            if (startDate) where.openedAt.gte = startDate;
            if (endDate) where.openedAt.lte = endDate;
        }

        const trades = await prisma.trade.findMany({
            where,
            orderBy: { openedAt: 'asc' },
        });

        return trades.map(t => ({
            id: t.id,
            symbol: t.symbol,
            side: t.side as 'BUY' | 'SELL',
            quantity: t.quantity,
            price: t.entryPrice || 0,
            pnl: t.pnl || undefined,
            pnlPercent: t.pnlPercent || undefined,
            entryDate: t.openedAt,
            exitDate: t.closedAt || undefined,
            status: t.status,
        }));
    }

    /**
     * Calculate daily portfolio snapshots
     */
    private calculateDailySnapshots(
        trades: TradeForAnalysis[],
        initialCapital: number
    ): DailySnapshot[] {
        const snapshots: DailySnapshot[] = [];
        let portfolioValue = initialCapital;
        let previousValue = initialCapital;

        // Group trades by date
        const tradesByDate = new Map<string, TradeForAnalysis[]>();
        for (const trade of trades) {
            const dateKey = trade.entryDate.toISOString().split('T')[0];
            if (!tradesByDate.has(dateKey)) {
                tradesByDate.set(dateKey, []);
            }
            tradesByDate.get(dateKey)!.push(trade);
        }

        // Calculate daily returns
        const sortedDates = Array.from(tradesByDate.keys()).sort();
        for (const date of sortedDates) {
            const dayTrades = tradesByDate.get(date)!;
            const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

            portfolioValue += dayPnL;
            const dailyReturn = previousValue !== 0
                ? (portfolioValue - previousValue) / previousValue
                : 0;

            snapshots.push({
                date,
                portfolioValue,
                dailyReturn,
            });

            previousValue = portfolioValue;
        }

        return snapshots;
    }

    /**
     * Calculate total return
     */
    private calculateTotalReturn(snapshots: DailySnapshot[]): number {
        if (snapshots.length === 0) return 0;
        const initial = snapshots[0].portfolioValue;
        const final = snapshots[snapshots.length - 1].portfolioValue;
        return initial !== 0 ? ((final - initial) / initial) * 100 : 0;
    }

    /**
     * Annualize a return based on number of trading days
     */
    private annualizeReturn(totalReturn: number, tradingDays: number): number {
        if (tradingDays === 0) return 0;
        const yearsTraded = tradingDays / 252; // 252 trading days per year
        return ((1 + totalReturn / 100) ** (1 / yearsTraded) - 1) * 100;
    }

    /**
     * Calculate volatility (standard deviation of returns)
     */
    private calculateVolatility(dailyReturns: number[]): number {
        if (dailyReturns.length < 2) return 0;

        const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const squaredDiffs = dailyReturns.map(r => (r - mean) ** 2);
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (dailyReturns.length - 1);

        // Annualize volatility
        return Math.sqrt(variance) * Math.sqrt(252) * 100;
    }

    /**
     * Calculate Sharpe Ratio
     * (Return - Risk-Free Rate) / Volatility
     */
    private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
        if (volatility === 0) return 0;
        return (annualizedReturn - this.riskFreeRate * 100) / volatility;
    }

    /**
     * Calculate Sortino Ratio (downside deviation only)
     */
    private calculateSortinoRatio(dailyReturns: number[]): number {
        if (dailyReturns.length < 2) return 0;

        const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const negativeReturns = dailyReturns.filter(r => r < 0);

        if (negativeReturns.length === 0) return 999; // No downside

        const downsideDeviation = Math.sqrt(
            negativeReturns.reduce((sum, r) => sum + r ** 2, 0) / negativeReturns.length
        );

        const annualizedDownside = downsideDeviation * Math.sqrt(252);
        const annualizedMean = meanReturn * 252 * 100;

        return annualizedDownside !== 0
            ? (annualizedMean - this.riskFreeRate * 100) / (annualizedDownside * 100)
            : 0;
    }

    /**
     * Calculate maximum drawdown
     */
    private calculateDrawdown(snapshots: DailySnapshot[]): {
        maxDrawdown: number;
        maxDrawdownDate: string;
        currentDrawdown: number;
    } {
        if (snapshots.length === 0) {
            return { maxDrawdown: 0, maxDrawdownDate: '', currentDrawdown: 0 };
        }

        let peak = snapshots[0].portfolioValue;
        let maxDrawdown = 0;
        let maxDrawdownDate = snapshots[0].date;

        for (const snapshot of snapshots) {
            if (snapshot.portfolioValue > peak) {
                peak = snapshot.portfolioValue;
            }

            const drawdown = (peak - snapshot.portfolioValue) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                maxDrawdownDate = snapshot.date;
            }
        }

        // Current drawdown
        const currentValue = snapshots[snapshots.length - 1].portfolioValue;
        const currentDrawdown = (peak - currentValue) / peak;

        return {
            maxDrawdown: maxDrawdown * 100,
            maxDrawdownDate,
            currentDrawdown: currentDrawdown * 100,
        };
    }

    /**
     * Calculate trade statistics
     */
    private calculateTradeStats(trades: TradeForAnalysis[]): {
        winRate: number;
        profitFactor: number;
        averageWin: number;
        averageLoss: number;
        largestWin: number;
        largestLoss: number;
        winningTrades: number;
        losingTrades: number;
        averageHoldingPeriod: number;
    } {
        const closedTrades = trades.filter(t => t.pnl !== undefined);

        if (closedTrades.length === 0) {
            return {
                winRate: 0,
                profitFactor: 0,
                averageWin: 0,
                averageLoss: 0,
                largestWin: 0,
                largestLoss: 0,
                winningTrades: 0,
                losingTrades: 0,
                averageHoldingPeriod: 0,
            };
        }

        const winners = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losers = closedTrades.filter(t => (t.pnl || 0) < 0);

        const grossProfit = winners.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0));

        // Calculate holding periods
        let totalHoldingDays = 0;
        for (const trade of closedTrades) {
            if (trade.exitDate) {
                const holdingDays = (trade.exitDate.getTime() - trade.entryDate.getTime()) / (1000 * 60 * 60 * 24);
                totalHoldingDays += holdingDays;
            }
        }

        return {
            winRate: (winners.length / closedTrades.length) * 100,
            profitFactor: grossLoss !== 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
            averageWin: winners.length > 0 ? grossProfit / winners.length : 0,
            averageLoss: losers.length > 0 ? grossLoss / losers.length : 0,
            largestWin: winners.length > 0 ? Math.max(...winners.map(t => t.pnl || 0)) : 0,
            largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl || 0))) : 0,
            winningTrades: winners.length,
            losingTrades: losers.length,
            averageHoldingPeriod: closedTrades.length > 0 ? totalHoldingDays / closedTrades.length : 0,
        };
    }

    /**
     * Generate performance report for dashboard
     */
    async generateReport(userId: string): Promise<{
        metrics: PerformanceMetrics;
        summary: string;
        recommendations: string[];
    }> {
        const metrics = await this.calculateMetrics(userId);

        // Generate summary
        let summary = '';
        if (metrics.sharpeRatio > 2) {
            summary = 'Excellent risk-adjusted performance. Strategy is highly profitable with controlled risk.';
        } else if (metrics.sharpeRatio > 1) {
            summary = 'Good performance. Returns exceed risk-free rate with acceptable volatility.';
        } else if (metrics.sharpeRatio > 0) {
            summary = 'Moderate performance. Consider reducing position sizes or improving entry timing.';
        } else {
            summary = 'Underperforming. Strategy needs significant improvement.';
        }

        // Generate recommendations
        const recommendations: string[] = [];

        if (metrics.maxDrawdown > 20) {
            recommendations.push('Reduce position sizes to limit maximum drawdown below 20%');
        }
        if (metrics.winRate < 50 && metrics.profitFactor < 1.5) {
            recommendations.push('Improve entry criteria or widen profit targets');
        }
        if (metrics.averageLoss > metrics.averageWin) {
            recommendations.push('Implement tighter stop losses or wider take profits');
        }
        if (metrics.volatility > 30) {
            recommendations.push('Consider position sizing based on volatility (ATR-based)');
        }

        return { metrics, summary, recommendations };
    }
}

export const performanceService = new PerformanceService();
