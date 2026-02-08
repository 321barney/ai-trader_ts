/**
 * Strategy Builder Service
 * 
 * Converts LLM agent decisions into reusable TradingModel strategies
 * Extracts entry/exit rules from agent reasoning
 */

import { prisma } from '../utils/prisma.js';
import { modelService } from './model.service.js';

interface AgentDecision {
    finalDecision: string;
    confidence: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    strategyDecision?: any;
    riskAssessment?: any;
    marketAnalysis?: any;
}

interface StrategyRules {
    entryRules: {
        indicators: string[];
        conditions: Array<{
            indicator: string;
            operator: string;
            value: number | string | number[];
            weight?: number;
        }>;
        minimumScore?: number;
    };
    exitRules: {
        stopLossPercent: number;
        takeProfitPercent: number;
        trailingStop?: boolean;
    };
    riskPerTrade: number;
}

export class StrategyBuilderService {
    /**
     * Create a TradingModel from successful agent decisions
     * Call this after 3-5 successful trades to "learn" the pattern
     */
    async buildStrategyFromDecisions(
        userId: string,
        methodology: string,
        recentDecisions: AgentDecision[]
    ): Promise<any> {
        console.log(`[StrategyBuilder] Building strategy from ${recentDecisions.length} decisions...`);

        // 1. Extract common patterns from decisions
        const rules = this.extractRulesFromDecisions(recentDecisions, methodology);

        // 2. Calculate performance metrics from decisions
        const metrics = {
            avgConfidence: recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length,
            successRate: this.calculateSuccessRate(recentDecisions)
        };

        // 3. Create TradingModel
        const model = await modelService.createModel(
            userId,
            methodology,
            {
                entryRules: rules.entryRules,
                exitRules: rules.exitRules,
                timeframes: ['5m', '15m', '1h', '4h'],
                methodology,
                riskPerTrade: rules.riskPerTrade
            }
        );

        console.log(`[StrategyBuilder] ✅ Created model v${model.version}`);
        return model;
    }

    /**
     * Build strategy from a single high-confidence decision
     * Use when agent gives exceptionally clear rules
     */
    async buildFromSingleDecision(
        userId: string,
        decision: AgentDecision,
        methodology: string
    ): Promise<any> {
        console.log(`[StrategyBuilder] Building from single decision (conf: ${decision.confidence})...`);

        const rules = this.extractRulesFromSingleDecision(decision, methodology);

        return await modelService.createModel(
            userId,
            methodology,
            {
                entryRules: rules.entryRules,
                exitRules: rules.exitRules,
                timeframes: ['1h', '4h'],
                methodology,
                riskPerTrade: rules.riskPerTrade
            }
        );
    }

    /**
     * Extract common rules from multiple decisions
     */
    private extractRulesFromDecisions(
        decisions: AgentDecision[],
        methodology: string
    ): StrategyRules {
        // For now, use simplified rule extraction
        // In production, would analyze reasoning text to extract exact conditions

        const avgStopLoss = decisions
            .filter(d => d.stopLoss && d.entryPrice)
            .map(d => Math.abs(((d.stopLoss! - d.entryPrice!) / d.entryPrice!) * 100))
            .reduce((sum, val) => sum + val, 0) / decisions.length || 2;

        const avgTakeProfit = decisions
            .filter(d => d.takeProfit && d.entryPrice)
            .map(d => Math.abs(((d.takeProfit! - d.entryPrice!) / d.entryPrice!) * 100))
            .reduce((sum, val) => sum + val, 0) / decisions.length || 6;

        return {
            entryRules: this.buildEntryRules(methodology),
            exitRules: {
                stopLossPercent: avgStopLoss,
                takeProfitPercent: avgTakeProfit,
                trailingStop: false
            },
            riskPerTrade: 2
        };
    }

