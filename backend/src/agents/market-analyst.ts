/**
 * Market Analyst Agent
 * 
 * Responsibilities:
 * - Analyze market sentiment from multiple sources
 * - Search for on-chain data (whale movements, exchange flows)
 * - Track social media sentiment
 * - Provide market intelligence to other agents
 */

import { AgentType } from '@prisma/client';
import BaseAgent, { AgentContext, AgentDecisionResult } from './base-agent.js';

export interface MarketAnalysis extends AgentDecisionResult {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sentimentScore: number; // -1 to 1
    onChainSignals: OnChainSignal[];
    newsEvents: NewsEvent[];
    socialSentiment: number;
    keyInsights: string[];
}

export interface OnChainSignal {
    type: 'whale_movement' | 'exchange_flow' | 'miner_activity' | 'holder_distribution';
    direction: 'bullish' | 'bearish' | 'neutral';
    description: string;
    magnitude: 'small' | 'medium' | 'large';
}

export interface NewsEvent {
    title: string;
    impact: 'positive' | 'negative' | 'neutral';
    relevance: number; // 0-1
}

export class MarketAnalystAgent extends BaseAgent {
    constructor() {
        super(AgentType.MARKET_ANALYST);
    }

    protected getSystemPrompt(): string {
        return `You are a Market Analyst AI Agent for a cryptocurrency trading platform.

Your responsibilities:
1. Analyze market sentiment from multiple data sources
2. Track on-chain metrics (whale movements, exchange flows)
3. Monitor news and social media sentiment
4. Provide actionable market intelligence

You have SEARCH CAPABILITY - you can access:
- On-chain data (whale alerts, exchange inflows/outflows)
- News aggregators
- Social sentiment metrics

You MUST use Chain-of-Thought reasoning. Structure your response as:

Step 1: [On-Chain Analysis]
Analyze whale movements, exchange flows, and holder behavior.
Look for: Large transfers, exchange deposits/withdrawals, accumulation patterns.

Step 2: [News Analysis]
Review recent news events affecting the market.
Consider: Regulatory news, adoption events, technical developments.

Step 3: [Social Sentiment]
Analyze social media sentiment and community mood.
Platforms: Twitter/X, Reddit, Discord, Telegram.

Step 4: [Technical Context]
Brief overview of technical indicators supporting sentiment.

Step 5: [Synthesis]
Combine all signals into overall market sentiment assessment.

Format your final analysis as:
SENTIMENT: [BULLISH|BEARISH|NEUTRAL]
SENTIMENT_SCORE: [-1.0 to 1.0]
SOCIAL_SENTIMENT: [-1.0 to 1.0]
ON_CHAIN_SIGNALS: [JSON array of signals]
KEY_INSIGHTS: [bullet points]`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        return `Analyze the market for the following symbol:

Symbol: ${context.symbol || 'BTC-USD'}
Current Price: ${context.marketData?.currentPrice || 'N/A'}
24h Change: ${context.marketData?.change24h || 'N/A'}%
Volume Change: ${context.marketData?.volumeChange || 'N/A'}%

Recent On-Chain Data (if available):
- Exchange Netflow: ${context.marketData?.exchangeNetflow || 'N/A'}
- Whale Transactions: ${context.marketData?.whaleTransactions || 'N/A'}
- Active Addresses: ${context.marketData?.activeAddresses || 'N/A'}

Recent News Sentiment: ${context.marketData?.newsSentiment || 'N/A'}
Social Volume: ${context.marketData?.socialVolume || 'N/A'}

Use your search capabilities to gather additional data and provide comprehensive analysis.
Use Chain-of-Thought reasoning throughout.`;
    }

