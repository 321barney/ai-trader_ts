/**
 * Strategy Executor Service
 * 
 * Executes trading strategies WITHOUT LLM calls
 * Pure rule-based evaluation for 95%+ token savings
 */

import { prisma } from '../utils/prisma.js';
import { modelService } from './model.service.js';

interface MarketData {
    currentPrice: number;
    rsi?: number;
    macd?: number;
    atr?: number;
    smcBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    ictBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    gannBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    orderBlocks?: any[];
    fairValueGaps?: any[];
    killZone?: { zone: string; active: boolean };
    liquiditySweep?: { type: string; price: number };
    volumeProfile?: any;
}

interface ExecutionDecision {
    action: 'LONG' | 'SHORT' | 'HOLD' | 'NO_STRATEGY' | 'EXPIRED';
    confidence: number;
    reason: string;
    requiresLLM: boolean;

    // Trade levels (if action is LONG/SHORT)
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;

    // Metadata
    strategyVersion?: number;
    methodology?: string;
}

interface Condition {
    indicator: string;
    operator: '>' | '<' | '=' | '!=' | 'BETWEEN' | 'CROSS_ABOVE' | 'CROSS_BELOW';
    value: number | number[] | string;
    timeframe?: string;
    weight?: number; // Importance of this condition (0-1)
}

export class StrategyExecutorService {
    /**
     * Execute strategy WITHOUT LLM calls
     * Returns decision based purely on strategy rules
     */
    async executeStrategy(
        userId: string,
        symbol: string,
        marketData: MarketData
    ): Promise<ExecutionDecision> {
        console.log(`[StrategyExecutor] Executing for ${symbol}...`);

        // 1. Get active model
        const model = await modelService.getActiveModel(userId);

        if (!model) {
            console.log('[StrategyExecutor] No active model found');
            return {
                action: 'NO_STRATEGY',
                confidence: 0,
                reason: 'No active trading strategy',
                requiresLLM: true
            };
        }

        // 2. Check if model expired (30 days)
        if (model.expiresAt && new Date() > model.expiresAt) {
            console.log(`[StrategyExecutor] Strategy v${model.version} expired`);
            return {
                action: 'EXPIRED',
                confidence: 0,
                reason: 'Strategy requires monthly LLM review',
                requiresLLM: true
            };
        }

        // 3. Check recent performance - fallback to LLM if failing
        const performanceCheck = await this.checkPerformance(userId, model.id);
        if (performanceCheck.requiresLLM) {
            return performanceCheck;
        }

        // 4. Check Market Regime (High Volatility / Crash Detection)
        const regimeCheck = this.checkMarketRegime(marketData);
        if (regimeCheck.requiresLLM) {
            console.log(`[StrategyExecutor] 🚨 Market regime shift detected: ${regimeCheck.reason}`);
            return regimeCheck;
        }

        // 5. Evaluate entry rules
        const params = model.parameters as any;
        const entrySignal = this.evaluateEntryRules(params.entryRules, marketData);

        if (!entrySignal.triggered) {
            console.log(`[StrategyExecutor] Entry conditions not met (${entrySignal.confidence.toFixed(2)})`);
            return {
                action: 'HOLD',
                confidence: entrySignal.confidence,
                reason: `Entry threshold not met: ${entrySignal.details}`,
                requiresLLM: false,
                strategyVersion: model.version,
                methodology: model.methodology
            };
        }

        // 5. Calculate position details
        const position = this.calculatePosition(
            marketData.currentPrice,
            params.exitRules,
            params.riskPerTrade || 2
        );

        console.log(`[StrategyExecutor] ✅ ${entrySignal.direction} signal (conf: ${entrySignal.confidence.toFixed(2)})`);

        return {
            action: entrySignal.direction,
            confidence: entrySignal.confidence,
            reason: `Strategy v${model.version}: ${entrySignal.details}`,
            requiresLLM: false,
            entryPrice: marketData.currentPrice,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            positionSize: position.size,
            strategyVersion: model.version,
            methodology: model.methodology
        };
    }

