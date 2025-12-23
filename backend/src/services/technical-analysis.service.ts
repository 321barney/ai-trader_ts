
import { RSI, MACD, BollingerBands, ATR, SMA, EMA } from 'technicalindicators';

export interface OrderBlock {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    strength: number;
    index: number;
}

export interface FairValueGap {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    size: number;
    index: number;
}

export class TechnicalAnalysisService {
    /**
     * Calculate RSI
     */
    static calculateRSI(closes: number[], period: number = 14): number[] {
        if (closes.length < period) return [];
        return RSI.calculate({
            values: closes,
            period: period
        });
    }

    /**
     * Calculate MACD
     */
    static calculateMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (closes.length < slowPeriod) return [];
        return MACD.calculate({
            values: closes,
            fastPeriod,
            slowPeriod,
            signalPeriod,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
    }

    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(closes: number[], period = 20, stdDev = 2) {
        if (closes.length < period) return [];
        return BollingerBands.calculate({
            values: closes,
            period,
            stdDev
        });
    }

    /**
     * Calculate ATR
     */
    static calculateATR(highs: number[], lows: number[], closes: number[], period = 14) {
        if (closes.length < period) return [];
        return ATR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period
        });
    }

    // ============ SMC (Smart Money Concepts) ============

    /**
     * Detect Order Blocks (SMC)
     * An order block is the last bullish/bearish candle before a significant move
     */
    static detectOrderBlocks(highs: number[], lows: number[], closes: number[], opens: number[]): OrderBlock[] {
        const orderBlocks: OrderBlock[] = [];
        const threshold = 0.005; // 0.5% move threshold

        for (let i = 2; i < closes.length; i++) {
            const prevCandleBullish = closes[i - 1] > opens[i - 1];
            const prevCandleBearish = closes[i - 1] < opens[i - 1];
            const currentMove = (closes[i] - closes[i - 1]) / closes[i - 1];

            // Bullish Order Block: bearish candle followed by strong bullish move
            if (prevCandleBearish && currentMove > threshold) {
                orderBlocks.push({
                    type: 'BULLISH',
                    high: highs[i - 1],
                    low: lows[i - 1],
                    strength: currentMove,
                    index: i - 1
                });
            }

            // Bearish Order Block: bullish candle followed by strong bearish move
            if (prevCandleBullish && currentMove < -threshold) {
                orderBlocks.push({
                    type: 'BEARISH',
                    high: highs[i - 1],
                    low: lows[i - 1],
                    strength: Math.abs(currentMove),
                    index: i - 1
                });
            }
        }

        return orderBlocks.slice(-5); // Return last 5 order blocks
    }

    /**
     * Detect Fair Value Gaps (FVG) - SMC
     * Gap between wick of candle 1 and wick of candle 3
     */
    static detectFVG(highs: number[], lows: number[]): FairValueGap[] {
        const fvgs: FairValueGap[] = [];

        for (let i = 2; i < highs.length; i++) {
            // Bullish FVG: Low of candle 3 > High of candle 1
            if (lows[i] > highs[i - 2]) {
                fvgs.push({
                    type: 'BULLISH',
                    high: lows[i],
                    low: highs[i - 2],
                    size: lows[i] - highs[i - 2],
                    index: i
                });
            }

            // Bearish FVG: High of candle 3 < Low of candle 1
            if (highs[i] < lows[i - 2]) {
                fvgs.push({
                    type: 'BEARISH',
                    high: lows[i - 2],
                    low: highs[i],
                    size: lows[i - 2] - highs[i],
                    index: i
                });
            }
        }

        return fvgs.slice(-5);
    }

    /**
     * Detect Break of Structure (BOS) - SMC
     */
    static detectBOS(highs: number[], lows: number[]): { direction: 'BULLISH' | 'BEARISH' | 'NONE'; level: number } {
        if (highs.length < 20) return { direction: 'NONE', level: 0 };

        const recentHigh = Math.max(...highs.slice(-10));
        const recentLow = Math.min(...lows.slice(-10));
        const prevHigh = Math.max(...highs.slice(-20, -10));
        const prevLow = Math.min(...lows.slice(-20, -10));

        if (recentHigh > prevHigh) {
            return { direction: 'BULLISH', level: prevHigh };
        } else if (recentLow < prevLow) {
            return { direction: 'BEARISH', level: prevLow };
        }

        return { direction: 'NONE', level: 0 };
    }

    // ============ ICT (Inner Circle Trader) ============

    /**
     * ICT Optimal Trade Entry (OTE) - 61.8% - 79% Fib retracement
     */
    static calculateOTE(highs: number[], lows: number[]): { oteZoneHigh: number; oteZoneLow: number; direction: string } {
        const lookback = 50; // Increased from 20 to capture significant swings
        const swingHigh = Math.max(...highs.slice(-lookback));
        const swingLow = Math.min(...lows.slice(-lookback));
        const range = swingHigh - swingLow;

        // OTE zone is 61.8% to 79% retracement
        const oteHigh = swingLow + (range * 0.79);
        const oteLow = swingLow + (range * 0.618);

        const currentPrice = highs[highs.length - 1];
        const direction = currentPrice > (swingHigh + swingLow) / 2 ? 'BULLISH_RETRACE' : 'BEARISH_RETRACE';

        return { oteZoneHigh: oteHigh, oteZoneLow: oteLow, direction };
    }

    /**
     * ICT Kill Zones (High probability trading times)
     */
    static getKillZone(): { zone: string; active: boolean } {
        const now = new Date();
        const hour = now.getUTCHours();

        // London Kill Zone: 07:00 - 09:00 UTC
        if (hour >= 7 && hour < 9) {
            return { zone: 'LONDON', active: true };
        }
        // New York Kill Zone: 13:00 - 15:00 UTC
        if (hour >= 13 && hour < 15) {
            return { zone: 'NEW_YORK', active: true };
        }
        // Asian Kill Zone: 00:00 - 02:00 UTC
        if (hour >= 0 && hour < 2) {
            return { zone: 'ASIAN', active: true };
        }

        return { zone: 'NONE', active: false };
    }

    // ============ GANN ============

    /**
     * Gann Angles (1x1, 2x1, 1x2)
     * Uses Volatility (ATR) as the "Price Unit" per "Time Unit" (Slope)
     */
    static calculateGannLevels(pivotPrice: number, barsSincePivot: number, volatility: number): { angle1x1: number; angle2x1: number; angle1x2: number } {
        // Standard Gann: 1x1 = 1 Price Unit per 1 Time Unit
        // We use ATR as the Price Unit to adapt to volatility
        const slope = volatility;

        return {
            angle1x1: pivotPrice + (barsSincePivot * slope),       // 45 degree (1x1)
            angle2x1: pivotPrice + (barsSincePivot * slope * 2),   // Steeper (2x1)
            angle1x2: pivotPrice + (barsSincePivot * slope * 0.5), // Flatter (1x2)
        };
    }

    /**
     * Gann Square of 9 (Natural support/resistance levels)
     */
    static calculateGannSquare9(price: number): number[] {
        const sqrt = Math.sqrt(price);
        const levels: number[] = [];

        for (let i = -2; i <= 2; i++) {
            const level = Math.pow(sqrt + (i * 0.25), 2);
            levels.push(Math.round(level * 100) / 100);
        }

        return levels;
    }

    /**
     * Get Comprehensive Analysis with Strategy-Specific Indicators
     */
    static analyze(highs: number[], lows: number[], closes: number[], opens?: number[], methodology?: string) {
        const rsi = this.calculateRSI(closes);
        const macd = this.calculateMACD(closes);
        const bb = this.calculateBollingerBands(closes);
        const atr = this.calculateATR(highs, lows, closes);

        // Get latest values
        const currentRSI = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
        const currentMACD = macd.length > 0 ? macd[macd.length - 1] : { MACD: 0, signal: 0, histogram: 0 };
        const currentBB = bb.length > 0 ? bb[bb.length - 1] : { upper: 0, middle: 0, lower: 0 };
        const currentATR = atr.length > 0 ? atr[atr.length - 1] : 0;
        const currentPrice = closes[closes.length - 1];

        // Base result
        const result: any = {
            rsi: currentRSI,
            macd: currentMACD,
            bollinger: currentBB,
            atr: currentATR,
            methodology: methodology || 'GENERIC'
        };

        // Add strategy-specific analysis
        const openPrices = opens || closes.map((c, i) => i > 0 ? closes[i - 1] : c);

        switch (methodology?.toUpperCase()) {
            case 'SMC':
                result.orderBlocks = this.detectOrderBlocks(highs, lows, closes, openPrices);
                result.fairValueGaps = this.detectFVG(highs, lows);
                result.breakOfStructure = this.detectBOS(highs, lows);
                result.smcBias = result.breakOfStructure.direction;
                break;

            case 'ICT':
                result.ote = this.calculateOTE(highs, lows);
                result.killZone = this.getKillZone();
                result.orderBlocks = this.detectOrderBlocks(highs, lows, closes, openPrices);
                result.fairValueGaps = this.detectFVG(highs, lows);
                result.ictBias = result.ote.direction;
                break;

            case 'GANN':
                // Find pivot low in recent history
                const lookback = 50;
                const recentLows = lows.slice(-lookback);
                const pivotPrice = Math.min(...recentLows);

                // Calculate time delta (bars since pivot)
                // lastIndexOf finds the most recent occurrence if multiple exist
                const pivotIndexInSlice = recentLows.lastIndexOf(pivotPrice);
                const barsSincePivot = lookback - 1 - pivotIndexInSlice;

                // Use ATR for dynamic slope, or fallback to 1% of price if ATR not ready
                const slope = currentATR || (currentPrice * 0.01);

                result.gannLevels = this.calculateGannLevels(pivotPrice, barsSincePivot, slope);
                result.gannSquare9 = this.calculateGannSquare9(currentPrice);

                // Bias: Price above 1x1 is Bullish, below is Bearish
                result.gannBias = currentPrice > result.gannLevels.angle1x1 ? 'BULLISH' : 'BEARISH';
                break;

            default:
                // Generic - just use standard indicators
                break;
        }

        return result;
    }
}