    /**
     * Extract rules from single decision
     */
    private extractRulesFromSingleDecision(
        decision: AgentDecision,
        methodology: string
    ): StrategyRules {
        const slPercent = decision.stopLoss && decision.entryPrice
            ? Math.abs(((decision.stopLoss - decision.entryPrice) / decision.entryPrice) * 100)
            : 2;

        const tpPercent = decision.takeProfit && decision.entryPrice
            ? Math.abs(((decision.takeProfit - decision.entryPrice) / decision.entryPrice) * 100)
            : 6;

        return {
            entryRules: this.buildEntryRules(methodology),
            exitRules: {
                stopLossPercent: slPercent,
                takeProfitPercent: tpPercent,
                trailingStop: false
            },
            riskPerTrade: 2
        };
    }

    /**
     * Build entry rules based on methodology
     */
    private buildEntryRules(methodology: string): StrategyRules['entryRules'] {
        const rules: StrategyRules['entryRules'] = {
            indicators: [],
            conditions: [],
            minimumScore: 0.8
        };

        if (methodology === 'SMC') {
            rules.indicators = ['RSI', 'MACD', 'SMC_BIAS', 'SMC_FVG', 'SMC_OB'];
            rules.conditions = [
                { indicator: 'SMC_BIAS', operator: '=', value: 'BULLISH', weight: 1.5 },
                { indicator: 'RSI', operator: '<', value: 40, weight: 1.0 },
                { indicator: 'MACD', operator: 'CROSS_ABOVE', value: 0, weight: 1.0 },
                { indicator: 'SMC_FVG', operator: '=', value: 'BULLISH', weight: 1.2 },
                { indicator: 'SMC_OB', operator: '=', value: 'PRESENT', weight: 1.0 }
            ];
        } else if (methodology === 'ICT') {
            rules.indicators = ['RSI', 'ICT_BIAS', 'KILLZONE', 'LIQUIDITY_SWEEP'];
            rules.conditions = [
                { indicator: 'ICT_BIAS', operator: '=', value: 'BULLISH', weight: 1.5 },
                { indicator: 'KILLZONE', operator: '!=', value: 'INACTIVE', weight: 1.2 },
                { indicator: 'RSI', operator: '<', value: 35, weight: 1.0 }
            ];
        } else if (methodology === 'GANN') {
            rules.indicators = ['GANN_BIAS', 'RSI', 'MACD'];
            rules.conditions = [
                { indicator: 'GANN_BIAS', operator: '=', value: 'BULLISH', weight: 1.5 },
                { indicator: 'RSI', operator: 'BETWEEN', value: [30, 70], weight: 1.0 }
            ];
        } else {
            // Generic TA strategy
            rules.indicators = ['RSI', 'MACD'];
            rules.conditions = [
                { indicator: 'RSI', operator: '<', value: 40, weight: 1.0 },
                { indicator: 'MACD', operator: 'CROSS_ABOVE', value: 0, weight: 1.0 }
            ];
        }

        return rules;
    }

    /**
     * Calculate success rate from decisions (if we have outcome data)
     */
    private calculateSuccessRate(decisions: AgentDecision[]): number {
        // Simplified - would need actual trade outcomes
        // For now, use confidence as proxy
        const avgConf = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
        return avgConf * 100;
    }

    /**
     * Validate strategy before activation
     */
    async validateStrategy(modelId: string): Promise<{ valid: boolean; issues: string[] }> {
        const model = await (prisma as any).tradingModel.findUnique({
            where: { id: modelId }
        });

        if (!model) {
            return { valid: false, issues: ['Model not found'] };
        }

        const issues: string[] = [];
        const params = model.parameters as any;

        // Check entry rules exist
        if (!params.entryRules || !params.entryRules.conditions || params.entryRules.conditions.length === 0) {
            issues.push('No entry conditions defined');
        }

        // Check exit rules exist
        if (!params.exitRules) {
            issues.push('No exit rules defined');
        } else {
            if (!params.exitRules.stopLossPercent || params.exitRules.stopLossPercent <= 0) {
                issues.push('Invalid stop loss');
            }
            if (!params.exitRules.takeProfitPercent || params.exitRules.takeProfitPercent <= 0) {
                issues.push('Invalid take profit');
            }
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}

export const strategyBuilder = new StrategyBuilderService();
