/**
 * Market Data Service
 * 
 * Fetches OHLCV from AsterDex and calculates technical indicators
 * for DeepSeek analysis.
 */

import { asterService, OHLCV, Ticker } from './aster.service.js';

// Types
export interface TechnicalIndicators {
    rsi: number;
    macd: {
        macd: number;
        signal: number;
        histogram: number;
    };
    ema20: number;
    ema50: number;
    ema200: number;
    sma20: number;
    atr: number;
    bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
    };
    volumeProfile: {
        avgVolume: number;
        currentVolume: number;
        volumeRatio: number;
    };
}

export interface PriceLevel {
    price: number;
    strength: number;
    type: 'support' | 'resistance';
}

export interface AnalysisData {
    symbol: string;
    timestamp: number;

    // Current price info
    currentPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;

    // Recent candles (last 20 for context)
    recentCandles: {
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];

    // Technical indicators
    indicators: TechnicalIndicators;

    // Key levels
    levels: {
        supports: PriceLevel[];
        resistances: PriceLevel[];
    };

    // Trend analysis
    trend: {
        short: 'BULLISH' | 'BEARISH' | 'NEUTRAL';  // Based on EMA20 vs price
        medium: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // Based on EMA50
        long: 'BULLISH' | 'BEARISH' | 'NEUTRAL';   // Based on EMA200
    };

    // Raw OHLC arrays for advanced analysis
    highs: number[];
    lows: number[];
    closes: number[];
    opens: number[];
}

export class MarketDataService {

    // ============ Main Method ============

    /**
     * Get complete analysis data for a symbol
     */
    async getAnalysisData(symbol: string, interval: '1h' | '4h' | '1d' = '1h'): Promise<AnalysisData> {
        // Fetch data
        const [ohlcv, ticker] = await Promise.all([
            asterService.getKlines(symbol, interval, 200),
            asterService.getTicker(symbol),
        ]);

        // Calculate indicators
        const closes = ohlcv.map(k => k.close);
        const highs = ohlcv.map(k => k.high);
        const lows = ohlcv.map(k => k.low);
        const volumes = ohlcv.map(k => k.volume);

        const indicators = this.calculateIndicators(closes, highs, lows, volumes);
        const levels = this.detectLevels(ohlcv);
        const trend = this.analyzeTrend(ticker.price, indicators);

        // Format recent candles
        const recentCandles = ohlcv.slice(-20).map(k => ({
            time: new Date(k.openTime).toISOString(),
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
        }));

        return {
            symbol,
            timestamp: Date.now(),
            currentPrice: ticker.price,
            change24h: ticker.priceChangePercent,
            high24h: ticker.high24h,
            low24h: ticker.low24h,
            volume24h: ticker.volume24h,
            recentCandles,
            indicators,
            levels,
            trend,
            // Raw OHLC for Gann angle calculations
            highs,
            lows,
            closes,
            opens: ohlcv.map(k => k.open),
        };
    }

    // ============ Indicator Calculations ============

    private calculateIndicators(
        closes: number[],
        highs: number[],
        lows: number[],
        volumes: number[]
    ): TechnicalIndicators {
        return {
            rsi: this.calculateRSI(closes, 14),
            macd: this.calculateMACD(closes),
            ema20: this.calculateEMA(closes, 20),
            ema50: this.calculateEMA(closes, 50),
            ema200: this.calculateEMA(closes, 200),
            sma20: this.calculateSMA(closes, 20),
            atr: this.calculateATR(highs, lows, closes, 14),
            bollingerBands: this.calculateBollingerBands(closes, 20, 2),
            volumeProfile: this.calculateVolumeProfile(volumes),
        };
    }

    /**
     * RSI - Relative Strength Index
     */
    private calculateRSI(closes: number[], period = 14): number {
        if (closes.length < period + 1) return 50;

        const changes = [];
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }

        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // Smooth with Wilder's method
        for (let i = period; i < changes.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
    }

    /**
     * MACD - Moving Average Convergence Divergence
     */
    private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        const macd = ema12 - ema26;

        // Calculate signal line (9-period EMA of MACD)
        // Simplified: use current MACD as approximation
        const signal = macd * 0.9;
        const histogram = macd - signal;