    /**
     * Check strategy performance and trigger LLM fallback if needed
     */
    private async checkPerformance(
        userId: string,
        modelId: string
    ): Promise<ExecutionDecision | { requiresLLM: false }> {
        // Get recent trades from this strategy
        const recentTrades = await prisma.trade.findMany({
            where: {
                userId,
                closedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            },
            orderBy: { closedAt: 'desc' },
            take: 10
        });

        if (recentTrades.length === 0) {
            return { requiresLLM: false }; // No trades yet
        }

        // Check for consecutive losses (3+)
        let consecutiveLosses = 0;
        for (const trade of recentTrades) {
            if ((trade.pnl || 0) < 0) {
                consecutiveLosses++;
                if (consecutiveLosses >= 3) {
                    console.log(`[StrategyExecutor] 🚨 3+ losses detected, requesting LLM review`);
                    return {
                        action: 'HOLD',
                        confidence: 0,
                        reason: '3 consecutive losses - strategy needs LLM review',
                        requiresLLM: true
                    };
                }
            } else {
                break; // Win breaks the streak
            }
        }

        // Check win rate
        const wins = recentTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = (wins / recentTrades.length) * 100;

        if (winRate < 30 && recentTrades.length >= 5) {
            console.log(`[StrategyExecutor] 🚨 Win rate ${winRate.toFixed(1)}% too low, requesting LLM review`);
            return {
                action: 'HOLD',
                confidence: 0,
                reason: `Win rate ${winRate.toFixed(1)}% - strategy needs adjustment`,
                requiresLLM: true
            };
        }

        return { requiresLLM: false }; // Performance OK
    }

    /**
     * Check if market conditions are suitable for automated strategy
     */
    private checkMarketRegime(marketData: MarketData): ExecutionDecision | { requiresLLM: false } {
        // 1. Volatility Check (ATR > 5% of price)
        if (marketData.atr && marketData.currentPrice) {
            const volatilityPercent = (marketData.atr / marketData.currentPrice) * 100;
            if (volatilityPercent > 5) {
                return {
                    action: 'HOLD',
                    confidence: 0,
                    reason: `Extreme volatility detected (ATR ${volatilityPercent.toFixed(1)}%) - requires Risk Officer review`,
                    requiresLLM: true
                };
            }
        }

        // 2. Indicator Extremes (RSI < 15 or > 85)
        if (marketData.rsi) {
            if (marketData.rsi < 15 || marketData.rsi > 85) {
                return {
                    action: 'HOLD',
                    confidence: 0,
                    reason: `RSI extreme (${marketData.rsi.toFixed(0)}) - potential reversal/crash - requires expert review`,
                    requiresLLM: true
                };
            }
        }

        return { requiresLLM: false };
    }


    /**
     * Evaluate entry rules against current market data
     */
    private evaluateEntryRules(
        rules: { indicators: string[]; conditions: Condition[]; minimumScore?: number },
        marketData: MarketData
    ): {
        triggered: boolean;
        direction: 'LONG' | 'SHORT';
        confidence: number;
        details: string;
    } {
        if (!rules || !rules.conditions || rules.conditions.length === 0) {
            return {
                triggered: false,
                direction: 'LONG',
                confidence: 0,
                details: 'No entry conditions defined'
            };
        }

        let totalWeight = 0;
        let metWeight = 0;
        const metConditions: string[] = [];
        const failedConditions: string[] = [];

        // Evaluate each condition
        for (const condition of rules.conditions) {
            const weight = condition.weight || 1;
            totalWeight += weight;

            const met = this.evaluateCondition(condition, marketData);
            if (met) {
                metWeight += weight;
                metConditions.push(condition.indicator);
            } else {
                failedConditions.push(condition.indicator);
            }
        }

        const confidence = totalWeight > 0 ? metWeight / totalWeight : 0;
        const minimumScore = rules.minimumScore || 0.8;
        const triggered = confidence >= minimumScore;

        // Determine direction from conditions or bias
        const direction = this.determineDirection(rules, marketData);

        const details = triggered
            ? `${metConditions.length}/${rules.conditions.length} conditions met`
            : `Only ${metConditions.length}/${rules.conditions.length} met (need ${(minimumScore * 100).toFixed(0)}%)`;

        return { triggered, direction, confidence, details };
    }

