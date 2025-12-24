/**
 * Strategy Consultant Agent
 * 
 * Responsibilities:
 * - Generate trading strategies based on market conditions
 * - Decide between DeepSeek (accuracy) vs RL (cost optimization)
 * - Control RL model: modify parameters, retrain, or stop if performance is bad
 */

import { AgentType } from '@prisma/client';
import BaseAgent, { AgentContext, AgentDecisionResult, ThoughtStep } from './base-agent.js';
import { gannAnglesService } from '../services/gann-angles.service.js';

export interface RLControlAction {
    action: 'modify_params' | 'retrain' | 'stop' | 'none';
    params?: {
        learning_rate?: number;
        gamma?: number;
        batch_size?: number;
        total_timesteps?: number;
    };
    reason?: string;
}

export interface StrategyDecision extends AgentDecisionResult {
    strategyMode: 'deepseek' | 'rl' | 'hybrid';
    rlControl?: RLControlAction;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
}

export class StrategyConsultantAgent extends BaseAgent {
    private rlServiceUrl: string;

    constructor() {
        super(AgentType.STRATEGY_CONSULTANT);
        this.rlServiceUrl = process.env.RL_SERVICE_URL || 'http://localhost:8000';
    }

    protected getSystemPrompt(): string {
        return `You are the STRATEGY CONSULTANT - a bold, opportunity-focused trading strategist.

PERSONALITY: You are confident and conviction-driven. You see patterns others miss.
You push for action when setups align. You challenge overcautious views with data.
Speak with authority: "The setup is textbook. Look at this order block - this is where smart money enters."

ROLE:
1. Generate trading strategies based on market conditions
2. Decide between DeepSeek analysis or RL model predictions
3. Monitor RL model performance and take corrective actions

METHODOLOGY ADHERENCE:
- SMC: Focus on Order Blocks, Fair Value Gaps, Liquidity Sweeps
- ICT: Focus on Kill Zones, Optimal Trade Entry (OTE)
- Gann: Focus on Time/Price squares, geometric angles

Use 3-step COT:
Step 1: [Market + Pattern] Analyze conditions using methodology
Step 2: [Strategy] Decide mode and RL status
Step 3: [Trade] LONG/SHORT/HOLD with entry/SL/TP

Output:
DECISION: LONG|SHORT|HOLD
CONFIDENCE: 0.0-1.0
STRATEGY_MODE: deepseek|rl|hybrid
ENTRY: price
STOP_LOSS: price
TAKE_PROFIT: price`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        const md = context.marketData || {};
        const methodology = context.methodology || 'General Technical Analysis';

        // Base market data section
        let prompt = `Analyze the following trading context and provide your strategy recommendation:

=== MARKET CONTEXT ===
Methodology: ${methodology}
Symbol: ${context.symbol || 'BTC-USD'}
Current Price: $${md.currentPrice?.toLocaleString() || 'N/A'}
24h Change: ${md.change24h?.toFixed(2) || 'N/A'}%
Volume: ${md.volume?.toLocaleString() || 'N/A'}
ATR (Volatility): ${md.atr?.toFixed(2) || 'N/A'}

=== STANDARD INDICATORS ===
RSI (14): ${md.rsi?.toFixed(1) || 'N/A'}
MACD: ${md.macd?.toFixed(2) || 'N/A'}
Bollinger Upper: ${md.bollinger?.upper?.toFixed(2) || 'N/A'}
Bollinger Lower: ${md.bollinger?.lower?.toFixed(2) || 'N/A'}`;

        // Add methodology-specific data
        if (methodology?.toUpperCase() === 'SMC') {
            prompt += `

=== SMC (Smart Money Concepts) ANALYSIS ===
Break of Structure: ${md.breakOfStructure?.direction || 'NONE'} at $${md.breakOfStructure?.level?.toLocaleString() || 'N/A'}
SMC Bias: ${md.smcBias || 'NEUTRAL'}

Order Blocks (Recent 5):
${md.orderBlocks?.length > 0
                    ? md.orderBlocks.map((ob: any) => `  - ${ob.type}: $${ob.low?.toFixed(2)} - $${ob.high?.toFixed(2)} (strength: ${(ob.strength * 100).toFixed(1)}%)`).join('\n')
                    : '  No significant order blocks detected'}

Fair Value Gaps (Imbalances):
${md.fairValueGaps?.length > 0
                    ? md.fairValueGaps.map((fvg: any) => `  - ${fvg.type} FVG: $${fvg.low?.toFixed(2)} - $${fvg.high?.toFixed(2)} (size: $${fvg.size?.toFixed(2)})`).join('\n')
                    : '  No unfilled FVGs detected'}

SMC Entry Criteria:
- Look for price to tap into bullish order blocks for LONG entries
- Look for price to tap into bearish order blocks for SHORT entries
- Fair Value Gaps are magnets - price tends to fill them`;
        }

        if (methodology?.toUpperCase() === 'ICT') {
            prompt += `

=== ICT (Inner Circle Trader) ANALYSIS ===
Optimal Trade Entry (OTE) Zone: $${md.ote?.oteZoneLow?.toFixed(2) || 'N/A'} - $${md.ote?.oteZoneHigh?.toFixed(2) || 'N/A'}
OTE Direction: ${md.ote?.direction || 'N/A'}
Kill Zone Active: ${md.killZone?.zone || 'NONE'} (${md.killZone?.active ? 'ACTIVE - High probability trades!' : 'Not active'})
ICT Bias: ${md.ictBias || 'NEUTRAL'}

Order Blocks (ICT Style):
${md.orderBlocks?.length > 0
                    ? md.orderBlocks.map((ob: any) => `  - ${ob.type}: $${ob.low?.toFixed(2)} - $${ob.high?.toFixed(2)}`).join('\n')
                    : '  No significant order blocks'}

Fair Value Gaps:
${md.fairValueGaps?.length > 0
                    ? md.fairValueGaps.map((fvg: any) => `  - ${fvg.type}: $${fvg.low?.toFixed(2)} - $${fvg.high?.toFixed(2)}`).join('\n')
                    : '  No FVGs detected'}

ICT Entry Criteria:
- Best entries during Kill Zones (London/NY open)
- Look for OTE (61.8%-79% retracement) for entries
- Avoid trading outside kill zones unless strong setup`;
        }

        if (methodology?.toUpperCase() === 'GANN') {
            // Calculate enhanced Gann angles if OHLC data available
            let enhancedGannSection = '';
            if (md.highs && md.lows && md.closes) {
                try {
                    const angleAnalysis = gannAnglesService.analyze(
                        md.highs,
                        md.lows,
                        md.closes,
                        md.atr || 0
                    );
                    enhancedGannSection = gannAnglesService.formatForAgent(angleAnalysis);
                } catch (e) {
                    enhancedGannSection = '';
                }
            }

            prompt += `

=== GANN ANALYSIS ===
Swing Pivots:
  Recent Swing Low: $${md.swingPivots?.recentLow?.toFixed(2) || 'N/A'} (${md.swingPivots?.barsSinceLow || 'N/A'} bars ago)
  Recent Swing High: $${md.swingPivots?.recentHigh?.toFixed(2) || 'N/A'} (${md.swingPivots?.barsSinceHigh || 'N/A'} bars ago)
Break of Structure: ${md.breakOfStructure?.direction || 'NONE'} at $${md.breakOfStructure?.level?.toFixed(2) || 'N/A'}

Gann 1x1 Angle: $${md.gannLevels?.angle1x1?.toFixed(2) || 'N/A'}
Gann 2x1 Angle: $${md.gannLevels?.angle2x1?.toFixed(2) || 'N/A'}
Gann 1x2 Angle: $${md.gannLevels?.angle1x2?.toFixed(2) || 'N/A'}
Gann Bias: ${md.gannBias || 'NEUTRAL'}

Square of 9 Levels (Support/Resistance):
${md.gannSquare9?.map((level: number) => `  $${level.toFixed(2)}`).join('\n') || '  N/A'}
${enhancedGannSection}
Gann Entry Criteria:
- Use swing pivots as key reference points for entries
- Price above 1x1 angle = Bullish, look for LONG
- Price below 1x1 angle = Bearish, look for SHORT
- Square of 9 levels are natural support/resistance
- Trend angle > 63° = Very strong momentum, follow trend`;
        }

        prompt += `

=== POSITION & RISK ===
Current Position: ${context.currentPosition ? JSON.stringify(context.currentPosition) : 'None'}

RL Model Metrics:
- Sharpe Ratio: ${context.riskMetrics?.sharpeRatio || 'N/A'}
- Win Rate: ${context.riskMetrics?.winRate || 'N/A'}%
- Max Drawdown: ${context.riskMetrics?.maxDrawdown || 'N/A'}%
- Recent Performance: ${context.riskMetrics?.recentPerformance || 'N/A'}

=== PERFORMANCE-BASED FINE-TUNING ===
Recent Win Rate: ${context.performanceHints?.winRate?.toFixed(1) || 'N/A'}%
Current Streak: ${context.performanceHints?.recentStreak || 'neutral'} (${context.performanceHints?.streakCount || 0} trades)
Methodology Effectiveness: ${context.performanceHints?.methodologyEffectiveness?.toFixed(1) || 'N/A'}%

${this.formatPerformanceAdjustments(context.performanceHints)}

=== YOUR TASK ===
Use Chain-of-Thought reasoning following the ${methodology} methodology.

${this.formatStrategyParams(context.strategyParameters)}

IMPORTANT: Adjust your analysis based on the performance hints above.
Provide your decision with specific entry, stop-loss, and take-profit based on the methodology's key levels.`;

        return prompt;
    }