        return {
            macd: Math.round(macd * 100) / 100,
            signal: Math.round(signal * 100) / 100,
            histogram: Math.round(histogram * 100) / 100,
        };
    }

    /**
     * EMA - Exponential Moving Average
     */
    private calculateEMA(data: number[], period: number): number {
        if (data.length < period) return data[data.length - 1];

        const multiplier = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
        }

        return Math.round(ema * 100) / 100;
    }

    /**
     * SMA - Simple Moving Average
     */
    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) return data[data.length - 1];
        const slice = data.slice(-period);
        return Math.round((slice.reduce((a, b) => a + b, 0) / period) * 100) / 100;
    }

    /**
     * ATR - Average True Range
     */
    private calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number {
        if (highs.length < period + 1) return 0;

        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const tr = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            );
            trueRanges.push(tr);
        }

        // Simple average of last N true ranges
        const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
        return Math.round(atr * 100) / 100;
    }

    /**
     * Bollinger Bands
     */
    private calculateBollingerBands(
        closes: number[],
        period = 20,
        stdDev = 2
    ): { upper: number; middle: number; lower: number } {
        const sma = this.calculateSMA(closes, period);
        const slice = closes.slice(-period);

        const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
        const std = Math.sqrt(variance);

        return {
            upper: Math.round((sma + std * stdDev) * 100) / 100,
            middle: sma,
            lower: Math.round((sma - std * stdDev) * 100) / 100,
        };
    }

    /**
     * Volume Profile
     */
    private calculateVolumeProfile(volumes: number[]): {
        avgVolume: number;
        currentVolume: number;
        volumeRatio: number;
    } {
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes[volumes.length - 1];
        const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

        return {
            avgVolume: Math.round(avgVolume),
            currentVolume: Math.round(currentVolume),
            volumeRatio: Math.round(volumeRatio * 100) / 100,
        };
    }

    // ============ Level Detection ============

    /**
     * Detect support and resistance levels
     */
    private detectLevels(ohlcv: OHLCV[]): { supports: PriceLevel[]; resistances: PriceLevel[] } {
        const supports: PriceLevel[] = [];
        const resistances: PriceLevel[] = [];

        // Look for swing lows and highs
        for (let i = 2; i < ohlcv.length - 2; i++) {
            const prev2Low = ohlcv[i - 2].low;
            const prev1Low = ohlcv[i - 1].low;
            const currLow = ohlcv[i].low;
            const next1Low = ohlcv[i + 1].low;
            const next2Low = ohlcv[i + 2].low;

            // Swing low = support
            if (currLow < prev1Low && currLow < prev2Low && currLow < next1Low && currLow < next2Low) {
                supports.push({ price: currLow, strength: 1, type: 'support' });
            }

            const prev2High = ohlcv[i - 2].high;
            const prev1High = ohlcv[i - 1].high;
            const currHigh = ohlcv[i].high;
            const next1High = ohlcv[i + 1].high;
            const next2High = ohlcv[i + 2].high;

            // Swing high = resistance
            if (currHigh > prev1High && currHigh > prev2High && currHigh > next1High && currHigh > next2High) {
                resistances.push({ price: currHigh, strength: 1, type: 'resistance' });
            }
        }

        // Cluster nearby levels and increase strength
        const clusteredSupports = this.clusterLevels(supports);
        const clusteredResistances = this.clusterLevels(resistances);

        // Return top 3 of each
        return {
            supports: clusteredSupports.slice(0, 3),
            resistances: clusteredResistances.slice(0, 3),
        };
    }

    /**
     * Cluster nearby price levels
     */
    private clusterLevels(levels: PriceLevel[]): PriceLevel[] {
        if (levels.length === 0) return [];

        const sorted = levels.sort((a, b) => a.price - b.price);
        const clustered: PriceLevel[] = [];
        const threshold = sorted[0].price * 0.005; // 0.5% threshold

        let current = { ...sorted[0] };

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].price - current.price < threshold) {
                // Same cluster, increase strength
                current.strength++;
                current.price = (current.price + sorted[i].price) / 2;
            } else {
                clustered.push(current);
                current = { ...sorted[i] };
            }
        }
        clustered.push(current);

        // Sort by strength
        return clustered.sort((a, b) => b.strength - a.strength);
    }

    // ============ Trend Analysis ============

    /**
     * Analyze trend based on EMA positions
     */
    private analyzeTrend(
        currentPrice: number,
        indicators: TechnicalIndicators
    ): { short: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; medium: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; long: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } {
        const { ema20, ema50, ema200 } = indicators;

        const shortTrend = currentPrice > ema20 * 1.001 ? 'BULLISH' : currentPrice < ema20 * 0.999 ? 'BEARISH' : 'NEUTRAL';
        const mediumTrend = currentPrice > ema50 * 1.002 ? 'BULLISH' : currentPrice < ema50 * 0.998 ? 'BEARISH' : 'NEUTRAL';
        const longTrend = ema200 > 0
            ? (currentPrice > ema200 * 1.005 ? 'BULLISH' : currentPrice < ema200 * 0.995 ? 'BEARISH' : 'NEUTRAL')
            : 'NEUTRAL';

        return {
            short: shortTrend,
            medium: mediumTrend,
            long: longTrend,
        };
    }

    /**
     * Format analysis data for DeepSeek prompt
     */
    formatForDeepSeek(data: AnalysisData): string {
        const candles = data.recentCandles.slice(-10).map(c =>
            `${c.time.split('T')[1].substring(0, 5)} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`
        ).join('\n');

        return `
MARKET DATA FOR ${data.symbol}
===============================
Current Price: ${data.currentPrice}
24h Change: ${data.change24h}%
24h High/Low: ${data.high24h} / ${data.low24h}
Volume 24h: ${data.volume24h}

TECHNICAL INDICATORS
--------------------
RSI(14): ${data.indicators.rsi}
MACD: ${data.indicators.macd.macd} | Signal: ${data.indicators.macd.signal} | Histogram: ${data.indicators.macd.histogram}
EMA20: ${data.indicators.ema20}
EMA50: ${data.indicators.ema50}
EMA200: ${data.indicators.ema200}
ATR(14): ${data.indicators.atr}
Bollinger: Upper ${data.indicators.bollingerBands.upper} | Middle ${data.indicators.bollingerBands.middle} | Lower ${data.indicators.bollingerBands.lower}
Volume Ratio: ${data.indicators.volumeProfile.volumeRatio}x average

TREND ANALYSIS
--------------
Short-term (EMA20): ${data.trend.short}
Medium-term (EMA50): ${data.trend.medium}
Long-term (EMA200): ${data.trend.long}

KEY LEVELS
----------
Support: ${data.levels.supports.map(s => s.price).join(', ') || 'None detected'}
Resistance: ${data.levels.resistances.map(r => r.price).join(', ') || 'None detected'}

RECENT CANDLES (Last 10)
------------------------
${candles}
`.trim();
    }
}

export const marketDataService = new MarketDataService();
