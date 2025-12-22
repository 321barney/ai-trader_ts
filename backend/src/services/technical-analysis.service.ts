
import { RSI, MACD, BollingerBands, ATR } from 'technicalindicators';

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

    /**
     * Get Comprehensive Analysis
     * Returns the latest values for all indicators
     */
    static analyze(highs: number[], lows: number[], closes: number[]) {
        const rsi = this.calculateRSI(closes);
        const macd = this.calculateMACD(closes);
        const bb = this.calculateBollingerBands(closes);
        const atr = this.calculateATR(highs, lows, closes);

        // Get latest values
        const currentRSI = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
        const currentMACD = macd.length > 0 ? macd[macd.length - 1] : { MACD: 0, signal: 0, histogram: 0 };
        const currentBB = bb.length > 0 ? bb[bb.length - 1] : { upper: 0, middle: 0, lower: 0 };
        const currentATR = atr.length > 0 ? atr[atr.length - 1] : 0;

        return {
            rsi: currentRSI,
            macd: currentMACD,
            bollinger: currentBB,
            atr: currentATR
        };
    }
}
