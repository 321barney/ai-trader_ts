/**
 * Strategy Service
 * 
 * Manages strategy versions and evolution through the
 * Strategic Consultant agent's learning loop.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types
export interface StrategyRule {
    id: string;
    name: string;
    condition: string;       // e.g., "RSI < 30 AND trend.short = BULLISH"
    action: 'LONG' | 'SHORT' | 'AVOID';
    weight: number;          // Importance 0-1
    successRate?: number;    // Learned from performance
    timesApplied?: number;
}

export interface StrategyVersion {
    id: string;
    userId: string;
    version: number;
    baseMethodology: 'SMC' | 'ICT' | 'Gann' | 'Custom';
    rules: StrategyRule[];
    learnings: string[];     // COT learnings from past signals
    metrics: {
        winRate: number;
        avgPnLPercent: number;
        sharpeRatio: number;
        signalCount: number;
        bestRule?: string;
        worstRule?: string;
    };
    active: boolean;
    parentVersionId?: string;
    createdAt: Date;
}

export interface PerformanceFeedback {
    winners: {
        signal: any;
        pnlPercent: number;
        indicators: any;
    }[];
    losers: {
        signal: any;
        pnlPercent: number;
        indicators: any;
    }[];
    summary: {
        totalSignals: number;
        winRate: number;
        avgWin: number;
        avgLoss: number;
    };
}

// Base rules for each methodology
const METHODOLOGY_BASE_RULES: Record<string, StrategyRule[]> = {
    SMC: [
        { id: 'smc-1', name: 'Order Block Long', condition: 'Price at support AND volume > 1.5x avg', action: 'LONG', weight: 0.8 },
        { id: 'smc-2', name: 'Order Block Short', condition: 'Price at resistance AND volume > 1.5x avg', action: 'SHORT', weight: 0.8 },
        { id: 'smc-3', name: 'Liquidity Grab Long', condition: 'Price broke below support AND recovered within 2 candles', action: 'LONG', weight: 0.9 },
        { id: 'smc-4', name: 'Liquidity Grab Short', condition: 'Price broke above resistance AND rejected within 2 candles', action: 'SHORT', weight: 0.9 },
        { id: 'smc-5', name: 'Fair Value Gap', condition: 'Gap between candle bodies > ATR', action: 'LONG', weight: 0.7 },
    ],
    ICT: [
        { id: 'ict-1', name: 'Optimal Trade Entry Long', condition: 'Price in 62-79% retracement zone AND bullish', action: 'LONG', weight: 0.85 },
        { id: 'ict-2', name: 'Optimal Trade Entry Short', condition: 'Price in 62-79% retracement zone AND bearish', action: 'SHORT', weight: 0.85 },
        { id: 'ict-3', name: 'Killzone Entry', condition: 'Time in London/NY session AND setup present', action: 'LONG', weight: 0.75 },
        { id: 'ict-4', name: 'Market Structure Break', condition: 'Higher high broken (bullish) OR lower low broken (bearish)', action: 'LONG', weight: 0.8 },
    ],
    Gann: [
        { id: 'gann-1', name: 'Time Cycle', condition: 'Price at significant time cycle (90, 180, 360 days)', action: 'LONG', weight: 0.7 },
        { id: 'gann-2', name: 'Price Square', condition: 'Price at Gann angle support (1x1, 2x1)', action: 'LONG', weight: 0.75 },
        { id: 'gann-3', name: 'Vibration Level', condition: 'Price at 50% or 100% of previous range', action: 'LONG', weight: 0.7 },
    ],
    Custom: [
        { id: 'custom-1', name: 'RSI Oversold', condition: 'RSI < 30', action: 'LONG', weight: 0.6 },
        { id: 'custom-2', name: 'RSI Overbought', condition: 'RSI > 70', action: 'SHORT', weight: 0.6 },
        { id: 'custom-3', name: 'MACD Cross Up', condition: 'MACD > Signal AND histogram turning positive', action: 'LONG', weight: 0.65 },
        { id: 'custom-4', name: 'EMA Trend', condition: 'EMA20 > EMA50 > EMA200', action: 'LONG', weight: 0.7 },
    ],
};

export class StrategyService {

    /**
     * Create initial strategy from user's chosen methodology
     */
    async createFromMethodology(
        userId: string,
        methodology: 'SMC' | 'ICT' | 'Gann' | 'Custom'
    ): Promise<StrategyVersion> {
        const baseRules = METHODOLOGY_BASE_RULES[methodology] || METHODOLOGY_BASE_RULES.Custom;

        const strategy: StrategyVersion = {
            id: crypto.randomUUID(),
            userId,
            version: 1,
            baseMethodology: methodology,
            rules: baseRules,
            learnings: [],
            metrics: {
                winRate: 0,
                avgPnLPercent: 0,
                sharpeRatio: 0,
                signalCount: 0,
            },
            active: true,
            createdAt: new Date(),
        };

        // Save to database
        await prisma.strategyVersion.create({
            data: {
                id: strategy.id,
                userId: strategy.userId,
                version: strategy.version,
                baseMethodology: strategy.baseMethodology,
                rules: strategy.rules as any,
                learnings: strategy.learnings,
                metrics: strategy.metrics as any,
                active: true,
            },
        });

        return strategy;
    }

    /**
     * Get current active strategy for user
     */
    async getCurrentStrategy(userId: string): Promise<StrategyVersion | null> {
        const strategy = await prisma.strategyVersion.findFirst({
            where: { userId, active: true },
            orderBy: { version: 'desc' },
        });

        if (!strategy) return null;

        return {
            id: strategy.id,
            userId: strategy.userId,
            version: strategy.version,
            baseMethodology: strategy.baseMethodology as any,
            rules: strategy.rules as StrategyRule[],
            learnings: strategy.learnings as string[],
            metrics: strategy.metrics as any,
            active: strategy.active,
            parentVersionId: strategy.parentVersionId || undefined,
            createdAt: strategy.createdAt,
        };
    }

    /**
     * Get all strategy versions for user
     */
    async getStrategyHistory(userId: string): Promise<StrategyVersion[]> {
        const strategies = await prisma.strategyVersion.findMany({
            where: { userId },
            orderBy: { version: 'desc' },
        });

        return strategies.map(s => ({
            id: s.id,
            userId: s.userId,
            version: s.version,
            baseMethodology: s.baseMethodology as any,
            rules: s.rules as StrategyRule[],
            learnings: s.learnings as string[],
            metrics: s.metrics as any,
            active: s.active,
            parentVersionId: s.parentVersionId || undefined,
            createdAt: s.createdAt,
        }));
    }

    /**
     * Evolve strategy based on performance feedback
     * Called by Strategic Consultant agent
     */
    async evolveStrategy(
        userId: string,
        evolution: {
            updatedRules: StrategyRule[];
            newLearnings: string[];
            reasoning: string;
        }
    ): Promise<StrategyVersion> {
        // Get current strategy
        const current = await this.getCurrentStrategy(userId);
        if (!current) {
            throw new Error('No active strategy found');
        }

        // Deactivate current
        await prisma.strategyVersion.update({
            where: { id: current.id },
            data: { active: false },
        });

        // Create new version
        const newVersion: StrategyVersion = {
            id: crypto.randomUUID(),
            userId,
            version: current.version + 1,
            baseMethodology: current.baseMethodology,
            rules: evolution.updatedRules,
            learnings: [...current.learnings, ...evolution.newLearnings],
            metrics: current.metrics, // Will be updated as signals come in
            active: true,
            parentVersionId: current.id,
            createdAt: new Date(),
        };

        await prisma.strategyVersion.create({
            data: {
                id: newVersion.id,
                userId: newVersion.userId,
                version: newVersion.version,
                baseMethodology: newVersion.baseMethodology,
                rules: newVersion.rules as any,
                learnings: newVersion.learnings,
                metrics: newVersion.metrics as any,
                active: true,
                parentVersionId: newVersion.parentVersionId,
            },
        });

        return newVersion;
    }

    /**
     * Update strategy metrics after signal outcome
     */
    async updateMetrics(
        strategyId: string,
        outcome: 'WIN' | 'LOSS',
        pnlPercent: number
    ): Promise<void> {
        const strategy = await prisma.strategyVersion.findUnique({
            where: { id: strategyId },
        });

        if (!strategy) return;

        const metrics = strategy.metrics as any;
        const newSignalCount = metrics.signalCount + 1;
        const wins = Math.round(metrics.winRate * metrics.signalCount / 100);
        const newWins = outcome === 'WIN' ? wins + 1 : wins;
        const newWinRate = (newWins / newSignalCount) * 100;

        // Update average PnL
        const totalPnL = metrics.avgPnLPercent * metrics.signalCount + pnlPercent;
        const newAvgPnL = totalPnL / newSignalCount;

        await prisma.strategyVersion.update({
            where: { id: strategyId },
            data: {
                metrics: {
                    ...metrics,
                    signalCount: newSignalCount,
                    winRate: Math.round(newWinRate * 100) / 100,
                    avgPnLPercent: Math.round(newAvgPnL * 100) / 100,
                },
            },
        });
    }

    /**
     * Format strategy rules for DeepSeek prompt
     */
    formatRulesForPrompt(strategy: StrategyVersion): string {
        const rulesText = strategy.rules
            .map(r => `- ${r.name}: ${r.condition} → ${r.action} (weight: ${r.weight})`)
            .join('\n');

        const learningsText = strategy.learnings.length > 0
            ? strategy.learnings.slice(-5).map(l => `- ${l}`).join('\n')
            : 'No learnings yet';

        return `
CURRENT STRATEGY: ${strategy.baseMethodology} v${strategy.version}
Performance: ${strategy.metrics.winRate}% win rate | ${strategy.metrics.signalCount} signals

RULES:
${rulesText}

PAST LEARNINGS:
${learningsText}
`.trim();
    }

    /**
     * Export final enhanced strategy
     */
    async exportStrategy(userId: string): Promise<{
        strategy: StrategyVersion;
        evolutionPath: StrategyVersion[];
        improvements: string;
    }> {
        const current = await this.getCurrentStrategy(userId);
        if (!current) {
            throw new Error('No active strategy found');
        }

        const history = await this.getStrategyHistory(userId);

        // Calculate improvements from v1 to current
        const v1 = history.find(s => s.version === 1);
        const improvements = v1
            ? `Win rate improved from ${v1.metrics.winRate}% to ${current.metrics.winRate}% (+${(current.metrics.winRate - v1.metrics.winRate).toFixed(1)}%)`
            : 'New strategy';

        return {
            strategy: current,
            evolutionPath: history,
            improvements,
        };
    }
}

export const strategyService = new StrategyService();
