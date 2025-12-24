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
        return `You are the RISK OFFICER - the ultimate authority on trade management and risk control.
 
 PERSONALITY: You are disciplined, mathematical, and protective. You determine the "Exit Plan" (TP/SL) for every trade.
 Your goal is to not just "approve" trades, but to STRUCTURE them.
 
 ROLE:
 1. Evaluate risk/reward objectively (min 1:1.5 acceptable for high win rate setups, prefer 1:2+)
 2. CALCULATE PRECISE STOP LOSS & TAKE PROFIT: You must provide the exact prices values.
 3. Position Sizing: Use Kelly Criterion adjusted for volatility.
 4. Monitor portfolio exposure.
 
 LIMITS:
 - Max risk per trade: 2% (can be 3% for A+ setups)
 - Max drawdown: 20%
 
 Use 3-step COT:
 Step 1: [Risk Analysis] Volatility, downside potential, correlation.
 Step 2: [Structure Trade] Determine invalidation point (SL) and realistic targets (TP).
 Step 3: [Verdict] APPROVED/REJECTED.
 
 Output:
 RISK_LEVEL: LOW|MEDIUM|HIGH|EXTREME
 APPROVED: true|false
 STOP_LOSS: price
 TAKE_PROFIT: price
 POSITION_SIZE: percentage
 WARNINGS: list or "none"`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        const md = context.marketData || {};
        const rm = context.riskMetrics || {};
        const methodology = context.methodology || 'Technical';

        return `Evaluate the risk of the following proposed trade:

=== TRADE DETAILS ===
Symbol: ${context.symbol || 'BTC-USD'}
Proposed Direction: ${context.currentPosition?.direction || 'LONG'}
Entry Price: $${(context.currentPosition?.entryPrice || md.currentPrice)?.toLocaleString() || 'N/A'}
Current Price: $${md.currentPrice?.toLocaleString() || 'N/A'}
Methodology: ${methodology}

=== PORTFOLIO STATUS ===
Portfolio Size: $${rm.portfolioValue?.toLocaleString() || '50,000'}
Current Exposure: ${rm.currentExposure || 0}%
Open Positions: ${rm.openPositions || 0}

=== VOLATILITY & RANGE ===
ATR (14): $${md.atr?.toFixed(2) || 'N/A'}
24h High: $${md.high24h?.toLocaleString() || 'N/A'}
24h Low: $${md.low24h?.toLocaleString() || 'N/A'}
24h Range: $${((md.high24h - md.low24h) || 0).toFixed(2)}
Bollinger Width: $${((md.bollinger?.upper - md.bollinger?.lower) || 0).toFixed(2)}

=== STRATEGY KEY LEVELS ===
${md.orderBlocks?.length > 0 ? `Nearest Order Block: $${md.orderBlocks[0]?.low?.toFixed(2)} - $${md.orderBlocks[0]?.high?.toFixed(2)}` : ''}
${md.ote ? `ICT OTE Zone: $${md.ote.oteZoneLow?.toFixed(2)} - $${md.ote.oteZoneHigh?.toFixed(2)}` : ''}
${md.gannLevels ? `Gann 1x1 Level: $${md.gannLevels.angle1x1?.toFixed(2)}` : ''}
${md.fairValueGaps?.length > 0 ? `Nearest FVG: $${md.fairValueGaps[0]?.low?.toFixed(2)} - $${md.fairValueGaps[0]?.high?.toFixed(2)}` : ''}

=== RISK STATUS ===
Recent Losses: ${rm.recentLosses || 0}
Current Drawdown: ${rm.currentDrawdown || 0}%
Max Allowed Drawdown: 20%

=== YOUR TASK ===
Calculate appropriate stop-loss using ${methodology} key levels (Order Blocks, FVG, Gann angles).
Ensure minimum 1:2 risk/reward ratio.
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