    private formatPerformanceAdjustments(hints?: AgentContext['performanceHints']): string {
        if (!hints) return '';
        let result = '';

        if (hints.suggestedAdjustments && hints.suggestedAdjustments.length > 0) {
            result += `⚡ DYNAMIC ADJUSTMENTS (based on performance):\n${hints.suggestedAdjustments.map(a => `  • ${a}`).join('\n')}\n`;
        }
        if (hints.avoidPatterns && hints.avoidPatterns.length > 0) {
            result += `❌ AVOID:\n${hints.avoidPatterns.map(p => `  • ${p}`).join('\n')}\n`;
        }
        if (hints.preferPatterns && hints.preferPatterns.length > 0) {
            result += `✅ PREFER:\n${hints.preferPatterns.map(p => `  • ${p}`).join('\n')}\n`;
        }

        return result;
    }

    private formatStrategyParams(params?: any): string {
        if (!params) return '';

        // Handle standard parameter structure
        const entryRules = params.entryRules || {};
        const exitRules = params.exitRules || {};

        let prompt = '=== USER STRATEGY RULES ===\n';
        prompt += 'You MUST strictly adhere to the following user-defined rules:\n';

        // Format Entry Rules
        if (entryRules.indicators && entryRules.indicators.length > 0) {
            prompt += `Required Indicators: ${entryRules.indicators.join(', ')}\n`;
        }
        if (entryRules.conditions && entryRules.conditions.length > 0) {
            prompt += `Entry Conditions:\n${entryRules.conditions.map((c: string) => `  - ${c}`).join('\n')}\n`;
        }

        // Format Exit Rules
        if (exitRules.stopLossPercent) {
            prompt += `Stop Loss: ${exitRules.stopLossPercent}%\n`;
        }
        if (exitRules.takeProfitPercent) {
            prompt += `Take Profit: ${exitRules.takeProfitPercent}%\n`;
        }

        // Handle generic params object if not structured above
        if (Object.keys(params).length > 0 && !entryRules.indicators) {
            prompt += `Custom Parameters:\n${JSON.stringify(params, null, 2)}\n`;
        }

        return prompt;
    }