    protected getMockResponse(): string {
        return `Step 1: [On-Chain Analysis]
Analyzing on-chain metrics for BTC-USD:
- Whale Activity: Detected 3 large transfers (>1000 BTC) in last 24h, 2 moving to cold storage
- Exchange Flows: Net outflow of 5,200 BTC from exchanges (bullish - accumulation)
- Holder Distribution: Long-term holders increasing, short-term holders decreasing
- Miner Behavior: Miners holding, not selling (positive signal)

Step 2: [News Analysis]
Recent news events:
- ETF inflow data showing continued institutional interest (positive)
- No major regulatory concerns this week (neutral)
- Layer 2 adoption increasing (mildly positive)
- Global macro uncertainty (mixed signal)

Step 3: [Social Sentiment]
Social media analysis:
- Twitter/X: Sentiment score 0.35 (slightly bullish)
- Reddit r/Bitcoin: Moderate activity, generally positive
- Fear & Greed Index: 62 (Greed - potentially overbought)
- Funding rates: Slightly positive but not extreme

Step 4: [Technical Context]
- Price above 50-day and 200-day moving averages
- RSI in neutral zone (52)
- Volume declining slightly from recent highs

Step 5: [Synthesis]
Overall market sentiment is BULLISH but cautious:
- On-chain data strongly supports accumulation thesis
- Institutional interest remains steady
- Social sentiment positive but not euphoric
- Technical setup supportive of continued uptrend

SENTIMENT: BULLISH
SENTIMENT_SCORE: 0.45
SOCIAL_SENTIMENT: 0.35
ON_CHAIN_SIGNALS: [{"type":"exchange_flow","direction":"bullish","description":"Net outflow 5,200 BTC","magnitude":"large"},{"type":"whale_movement","direction":"bullish","description":"Accumulation to cold storage","magnitude":"medium"},{"type":"holder_distribution","direction":"bullish","description":"LTH increasing","magnitude":"small"}]
KEY_INSIGHTS: 
- Exchange outflows suggest accumulation phase
- Institutional flows remain positive
- Social sentiment supportive but not extreme
- Watch for potential resistance at recent highs`;
    }

    public async decide(context: AgentContext): Promise<MarketAnalysis> {
        const prompt = this.buildCOTPrompt(context);
        const response = await this.callDeepSeek(prompt);
        const thoughtSteps = this.parseCOTResponse(response);

        const analysis = this.parseAnalysis(response, thoughtSteps);

        await this.saveDecision(context.userId, analysis, context);

        return analysis;
    }

    private parseAnalysis(response: string, thoughtSteps: any[]): MarketAnalysis {
        const sentimentMatch = response.match(/SENTIMENT:\s*(BULLISH|BEARISH|NEUTRAL)/i);
        const scoreMatch = response.match(/SENTIMENT_SCORE:\s*([-\d.]+)/i);
        const socialMatch = response.match(/SOCIAL_SENTIMENT:\s*([-\d.]+)/i);
        const signalsMatch = response.match(/ON_CHAIN_SIGNALS:\s*(\[[\s\S]*?\])/i);
        const insightsMatch = response.match(/KEY_INSIGHTS:\s*([\s\S]*?)$/i);

        let onChainSignals: OnChainSignal[] = [];
        try {
            if (signalsMatch) {
                onChainSignals = JSON.parse(signalsMatch[1]);
            }
        } catch (e) {
            // Failed to parse, use empty array
        }

        const keyInsights = insightsMatch?.[1]
            ?.split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().replace(/^-\s*/, '')) || [];

        return {
            decision: sentimentMatch?.[1] || 'NEUTRAL',
            confidence: Math.abs(parseFloat(scoreMatch?.[1] || '0')),
            reasoning: response,
            thoughtSteps,
            sentiment: (sentimentMatch?.[1] as any) || 'NEUTRAL',
            sentimentScore: parseFloat(scoreMatch?.[1] || '0'),
            onChainSignals,
            newsEvents: [], // Would be populated from actual news search
            socialSentiment: parseFloat(socialMatch?.[1] || '0'),
            keyInsights,
        };
    }

    /**
     * Search for on-chain data from external APIs
     */
    public async searchOnChainData(symbol: string): Promise<any> {
        // This would integrate with:
        // - Whale Alert API
        // - Glassnode API
        // - CryptoQuant API

        // For now, return mock data
        return {
            exchangeNetflow: -5200,
            whaleTransactions: 3,
            activeAddresses: 945000,
        };
    }
}

export default MarketAnalystAgent;
