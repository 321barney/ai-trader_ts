/**
 * Post-Trade Analysis Service
 * 
 * Analyzes completed trades for:
 * - Pattern identification
 * - Win/loss reasons
 * - Improvement suggestions
 */

import { prisma } from '../utils/prisma.js';
import { DeepSeekService } from './deepseek.service.js';

const db = prisma as any;
const deepSeekService = new DeepSeekService();

export interface TradeAnalysis {
    tradeId: string;
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
    pnl: number;
    pnlPercent: number;
    duration: number; // minutes
    entryReason: string;
    exitReason: string;
    mistakes?: string[];
    improvements?: string[];
    patterns?: string[];
    score: number; // 1-10 trade quality
}

export interface PerformanceInsights {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    bestTrade: TradeAnalysis;
    worstTrade: TradeAnalysis;
    commonMistakes: string[];
    strengthAreas: string[];
    recommendations: string[];
}

class PostTradeAnalysisService {
    /**
     * Analyze a single closed trade
     */
    async analyzeTradeWithAI(positionId: string): Promise<TradeAnalysis | null> {
        try {
            const position = await db.position.findUnique({
                where: { id: positionId }
            });

            if (!position || position.status !== 'CLOSED') {
                return null;
            }

            const pnl = position.realizedPnl || 0;
            const pnlPercent = position.entryPrice > 0
                ? (pnl / (position.size * position.entryPrice)) * 100
                : 0;
            const duration = position.closedAt && position.createdAt
                ? Math.round((new Date(position.closedAt).getTime() - new Date(position.createdAt).getTime()) / 60000)
                : 0;

            // Quick analysis without AI for basic metrics
            const basicAnalysis: TradeAnalysis = {
                tradeId: positionId,
                outcome: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN',
                pnl,
                pnlPercent,
                duration,
                entryReason: position.entryReason || 'Signal-based entry',
                exitReason: position.exitReason || 'TP/SL hit',
                score: this.calculateTradeScore(pnl, pnlPercent, duration)
            };

            // Optional: Deep AI analysis for detailed insights
            if (deepSeekService) {
                try {
                    const aiAnalysis = await this.getAIInsights(position, basicAnalysis);
                    return { ...basicAnalysis, ...aiAnalysis };
                } catch (e) {
                    console.log('[PostTradeAnalysis] AI analysis skipped:', e);
                }
            }

            return basicAnalysis;
        } catch (error) {
            console.error('[PostTradeAnalysis] Error:', error);
            return null;
        }
    }

    /**
     * Calculate trade quality score
     */
    private calculateTradeScore(pnl: number, pnlPercent: number, duration: number): number {
        let score = 5; // Base score

        // Win/Loss factor
        if (pnl > 0) score += 2;
        else if (pnl < 0) score -= 2;

        // Size of win/loss
        if (pnlPercent > 5) score += 1;
        if (pnlPercent > 10) score += 1;
        if (pnlPercent < -5) score -= 1;

        // Duration (reasonable holding time)
        if (duration > 5 && duration < 480) score += 1; // 5min to 8hr sweet spot

        return Math.max(1, Math.min(10, score));
    }

    /**
     * Get AI insights for a trade
     */
    private async getAIInsights(position: any, basicAnalysis: TradeAnalysis) {
        const prompt = `Analyze this trade briefly:
Symbol: ${position.symbol}
Side: ${position.side}
Entry: $${position.entryPrice}
Exit: $${position.exitPrice || 'N/A'}
P/L: $${basicAnalysis.pnl.toFixed(2)} (${basicAnalysis.pnlPercent.toFixed(2)}%)
Duration: ${basicAnalysis.duration} minutes
Exit Reason: ${position.exitReason || 'Unknown'}

Provide JSON with: {"mistakes": [], "improvements": [], "patterns": []}`;

        const result = await deepSeekService.chat([
            { role: 'system', content: 'You are a trade analyst. Be concise.' },
            { role: 'user', content: prompt }
        ]);

        try {
            const resultStr = typeof result === 'string' ? result : (result as any).content || '';
            const parsed = JSON.parse(resultStr.replace(/```json|```/g, '').trim());
            return parsed;
        } catch {
            return {};
        }
    }

    /**
     * Get performance insights for a period
     */
    async getPerformanceInsights(userId: string, days: number = 30): Promise<PerformanceInsights> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const closedPositions = await db.position.findMany({
            where: {
                userId,
                status: 'CLOSED',
                closedAt: { gte: startDate }
            },
            orderBy: { closedAt: 'desc' }
        });

        if (closedPositions.length === 0) {
            return {
                winRate: 0,
                avgWin: 0,
                avgLoss: 0,
                bestTrade: null as any,
                worstTrade: null as any,
                commonMistakes: [],
                strengthAreas: [],
                recommendations: ['Start trading to build performance history']
            };
        }

        const wins = closedPositions.filter((p: any) => (p.realizedPnl || 0) > 0);
        const losses = closedPositions.filter((p: any) => (p.realizedPnl || 0) < 0);

        const winRate = (wins.length / closedPositions.length) * 100;
        const avgWin = wins.length > 0 ? wins.reduce((s: number, p: any) => s + p.realizedPnl, 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((s: number, p: any) => s + p.realizedPnl, 0) / losses.length : 0;

        // Find best/worst trades
        const sorted = [...closedPositions].sort((a: any, b: any) => (b.realizedPnl || 0) - (a.realizedPnl || 0));
        const bestTrade = await this.analyzeTradeWithAI(sorted[0].id);
        const worstTrade = await this.analyzeTradeWithAI(sorted[sorted.length - 1].id);

        // Generate recommendations
        const recommendations: string[] = [];
        if (winRate < 50) recommendations.push('Focus on entry timing - win rate is below 50%');
        if (Math.abs(avgLoss) > avgWin) recommendations.push('Set tighter stop losses - average loss exceeds average win');
        if (closedPositions.length < 10) recommendations.push('Build more trade history for accurate analysis');

        return {
            winRate,
            avgWin,
            avgLoss,
            bestTrade: bestTrade!,
            worstTrade: worstTrade!,
            commonMistakes: [],
            strengthAreas: winRate > 60 ? ['Good entry points'] : [],
            recommendations
        };
    }

    /**
     * Daily trade journal summary
     */
    async getDailyJournal(userId: string, date?: Date): Promise<any> {
        const targetDate = date || new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const trades = await db.position.findMany({
            where: {
                userId,
                status: 'CLOSED',
                closedAt: {
                    gte: targetDate,
                    lt: nextDay
                }
            }
        });

        const totalPnl = trades.reduce((s: number, t: any) => s + (t.realizedPnl || 0), 0);
        const winsCount = trades.filter((t: any) => (t.realizedPnl || 0) > 0).length;

        return {
            date: targetDate.toISOString().split('T')[0],
            totalTrades: trades.length,
            wins: winsCount,
            losses: trades.length - winsCount,
            totalPnl,
            winRate: trades.length > 0 ? (winsCount / trades.length) * 100 : 0,
            trades: trades.map((t: any) => ({
                symbol: t.symbol,
                side: t.side,
                pnl: t.realizedPnl,
                duration: t.closedAt && t.createdAt
                    ? Math.round((new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 60000)
                    : 0
            }))
        };
    }
}

export const postTradeAnalysisService = new PostTradeAnalysisService();