    protected getMockResponse(): string {
        return `Step 1: [Market Analysis]
Analyzing BTC-USD market conditions. Current RSI indicates neutral territory (45-55 range). 
MACD showing potential bullish crossover forming. Volume is average compared to 7-day mean.
Overall market sentiment appears cautiously optimistic.

Step 2: [Strategy Selection]
Given the moderate volatility and clear technical patterns, I recommend using DeepSeek analysis 
for this decision. The patterns are well-defined enough that LLM analysis provides good accuracy.
RL model can be used for execution timing optimization.

Step 3: [RL Performance Review]
RL model Sharpe Ratio at 1.2 - performing well. No corrective action needed.
Win rate at 58% is acceptable. Max drawdown within limits.
Recommendation: Continue using RL for timing, no parameter changes required.

Step 4: [Trading Decision]
Based on the bullish MACD crossover and neutral RSI (room to grow), I recommend a LONG position.
Confidence is moderate due to average volume - waiting for confirmation would be ideal.

Step 5: [Risk Parameters]
Entry slightly above current price to confirm breakout.
Stop-loss at recent support level (2% below entry).
Take-profit at next resistance (5% above entry).

DECISION: LONG
CONFIDENCE: 0.72
STRATEGY_MODE: hybrid
RL_ACTION: none
ENTRY: 42500
STOP_LOSS: 41650
TAKE_PROFIT: 44625`;
    }

