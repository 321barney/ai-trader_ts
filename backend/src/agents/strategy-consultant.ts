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

You MUST use Chain-of-Thought reasoning. Structure your response as:

Step 1: [Market Analysis]
Analyze current market conditions, trends, and indicators.

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
Suggest entry price, stop-loss, and take-profit levels.

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
        return `Analyze the following trading context and provide your strategy recommendation:

Symbol: ${context.symbol || 'BTC-USD'}
Current Price: ${context.marketData?.currentPrice || 'N/A'}
24h Change: ${context.marketData?.change24h || 'N/A'}%
Volume: ${context.marketData?.volume || 'N/A'}
RSI: ${context.marketData?.rsi || 'N/A'}
MACD: ${context.marketData?.macd || 'N/A'}

Current Position: ${context.currentPosition ? JSON.stringify(context.currentPosition) : 'None'}

RL Model Metrics:
- Sharpe Ratio: ${context.riskMetrics?.sharpeRatio || 'N/A'}
- Win Rate: ${context.riskMetrics?.winRate || 'N/A'}%
- Max Drawdown: ${context.riskMetrics?.maxDrawdown || 'N/A'}%
- Recent Performance: ${context.riskMetrics?.recentPerformance || 'N/A'}

Use Chain-of-Thought reasoning to analyze and decide.`;
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
