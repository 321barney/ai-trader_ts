/**
 * Sentiment Integration Service
 * 
 * Aggregates market sentiment from:
 * - News headlines
 * - Social media (Twitter/X)
 * - Fear & Greed Index
 * - Funding rates
 */

import { exchangeFactory } from './exchange.service.js';

export interface SentimentData {
    symbol: string;
    overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sentimentScore: number; // -100 to +100
    sources: SentimentSource[];
    lastUpdated: Date;
}

export interface SentimentSource {
    name: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number;
    confidence: number;
    details?: string;
}

export interface FearGreedIndex {
    value: number; // 0-100
    label: string; // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
    timestamp: Date;
}

class SentimentService {
    private cache: Map<string, { data: SentimentData; expires: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get aggregated sentiment for a symbol
     */
    async getSentiment(symbol: string): Promise<SentimentData> {
        // Check cache
        const cached = this.cache.get(symbol);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        const sources: SentimentSource[] = [];

        // 1. Funding rate sentiment
        const fundingSource = await this.getFundingSentiment(symbol);
        if (fundingSource) sources.push(fundingSource);

        // 2. Price momentum sentiment
        const momentumSource = await this.getPriceMomentum(symbol);
        if (momentumSource) sources.push(momentumSource);

        // 3. Fear & Greed (for BTC-correlated assets)
        if (symbol.includes('BTC') || symbol.includes('ETH')) {
            const fgSource = await this.getFearGreedSentiment();
            if (fgSource) sources.push(fgSource);
        }

        // Calculate overall sentiment
        const avgScore = sources.length > 0
            ? sources.reduce((s, src) => s + src.score, 0) / sources.length
            : 0;

        let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (avgScore > 20) overallSentiment = 'BULLISH';
        else if (avgScore < -20) overallSentiment = 'BEARISH';

        const data: SentimentData = {
            symbol,
            overallSentiment,
            sentimentScore: avgScore,
            sources,
            lastUpdated: new Date()
        };

        // Cache result
        this.cache.set(symbol, { data, expires: Date.now() + this.CACHE_TTL });

        return data;
    }

    /**
     * Get sentiment from funding rates
     */
    private async getFundingSentiment(symbol: string): Promise<SentimentSource | null> {
        try {
            // In production, fetch actual funding rate from exchange
            // Positive = more longs (potential for short squeeze or pullback)
            // Negative = more shorts (potential for long squeeze or rally)

            // Simulated funding rate for now
            const fundingRate = (Math.random() - 0.5) * 0.002; // -0.1% to +0.1%

            let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            let score = 0;

            if (fundingRate > 0.0005) {
                sentiment = 'BEARISH';
                score = -Math.min(50, fundingRate * 50000);
            } else if (fundingRate < -0.0005) {
                sentiment = 'BULLISH';
                score = Math.min(50, Math.abs(fundingRate) * 50000);
            }

            return {
                name: 'Funding Rate',
                sentiment,
                score,
                confidence: 70,
                details: `Funding: ${(fundingRate * 100).toFixed(4)}%`
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get sentiment from price momentum
     */
    private async getPriceMomentum(symbol: string): Promise<SentimentSource | null> {
        try {
            const klines = await exchangeFactory.getDefault().getKlines(symbol, '1h', 24);
            if (klines.length < 24) return null;

            const prices = klines.map(k => k.close);
            const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;

            let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            const score = Math.max(-100, Math.min(100, priceChange * 10));

            if (priceChange > 2) sentiment = 'BULLISH';
            else if (priceChange < -2) sentiment = 'BEARISH';

            return {
                name: '24h Momentum',
                sentiment,
                score,
                confidence: 80,
                details: `24h: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get Fear & Greed Index sentiment
     */
    private async getFearGreedSentiment(): Promise<SentimentSource | null> {
        try {
            // In production, fetch from Fear & Greed API (alternative.me)
            // For now, simulate based on market conditions
            const fgValue = 50 + Math.floor((Math.random() - 0.5) * 40);

            let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            let label = 'Neutral';

            if (fgValue < 25) {
                sentiment = 'BULLISH'; // Extreme fear = contrarian bullish
                label = 'Extreme Fear';
            } else if (fgValue < 40) {
                sentiment = 'NEUTRAL';
                label = 'Fear';
            } else if (fgValue < 60) {
                sentiment = 'NEUTRAL';
                label = 'Neutral';
            } else if (fgValue < 75) {
                sentiment = 'NEUTRAL';
                label = 'Greed';
            } else {
                sentiment = 'BEARISH'; // Extreme greed = contrarian bearish
                label = 'Extreme Greed';
            }

            // Contrarian score: extreme readings are opposite signals
            const score = fgValue < 30 ? 50 - fgValue
                : fgValue > 70 ? 50 - fgValue
                    : 0;

            return {
                name: 'Fear & Greed',
                sentiment,
                score,
                confidence: 60,
                details: `${label} (${fgValue})`
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if sentiment aligns with trade direction
     */
    async validateTradeSentiment(symbol: string, direction: 'LONG' | 'SHORT'): Promise<{
        aligned: boolean;
        sentiment: SentimentData;
        recommendation: string;
    }> {
        const sentiment = await this.getSentiment(symbol);

        const expectedSentiment = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
        const aligned = sentiment.overallSentiment === expectedSentiment ||
            sentiment.overallSentiment === 'NEUTRAL';

        let recommendation = '';
        if (!aligned) {
            recommendation = `Sentiment is ${sentiment.overallSentiment} but trade is ${direction}. Consider waiting or reducing size.`;
        } else if (sentiment.sentimentScore > 50 || sentiment.sentimentScore < -50) {
            recommendation = 'Strong sentiment alignment. Good confirmation.';
        } else {
            recommendation = 'Neutral sentiment. Proceed with caution.';
        }

        return { aligned, sentiment, recommendation };
    }
}

export const sentimentService = new SentimentService();
