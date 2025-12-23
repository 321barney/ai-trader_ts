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
        // Condensed prompt with personality
        return `You are the MARKET ANALYST - a data-driven, neutral mediator.

PERSONALITY: You are balanced and objective. You synthesize conflicting data.
When Strategy and Risk disagree, you seek the truth in the middle.
Speak with data: "The on-chain data supports both views. Whales are accumulating, but social sentiment is cooling."

ROLE: Analyze sentiment via on-chain data, news, social signals.

Use 3-step COT:
Step 1: [Data] On-chain + news analysis
Step 2: [Sentiment] Social + technical context  
Step 3: [Synthesis] Balanced assessment

Output:
SENTIMENT: BULLISH|BEARISH|NEUTRAL
SENTIMENT_SCORE: -1.0 to 1.0
KEY_INSIGHTS: bullet points`;
    }

    protected buildCOTPrompt(context: AgentContext): string {
        const md = context.marketData || {};
        // Condensed prompt (~50% less tokens)
        const bias = [md.smcBias, md.ictBias, md.gannBias].filter(Boolean).join(', ') || 'None';

        return `${context.symbol || 'BTCUSDT'} | ${context.methodology || 'TA'}
Price: $${md.currentPrice || 'N/A'} | 24h: ${md.change24h?.toFixed(1) || 0}%
RSI: ${md.rsi?.toFixed(0) || 'N/A'} | MACD: ${md.macd?.toFixed(2) || 'N/A'}
OnChain: Netflow=${md.exchangeNetflow || 'N/A'}, Whales=${md.whaleTransactions || 'N/A'}
Bias: ${bias}

Analyze and provide: SENTIMENT, SENTIMENT_SCORE, KEY_INSIGHTS`;
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
        const response = await this.callAiModel(prompt, context.aiService);
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
