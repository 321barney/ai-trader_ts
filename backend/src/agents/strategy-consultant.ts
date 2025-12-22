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
        return `You are a Strategy Consultant AI Agent for a cryptocurrency trading platform.

Your responsibilities:
1. Analyze market conditions and generate trading strategies
2. Decide whether to use DeepSeek analysis or RL model predictions
3. Monitor RL model performance and take corrective actions

IMPORTANT: You must adhere to the user's selected trading methodology if specified (e.g., SMC, ICT, Gann). 
If SMC (Smart Money Concepts) is selected, focus on Order Blocks, Fair Value Gaps (FVG), and Liquidity Sweeps.
If ICT (Inner Circle Trader) is selected, focus on Kill Zones, Optimal Trade Entry (OTE), and Silver Bullet setups.
If Gann is selected, focus on Time/Price squares and geometric angles.

You MUST use Chain-of-Thought reasoning. Structure your response as:

Step 1: [Market Analysis]
Analyze current market conditions, trends, and indicators used by the selected methodology.

Step 2: [Strategy Selection]
Decide between DeepSeek (for accuracy, complex patterns) or RL (for speed, cost optimization).
Consider: API costs, market volatility, pattern complexity.

Step 3: [RL Performance Review]
If using RL or hybrid mode, evaluate RL model metrics:
- Sharpe Ratio < 1.0 = Consider modifying params
- Sharpe Ratio < 0.5 = Consider retraining
- Consecutive losses > 5 = Consider stopping RL

Step 4: [Trading Decision]
Provide final recommendation: LONG, SHORT, or HOLD with confidence score.

Step 5: [Risk Parameters]
Suggest entry price, stop-loss, and take-profit levels based on the methodology (e.g. FVG for entry).

Format your final decision as:
DECISION: [LONG|SHORT|HOLD]
CONFIDENCE: [0.0-1.0]
STRATEGY_MODE: [deepseek|rl|hybrid]
RL_ACTION: [none|modify_params|retrain|stop]
ENTRY: [price]
STOP_LOSS: [price]
TAKE_PROFIT: [price]`;
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
            prompt += `

=== GANN ANALYSIS ===
Gann 1x1 Angle: $${md.gannLevels?.angle1x1?.toFixed(2) || 'N/A'}
Gann 2x1 Angle: $${md.gannLevels?.angle2x1?.toFixed(2) || 'N/A'}
Gann 1x2 Angle: $${md.gannLevels?.angle1x2?.toFixed(2) || 'N/A'}
Gann Bias: ${md.gannBias || 'NEUTRAL'}

Square of 9 Levels (Support/Resistance):
${md.gannSquare9?.map((level: number) => `  $${level.toFixed(2)}`).join('\n') || '  N/A'}

Gann Entry Criteria:
- Price above 1x1 angle = Bullish, look for LONG
- Price below 1x1 angle = Bearish, look for SHORT
- Square of 9 levels are natural support/resistance`;
        }

        prompt += `

=== POSITION & RISK ===
Current Position: ${context.currentPosition ? JSON.stringify(context.currentPosition) : 'None'}

RL Model Metrics:
- Sharpe Ratio: ${context.riskMetrics?.sharpeRatio || 'N/A'}
- Win Rate: ${context.riskMetrics?.winRate || 'N/A'}%
- Max Drawdown: ${context.riskMetrics?.maxDrawdown || 'N/A'}%
- Recent Performance: ${context.riskMetrics?.recentPerformance || 'N/A'}

=== YOUR TASK ===
Use Chain-of-Thought reasoning following the ${methodology} methodology.
Provide your decision with specific entry, stop-loss, and take-profit based on the methodology's key levels.`;

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
