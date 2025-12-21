/**
 * Post-Trade Analysis Service
 * 
 * Provides automatic analysis after each trade:
 * - Entry/exit efficiency
 * - Slippage tracking
 * - Holding period analysis
 * - Trade attribution
 * - Pattern recognition
 */

import { prisma } from '../utils/prisma.js';


// Dynamic import helper
let jinaService: any = null;
async function getJinaService() {
    if (!jinaService) {
        const module = await import('./jina-search.service.js');
        jinaService = module.jinaSearchService;
    }
    return jinaService;
}

export interface TradeAnalysis {
    tradeId: string;
    symbol: string;
    side: 'BUY' | 'SELL';

    // Price efficiency
    entryEfficiency: number;      // How close to optimal entry (%)
    exitEfficiency: number;       // How close to optimal exit (%)
    slippage: number;             // Entry slippage in basis points

    // Timing
    holdingPeriod: number;        // Days held
    optimalHoldingPeriod: number; // What holding period would have been optimal
    exitTiming: 'early' | 'optimal' | 'late';

    // P/L
    pnl: number;
    pnlPercent: number;
    maxPotentialProfit: number;   // Max profit during hold
    capturedProfitPercent: number; // % of max potential captured

    // Risk
    maxDrawdownDuringHold: number;
    riskRewardAchieved: number;

    // Context
    marketCondition: 'trending' | 'ranging' | 'volatile';
    tradeCategory: 'momentum' | 'reversal' | 'breakout' | 'mean_reversion' | 'unknown';

    // Recommendations
    improvements: string[];
}

export interface TradeForPostAnalysis {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    entryDate: Date;
    exitDate: Date;
    pnl: number;
    reasoning?: string;
}

export interface HistoricalPriceData {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class PostTradeAnalysisService {
    /**
     * Analyze a completed trade
     */
    async analyzeTrade(trade: TradeForPostAnalysis): Promise<TradeAnalysis> {
        // Fetch price history during the trade
        const priceHistory = await this.fetchPriceHistory(
            trade.symbol,
            trade.entryDate,
            trade.exitDate
        );

        // Calculate efficiencies
        const { entryEfficiency, exitEfficiency, slippage } = this.calculateEfficiency(
            trade,
            priceHistory
        );

        // Calculate timing analysis
        const holdingPeriod = this.calculateHoldingPeriod(trade.entryDate, trade.exitDate);
        const { optimalHoldingPeriod, exitTiming } = this.analyzeExitTiming(trade, priceHistory);

        // Calculate profit metrics
        const maxPotentialProfit = this.calculateMaxPotentialProfit(trade, priceHistory);
        const capturedProfitPercent = maxPotentialProfit !== 0
            ? (trade.pnl / maxPotentialProfit) * 100
            : 0;

        // Calculate risk metrics
        const maxDrawdownDuringHold = this.calculateMaxDrawdown(trade, priceHistory);
        const riskRewardAchieved = maxDrawdownDuringHold !== 0
            ? trade.pnl / maxDrawdownDuringHold
            : trade.pnl > 0 ? 999 : 0;

        // Determine market condition
        const marketCondition = this.determineMarketCondition(priceHistory);

        // Categorize trade
        const tradeCategory = this.categorizeTradeStyle(trade, priceHistory);

        // Generate improvements
        const improvements = this.generateImprovements(
            trade,
            entryEfficiency,
            exitEfficiency,
            exitTiming,
            capturedProfitPercent,
            marketCondition
        );

        return {
            tradeId: trade.id,
            symbol: trade.symbol,
            side: trade.side,
            entryEfficiency,
            exitEfficiency,
            slippage,
            holdingPeriod,
            optimalHoldingPeriod,
            exitTiming,
            pnl: trade.pnl,
            pnlPercent: ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.side === 'BUY' ? 1 : -1),
            maxPotentialProfit,
            capturedProfitPercent,
            maxDrawdownDuringHold,
            riskRewardAchieved,
            marketCondition,
            tradeCategory,
            improvements,
        };
    }

