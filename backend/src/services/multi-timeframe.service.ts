/**
 * Multi-Timeframe Confirmation Service
 * 
 * Confirms signals across multiple timeframes:
 * - Higher timeframe trend alignment
 * - Entry timing on lower timeframe
 * - Confluence scoring
 */

import { exchangeFactory } from './exchange.service.js';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface TimeframeAnalysis {
    timeframe: Timeframe;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number; // 0-100
    supportLevels: number[];
    resistanceLevels: number[];
    keyPrice: number;
}

export interface ConfluenceResult {
    symbol: string;
    overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confluenceScore: number; // 0-100
    alignedTimeframes: number;
    totalTimeframes: number;
    analyses: TimeframeAnalysis[];
    tradingZone: 'SAFE' | 'CAUTION' | 'AVOID';
    entryRecommendation?: string;
}

class MultiTimeframeService {
    private readonly timeframes: Timeframe[] = ['1h', '4h', '1d'];

    /**
     * Analyze all configured timeframes
     */
    async analyzeSymbol(symbol: string): Promise<ConfluenceResult> {
        const analyses: TimeframeAnalysis[] = [];

        for (const tf of this.timeframes) {
            const analysis = await this.analyzeTimeframe(symbol, tf);
            analyses.push(analysis);
        }

        return this.calculateConfluence(symbol, analyses);
    }

    /**
     * Analyze a single timeframe
     */
    private async analyzeTimeframe(symbol: string, timeframe: Timeframe): Promise<TimeframeAnalysis> {
        try {
            const klines = await exchangeFactory.getDefault().getKlines(symbol, timeframe, 50);

            if (klines.length < 20) {
                return this.neutralAnalysis(timeframe);
            }

            // Calculate trend using EMA
            const closes = klines.map(k => k.close);
            const ema20 = this.calculateEMA(closes, 20);
            const ema50 = this.calculateEMA(closes, 50);
            const currentPrice = closes[closes.length - 1];

            // Determine trend
            let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
            let strength = 50;

            if (currentPrice > ema20 && ema20 > ema50) {
                trend = 'BULLISH';
                strength = Math.min(100, 60 + (currentPrice - ema20) / currentPrice * 500);
            } else if (currentPrice < ema20 && ema20 < ema50) {
                trend = 'BEARISH';
                strength = Math.min(100, 60 + (ema20 - currentPrice) / currentPrice * 500);
            }

            // Find support/resistance (simple pivot method)
            const { supports, resistances } = this.findSupportResistance(klines);

            return {
                timeframe,
                trend,
                strength,
                supportLevels: supports,
                resistanceLevels: resistances,
                keyPrice: currentPrice
            };
        } catch (error) {
            console.error(`[MTF] Error analyzing ${symbol} ${timeframe}:`, error);
            return this.neutralAnalysis(timeframe);
        }
    }

    /**
     * Calculate EMA
     */
    private calculateEMA(data: number[], period: number): number {
        if (data.length < period) return data[data.length - 1];

        const k = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
        }

        return ema;
    }

    /**
     * Find support and resistance levels
     */
    private findSupportResistance(klines: any[]): { supports: number[]; resistances: number[] } {
        const highs = klines.map(k => k.high);
        const lows = klines.map(k => k.low);
        const currentPrice = klines[klines.length - 1].close;

        // Simple: recent swing highs/lows
        const recentHigh = Math.max(...highs.slice(-20));
        const recentLow = Math.min(...lows.slice(-20));

        return {
            supports: [recentLow, recentLow * 0.98].filter(l => l < currentPrice),
            resistances: [recentHigh, recentHigh * 1.02].filter(r => r > currentPrice)
        };
    }

    /**
     * Calculate overall confluence
     */
    private calculateConfluence(symbol: string, analyses: TimeframeAnalysis[]): ConfluenceResult {
        const bullishCount = analyses.filter(a => a.trend === 'BULLISH').length;
        const bearishCount = analyses.filter(a => a.trend === 'BEARISH').length;

        let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        let alignedTimeframes = 0;

        if (bullishCount > bearishCount && bullishCount >= analyses.length / 2) {
            overallBias = 'BULLISH';
            alignedTimeframes = bullishCount;
        } else if (bearishCount > bullishCount && bearishCount >= analyses.length / 2) {
            overallBias = 'BEARISH';
            alignedTimeframes = bearishCount;
        }

        const confluenceScore = (alignedTimeframes / analyses.length) * 100;

        // Trading zone based on confluence
        let tradingZone: 'SAFE' | 'CAUTION' | 'AVOID' = 'AVOID';
        if (confluenceScore >= 75) tradingZone = 'SAFE';
        else if (confluenceScore >= 50) tradingZone = 'CAUTION';

        // Entry recommendation
        let entryRecommendation: string | undefined;
        if (tradingZone === 'SAFE') {
            if (overallBias === 'BULLISH') {
                entryRecommendation = 'Look for pullback to support for LONG entry';
            } else if (overallBias === 'BEARISH') {
                entryRecommendation = 'Look for rally to resistance for SHORT entry';
            }
        }

        return {
            symbol,
            overallBias,
            confluenceScore,
            alignedTimeframes,
            totalTimeframes: analyses.length,
            analyses,
            tradingZone,
            entryRecommendation
        };
    }

    /**
     * Neutral analysis fallback
     */
    private neutralAnalysis(timeframe: Timeframe): TimeframeAnalysis {
        return {
            timeframe,
            trend: 'NEUTRAL',
            strength: 50,
            supportLevels: [],
            resistanceLevels: [],
            keyPrice: 0
        };
    }

    /**
     * Quick confluence check for signal validation
     */
    async validateSignal(symbol: string, direction: 'LONG' | 'SHORT'): Promise<{ valid: boolean; score: number; reason: string }> {
        const result = await this.analyzeSymbol(symbol);

        const expectedBias = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
        const valid = result.overallBias === expectedBias && result.confluenceScore >= 50;

        return {
            valid,
            score: result.confluenceScore,
            reason: valid
                ? `${result.alignedTimeframes}/${result.totalTimeframes} timeframes aligned`
                : `Confluence too low: ${result.overallBias} bias vs ${direction} signal`
        };
    }
}

export const multiTimeframeService = new MultiTimeframeService();