    /**
     * Evaluate a single condition
     */
    private evaluateCondition(condition: Condition, marketData: MarketData): boolean {
        const value = this.getIndicatorValue(condition.indicator, marketData);

        if (value === null || value === undefined) {
            console.warn(`[StrategyExecutor] Indicator ${condition.indicator} not available`);
            return false;
        }

        switch (condition.operator) {
            case '>':
                return Number(value) > Number(condition.value);
            case '<':
                return Number(value) < Number(condition.value);
            case '=':
                if (typeof value === 'string' && typeof condition.value === 'string') {
                    return value === condition.value;
                }
                return Math.abs(Number(value) - Number(condition.value)) < 0.01;
            case '!=':
                return value !== condition.value;
            case 'BETWEEN':
                if (Array.isArray(condition.value) && condition.value.length === 2) {
                    return Number(value) >= condition.value[0] && Number(value) <= condition.value[1];
                }
                return false;
            case 'CROSS_ABOVE':
            case 'CROSS_BELOW':
                // Would need historical data - simplified for now
                return this.checkCrossover(condition.indicator, condition.operator, marketData);
            default:
                return false;
        }
    }

    /**
     * Get indicator value from market data
     */
    private getIndicatorValue(indicator: string, marketData: MarketData): number | string | null {
        const key = indicator.toLowerCase();

        if (key === 'rsi') return marketData.rsi || null;
        if (key === 'macd') return marketData.macd || null;
        if (key === 'atr') return marketData.atr || null;
        if (key === 'price') return marketData.currentPrice;
        if (key === 'smc_bias') return marketData.smcBias || null;
        if (key === 'ict_bias') return marketData.ictBias || null;
        if (key === 'gann_bias') return marketData.gannBias || null;
        if (key === 'smc_fvg' || key === 'fvg') {
            return marketData.fairValueGaps && marketData.fairValueGaps.length > 0
                ? marketData.fairValueGaps[0].type
                : null;
        }
        if (key === 'smc_ob' || key === 'orderblock') {
            return marketData.orderBlocks && marketData.orderBlocks.length > 0
                ? 'PRESENT'
                : 'NONE';
        }
        if (key === 'killzone') {
            return marketData.killZone?.active ? marketData.killZone.zone : 'INACTIVE';
        }

        return null;
    }

    /**
     * Check for indicator crossover (simplified)
     */
    private checkCrossover(
        indicator: string,
        direction: 'CROSS_ABOVE' | 'CROSS_BELOW',
        marketData: MarketData
    ): boolean {
        // Simplified - in real implementation, would compare current vs previous value
        const value = this.getIndicatorValue(indicator, marketData);

        if (indicator.toLowerCase() === 'macd') {
            if (direction === 'CROSS_ABOVE') {
                return (marketData.macd || 0) > 0;
            } else {
                return (marketData.macd || 0) < 0;
            }
        }

        return false;
    }

    /**
     * Determine trade direction from rules and market bias
     */
    private determineDirection(
        rules: { conditions: Condition[] },
        marketData: MarketData
    ): 'LONG' | 'SHORT' {
        // Check for explicit direction in conditions
        const biasConditions = rules.conditions.filter(c =>
            c.indicator.toLowerCase().includes('bias')
        );

        for (const condition of biasConditions) {
            const value = this.getIndicatorValue(condition.indicator, marketData);
            if (value === 'BULLISH') return 'LONG';
            if (value === 'BEARISH') return 'SHORT';
        }

        // Default to LONG if no clear direction
        return 'LONG';
    }

    /**
     * Calculate position size and exit levels
     */
    private calculatePosition(
        entryPrice: number,
        exitRules: { stopLossPercent: number; takeProfitPercent: number; trailingStop?: boolean },
        riskPerTrade: number
    ): {
        stopLoss: number;
        takeProfit: number;
        size: number;
    } {
        const slPercent = exitRules.stopLossPercent || 2;
        const tpPercent = exitRules.takeProfitPercent || 6;

        const stopLoss = entryPrice * (1 - slPercent / 100);
        const takeProfit = entryPrice * (1 + tpPercent / 100);

        // Position size based on risk (simplified)
        const size = riskPerTrade; // Would calculate based on account balance in production

        return { stopLoss, takeProfit, size };
    }
}

export const strategyExecutor = new StrategyExecutorService();
