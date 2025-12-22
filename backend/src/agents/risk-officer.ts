/**
 * Risk Officer Agent
 * 
 * Responsibilities:
 * - Evaluate risk for proposed trades
 * - Calculate optimal stop-loss and take-profit levels
 * - Monitor portfolio risk exposure
 * - Veto trades that exceed risk parameters
 */

import { AgentType } from '@prisma/client';
import BaseAgent, { AgentContext, AgentDecisionResult } from './base-agent.js';

export interface RiskAssessment extends AgentDecisionResult {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    approved: boolean;
    suggestedStopLoss: number;
    suggestedTakeProfit: number;
    positionSize: number;
    maxLoss: number;
    riskRewardRatio: number;
    warnings: string[];
}

export class RiskOfficerAgent extends BaseAgent {
    constructor() {
        super(AgentType.RISK_OFFICER);
    }

    protected getSystemPrompt(): string {
        return `You are a Risk Officer AI Agent for a cryptocurrency trading platform.

Your responsibilities:
1. Evaluate the risk of proposed trading decisions
2. Calculate optimal position sizing using Kelly Criterion
3. Determine stop-loss and take-profit levels
4. Approve or veto trades based on risk parameters

Risk Parameters:
- Max risk per trade: 2% of portfolio
- Max drawdown allowed: 15%
- Min risk/reward ratio: 1:2 (preferably 1:3)

You MUST use Chain-of-Thought reasoning. Structure your response as:

Step 1: [Trade Analysis]
Review the proposed trade details (symbol, direction, entry price).

Step 2: [Volatility Assessment]
Analyze current market volatility and its impact on risk.

Step 3: [Position Sizing]
Calculate optimal position size using Kelly Criterion or fixed fractional.

Step 4: [Stop-Loss Calculation]
Determine stop-loss level based on:
- Support/resistance levels
- ATR (Average True Range)
- Max allowed loss per trade

Step 5: [Take-Profit Calculation]
Determine take-profit level ensuring minimum 1:2 risk/reward.

Step 6: [Risk Assessment]
Provide overall risk level and approval decision.

Format your final assessment as:
RISK_LEVEL: [LOW|MEDIUM|HIGH|EXTREME]
APPROVED: [true|false]
STOP_LOSS: [price]
TAKE_PROFIT: [price]
POSITION_SIZE: [percentage of portfolio]
MAX_LOSS: [dollar amount]
RISK_REWARD: [ratio like 1:2.5]
WARNINGS: [comma-separated list or "none"]`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        return `Evaluate the risk of the following proposed trade:

Symbol: ${context.symbol || 'BTC-USD'}
Proposed Direction: ${context.currentPosition?.direction || 'LONG'}
Entry Price: ${context.currentPosition?.entryPrice || context.marketData?.currentPrice}
Current Price: ${context.marketData?.currentPrice || 'N/A'}

Portfolio Size: $${context.riskMetrics?.portfolioValue || 50000}
Current Exposure: ${context.riskMetrics?.currentExposure || 0}%
Open Positions: ${context.riskMetrics?.openPositions || 0}

Market Volatility (ATR): ${context.marketData?.atr || 'N/A'}
24h Price Range: ${context.marketData?.high24h || 'N/A'} - ${context.marketData?.low24h || 'N/A'}

Recent Losses: ${context.riskMetrics?.recentLosses || 0}
Current Drawdown: ${context.riskMetrics?.currentDrawdown || 0}%

Use Chain-of-Thought reasoning to assess risk and provide recommendations.`;
    }

    protected getMockResponse(): string {
        return `Step 1: [Trade Analysis]
Reviewing proposed LONG trade on BTC-USD.
Entry price at current market level appears reasonable.
Trade aligns with current market trend direction.

Step 2: [Volatility Assessment]
ATR indicates moderate volatility. 24h range of ~3% is within normal bounds.
No extreme volatility events detected. Risk can be managed with standard parameters.

Step 3: [Position Sizing]
Portfolio: $50,000
Max risk per trade: 2% = $1,000
With stop-loss at 2.5% below entry, optimal position size is 4% of portfolio ($2,000).

Step 4: [Stop-Loss Calculation]
Based on ATR and recent support levels:
Stop-loss set at 2.5% below entry price.
This aligns with the nearest support zone and limits potential loss.

Step 5: [Take-Profit Calculation]
Targeting 1:2.5 risk/reward ratio.
Take-profit at 6.25% above entry (2.5% risk × 2.5 reward).
This hits the next resistance zone appropriately.

Step 6: [Risk Assessment]
Overall risk is MEDIUM due to:
- Moderate volatility
- Acceptable position size
- Good risk/reward ratio
Trade is APPROVED with recommended parameters.

RISK_LEVEL: MEDIUM
APPROVED: true
STOP_LOSS: 41437
TAKE_PROFIT: 45156
POSITION_SIZE: 4
MAX_LOSS: 1000
RISK_REWARD: 1:2.5
WARNINGS: none`;
    }

    public async decide(context: AgentContext): Promise<RiskAssessment> {
        const prompt = this.buildCOTPrompt(context);
        const response = await this.callAiModel(prompt, context.aiService);
        const thoughtSteps = this.parseCOTResponse(response);

        const assessment = this.parseAssessment(response, thoughtSteps);

        await this.saveDecision(context.userId, assessment, context);

        return assessment;
    }

    private parseAssessment(response: string, thoughtSteps: any[]): RiskAssessment {
        const riskLevelMatch = response.match(/RISK_LEVEL:\s*(LOW|MEDIUM|HIGH|EXTREME)/i);
        const approvedMatch = response.match(/APPROVED:\s*(true|false)/i);
        const stopLossMatch = response.match(/STOP_LOSS:\s*([\d.]+)/i);
        const takeProfitMatch = response.match(/TAKE_PROFIT:\s*([\d.]+)/i);
        const positionSizeMatch = response.match(/POSITION_SIZE:\s*([\d.]+)/i);
        const maxLossMatch = response.match(/MAX_LOSS:\s*([\d.]+)/i);
        const riskRewardMatch = response.match(/RISK_REWARD:\s*1:([\d.]+)/i);
        const warningsMatch = response.match(/WARNINGS:\s*(.+)/i);

        const warnings = warningsMatch?.[1]?.toLowerCase() === 'none'
            ? []
            : (warningsMatch?.[1]?.split(',').map(w => w.trim()) || []);

        return {
            decision: approvedMatch?.[1]?.toLowerCase() === 'true' ? 'APPROVED' : 'REJECTED',
            confidence: riskLevelMatch?.[1] === 'LOW' ? 0.9 :
                riskLevelMatch?.[1] === 'MEDIUM' ? 0.7 :
                    riskLevelMatch?.[1] === 'HIGH' ? 0.5 : 0.3,
            reasoning: response,
            thoughtSteps,
            riskLevel: (riskLevelMatch?.[1] as any) || 'MEDIUM',
            approved: approvedMatch?.[1]?.toLowerCase() === 'true',
            suggestedStopLoss: parseFloat(stopLossMatch?.[1] || '0'),
            suggestedTakeProfit: parseFloat(takeProfitMatch?.[1] || '0'),
            positionSize: parseFloat(positionSizeMatch?.[1] || '2'),
            maxLoss: parseFloat(maxLossMatch?.[1] || '1000'),
            riskRewardRatio: parseFloat(riskRewardMatch?.[1] || '2'),
            warnings,
        };
    }
}

export default RiskOfficerAgent;