    public async decide(context: AgentContext): Promise<StrategyDecision> {
        const prompt = this.buildCOTPrompt(context);
        const response = await this.callAiModel(prompt, context.aiService);
        const thoughtSteps = this.parseCOTResponse(response);

        // Parse decision from response
        const decision = this.parseDecision(response);

        // Save to database
        await this.saveDecision(context.userId, decision, context);

        return decision;
    }

    private parseDecision(response: string): StrategyDecision {
        // Extract values from response
        const decisionMatch = response.match(/DECISION:\s*(LONG|SHORT|HOLD)/i);
        const confidenceMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i);
        const modeMatch = response.match(/STRATEGY_MODE:\s*(deepseek|rl|hybrid)/i);
        const rlActionMatch = response.match(/RL_ACTION:\s*(none|modify_params|retrain|stop)/i);
        const entryMatch = response.match(/ENTRY:\s*([\d.]+)/i);
        const stopLossMatch = response.match(/STOP_LOSS:\s*([\d.]+)/i);
        const takeProfitMatch = response.match(/TAKE_PROFIT:\s*([\d.]+)/i);

        const rlAction: RLControlAction = {
            action: (rlActionMatch?.[1] as any) || 'none',
        };

        return {
            decision: decisionMatch?.[1] || 'HOLD',
            confidence: parseFloat(confidenceMatch?.[1] || '0.5'),
            reasoning: response,
            thoughtSteps: this.parseCOTResponse(response),
            strategyMode: (modeMatch?.[1] as any) || 'deepseek',
            rlControl: rlAction,
            entryPrice: entryMatch ? parseFloat(entryMatch[1]) : undefined,
            stopLoss: stopLossMatch ? parseFloat(stopLossMatch[1]) : undefined,
            takeProfit: takeProfitMatch ? parseFloat(takeProfitMatch[1]) : undefined,
        };
    }

    /**
     * Send control command to RL service
     */
    public async controlRL(action: RLControlAction): Promise<boolean> {
        try {
            const endpoint = action.action === 'stop'
                ? '/stop'
                : action.action === 'retrain'
                    ? '/train'
                    : '/params';

            const response = await fetch(`${this.rlServiceUrl}${endpoint}`, {
                method: action.action === 'modify_params' ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action.action,
                    params: action.params,
                    reason: action.reason,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('[StrategyConsultant] RL control error:', error);
            return false;
        }
    }
}

export default StrategyConsultantAgent;