    /**
     * Analyze multiple trades for patterns
     */
    async analyzeTradePatterns(trades: TradeForPostAnalysis[]): Promise<{
        bestPerforming: { condition: string; avgPnl: number }[];
        worstPerforming: { condition: string; avgPnl: number }[];
        recommendations: string[];
    }> {
        const analyses: TradeAnalysis[] = [];

        for (const trade of trades) {
            try {
                const analysis = await this.analyzeTrade(trade);
                analyses.push(analysis);
            } catch (e) {
                // Skip failed analyses
            }
        }

        // Group by market condition
        const byCondition = new Map<string, TradeAnalysis[]>();
        for (const a of analyses) {
            const key = a.marketCondition;
            if (!byCondition.has(key)) byCondition.set(key, []);
            byCondition.get(key)!.push(a);
        }

        // Calculate average P/L per condition
        const conditionPerformance = Array.from(byCondition.entries()).map(([condition, trades]) => ({
            condition,
            avgPnl: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
            count: trades.length,
        }));

        // Sort by performance
        conditionPerformance.sort((a, b) => b.avgPnl - a.avgPnl);

        const bestPerforming = conditionPerformance.slice(0, 2).map(c => ({
            condition: c.condition,
            avgPnl: c.avgPnl,
        }));

        const worstPerforming = conditionPerformance.slice(-2).map(c => ({
            condition: c.condition,
            avgPnl: c.avgPnl,
        }));

        // Generate recommendations
        const recommendations: string[] = [];

        // Analyze early vs late exits
        const earlyExits = analyses.filter(a => a.exitTiming === 'early');
        const lateExits = analyses.filter(a => a.exitTiming === 'late');

        if (earlyExits.length > analyses.length * 0.3) {
            recommendations.push('Consider wider take-profit targets - 30%+ of trades exited early');
        }
        if (lateExits.length > analyses.length * 0.3) {
            recommendations.push('Consider trailing stops - 30%+ of trades gave back profits before exit');
        }

        // Analyze captured profit
        const avgCaptured = analyses.reduce((sum, a) => sum + a.capturedProfitPercent, 0) / analyses.length;
        if (avgCaptured < 50) {
            recommendations.push(`Only capturing ${avgCaptured.toFixed(0)}% of potential profits - review exit strategy`);
        }

        // Analyze entry efficiency
        const avgEntryEff = analyses.reduce((sum, a) => sum + a.entryEfficiency, 0) / analyses.length;
        if (avgEntryEff < 70) {
            recommendations.push(`Entry efficiency at ${avgEntryEff.toFixed(0)}% - consider limit orders or better entry criteria`);
        }

        return {
            bestPerforming,
            worstPerforming,
            recommendations,
        };
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    private async fetchPriceHistory(
        symbol: string,
        startDate: Date,
        endDate: Date
    ): Promise<HistoricalPriceData[]> {
        // Add buffer days before and after
        const bufferStart = new Date(startDate);
        bufferStart.setDate(bufferStart.getDate() - 5);
        const bufferEnd = new Date(endDate);
        bufferEnd.setDate(bufferEnd.getDate() + 5);

        // Try to fetch real price data from AsterDex
        try {
            const { asterService } = await import('./aster.service.js');

            // Calculate number of days needed
            const daysDiff = Math.ceil((bufferEnd.getTime() - bufferStart.getTime()) / (1000 * 60 * 60 * 24));
            const limit = Math.min(daysDiff + 1, 500); // API limit

            // Fetch daily klines
            const klines = await asterService.getKlines(symbol, '1d', limit);

            // Convert to HistoricalPriceData format
            const priceData: HistoricalPriceData[] = klines.map(k => ({
                date: new Date(k.openTime),
                open: k.open,
                high: k.high,
                low: k.low,
                close: k.close,
                volume: k.volume,
            }));

            // Filter to date range
            return priceData.filter(p =>
                p.date >= bufferStart && p.date <= bufferEnd
            );
        } catch (error) {
            console.warn('[PostTradeAnalysis] Failed to fetch real price data, using mock:', error);
            // Fallback to mock data if API fails
            return this.generateMockPriceHistory(symbol, bufferStart, bufferEnd);
        }
    }

    private calculateEfficiency(
        trade: TradeForPostAnalysis,
        priceHistory: HistoricalPriceData[]
    ): { entryEfficiency: number; exitEfficiency: number; slippage: number } {
        if (priceHistory.length === 0) {
            return { entryEfficiency: 100, exitEfficiency: 100, slippage: 0 };
        }

        // Find the price range during entry day
        const entryDayPrice = priceHistory.find(
            p => p.date.toDateString() === trade.entryDate.toDateString()
        );

        // Find the price range during exit day
        const exitDayPrice = priceHistory.find(
            p => p.date.toDateString() === trade.exitDate.toDateString()
        );

        let entryEfficiency = 100;
        let exitEfficiency = 100;

        if (entryDayPrice) {
            const range = entryDayPrice.high - entryDayPrice.low;
            if (range > 0) {
                if (trade.side === 'BUY') {
                    // For buys, lower is better
                    entryEfficiency = 100 - ((trade.entryPrice - entryDayPrice.low) / range) * 100;
                } else {
                    // For sells, higher is better
                    entryEfficiency = ((trade.entryPrice - entryDayPrice.low) / range) * 100;
                }
            }
        }

        if (exitDayPrice) {
            const range = exitDayPrice.high - exitDayPrice.low;
            if (range > 0) {
                if (trade.side === 'BUY') {
                    // For long exits, higher is better
                    exitEfficiency = ((trade.exitPrice - exitDayPrice.low) / range) * 100;
                } else {
                    // For short exits, lower is better
                    exitEfficiency = 100 - ((trade.exitPrice - exitDayPrice.low) / range) * 100;
                }
            }
        }

        // Calculate slippage (simplified)
        const slippage = entryDayPrice
            ? Math.abs(trade.entryPrice - entryDayPrice.open) / entryDayPrice.open * 10000 // basis points
            : 0;

        return {
            entryEfficiency: Math.max(0, Math.min(100, entryEfficiency)),
            exitEfficiency: Math.max(0, Math.min(100, exitEfficiency)),
            slippage: Math.round(slippage * 100) / 100,
        };
    }

    private calculateHoldingPeriod(entryDate: Date, exitDate: Date): number {
        const diffTime = Math.abs(exitDate.getTime() - entryDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private analyzeExitTiming(
        trade: TradeForPostAnalysis,
        priceHistory: HistoricalPriceData[]
    ): { optimalHoldingPeriod: number; exitTiming: 'early' | 'optimal' | 'late' } {
        const holdDates = priceHistory.filter(
            p => p.date >= trade.entryDate && p.date <= trade.exitDate
        );

        if (holdDates.length === 0) {
            return { optimalHoldingPeriod: 0, exitTiming: 'optimal' };
        }

        // Find optimal exit point
        let optimalPrice: number;
        let optimalIndex: number;

        if (trade.side === 'BUY') {
            // For longs, find highest price
            optimalPrice = Math.max(...holdDates.map(p => p.high));
            optimalIndex = holdDates.findIndex(p => p.high === optimalPrice);
        } else {
            // For shorts, find lowest price
            optimalPrice = Math.min(...holdDates.map(p => p.low));
            optimalIndex = holdDates.findIndex(p => p.low === optimalPrice);
        }

        const actualExitIndex = holdDates.length - 1;
        const optimalHoldingPeriod = optimalIndex + 1;

        // Determine if exit was early, optimal, or late
        const tolerance = Math.max(1, holdDates.length * 0.1); // 10% tolerance
        let exitTiming: 'early' | 'optimal' | 'late';

        if (actualExitIndex < optimalIndex - tolerance) {
            exitTiming = 'early';
        } else if (actualExitIndex > optimalIndex + tolerance) {
            exitTiming = 'late';
        } else {
            exitTiming = 'optimal';
        }

        return { optimalHoldingPeriod, exitTiming };
    }

    private calculateMaxPotentialProfit(
        trade: TradeForPostAnalysis,
        priceHistory: HistoricalPriceData[]
    ): number {
        const holdDates = priceHistory.filter(
            p => p.date >= trade.entryDate && p.date <= trade.exitDate
        );

        if (holdDates.length === 0) return trade.pnl;

        if (trade.side === 'BUY') {
            const maxPrice = Math.max(...holdDates.map(p => p.high));
            return (maxPrice - trade.entryPrice) * trade.quantity;
        } else {
            const minPrice = Math.min(...holdDates.map(p => p.low));
            return (trade.entryPrice - minPrice) * trade.quantity;
        }
    }

    private calculateMaxDrawdown(
        trade: TradeForPostAnalysis,
        priceHistory: HistoricalPriceData[]
    ): number {
        const holdDates = priceHistory.filter(
            p => p.date >= trade.entryDate && p.date <= trade.exitDate
        );

        if (holdDates.length === 0) return 0;

        if (trade.side === 'BUY') {
            const minPrice = Math.min(...holdDates.map(p => p.low));
            return Math.max(0, (trade.entryPrice - minPrice) * trade.quantity);
        } else {
            const maxPrice = Math.max(...holdDates.map(p => p.high));
            return Math.max(0, (maxPrice - trade.entryPrice) * trade.quantity);
        }
    }

    private determineMarketCondition(
        priceHistory: HistoricalPriceData[]
    ): 'trending' | 'ranging' | 'volatile' {
        if (priceHistory.length < 5) return 'ranging';

        const closes = priceHistory.map(p => p.close);

        // Calculate volatility
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);

        // Calculate trend strength (simple linear regression slope)
        const n = closes.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = closes.reduce((a, b) => a + b, 0);
        const sumXY = closes.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const trendStrength = Math.abs(slope) / closes[0];

        if (volatility > 0.03) return 'volatile';
        if (trendStrength > 0.001) return 'trending';
        return 'ranging';
    }

    private categorizeTradeStyle(
        trade: TradeForPostAnalysis,
        priceHistory: HistoricalPriceData[]
    ): 'momentum' | 'reversal' | 'breakout' | 'mean_reversion' | 'unknown' {
        if (priceHistory.length < 10) return 'unknown';

        // Get price action before entry
        const beforeEntry = priceHistory.filter(p => p.date < trade.entryDate).slice(-5);
        if (beforeEntry.length === 0) return 'unknown';

        const priorTrend = beforeEntry[beforeEntry.length - 1].close - beforeEntry[0].close;
        const priorVolatility = Math.max(...beforeEntry.map(p => p.high)) - Math.min(...beforeEntry.map(p => p.low));

        // Determine if this was a momentum, reversal, or breakout trade
        const avgPrice = beforeEntry.reduce((sum, p) => sum + p.close, 0) / beforeEntry.length;

        if (trade.side === 'BUY') {
            if (priorTrend > 0 && trade.entryPrice > avgPrice) {
                // Buying in uptrend above average = momentum
                return 'momentum';
            } else if (priorTrend < 0 && trade.entryPrice < avgPrice) {
                // Buying in downtrend below average = reversal
                return 'reversal';
            } else if (trade.entryPrice > Math.max(...beforeEntry.map(p => p.high))) {
                // Buying above recent highs = breakout
                return 'breakout';
            } else {
                return 'mean_reversion';
            }
        } else {
            if (priorTrend < 0 && trade.entryPrice < avgPrice) {
                return 'momentum';
            } else if (priorTrend > 0 && trade.entryPrice > avgPrice) {
                return 'reversal';
            } else if (trade.entryPrice < Math.min(...beforeEntry.map(p => p.low))) {
                return 'breakout';
            } else {
                return 'mean_reversion';
            }
        }
    }

    private generateImprovements(
        trade: TradeForPostAnalysis,
        entryEfficiency: number,
        exitEfficiency: number,
        exitTiming: string,
        capturedProfitPercent: number,
        marketCondition: string
    ): string[] {
        const improvements: string[] = [];

        if (entryEfficiency < 60) {
            improvements.push('Consider using limit orders for better entry prices');
        }
        if (exitEfficiency < 60) {
            improvements.push('Review exit strategy - consider trailing stops');
        }
        if (exitTiming === 'early' && capturedProfitPercent < 50) {
            improvements.push('Exited too early - captured less than 50% of potential profit');
        }
        if (exitTiming === 'late') {
            improvements.push('Held too long - profits were given back before exit');
        }
        if (marketCondition === 'volatile' && trade.pnl < 0) {
            improvements.push('Consider reducing position size in volatile conditions');
        }

        return improvements;
    }

    private generateMockPriceHistory(
        symbol: string,
        startDate: Date,
        endDate: Date
    ): HistoricalPriceData[] {
        const data: HistoricalPriceData[] = [];
        let price = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 100;

        const current = new Date(startDate);
        while (current <= endDate) {
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                const change = (Math.random() - 0.5) * price * 0.04;
                price = Math.max(price * 0.8, price + change);

                const volatility = price * 0.02;

                data.push({
                    date: new Date(current),
                    open: price - volatility / 2 + Math.random() * volatility,
                    high: price + Math.random() * volatility,
                    low: price - Math.random() * volatility,
                    close: price,
                    volume: 1000000 + Math.random() * 5000000,
                });
            }
            current.setDate(current.getDate() + 1);
        }

        return data;
    }
}

export const postTradeAnalysisService = new PostTradeAnalysisService();
