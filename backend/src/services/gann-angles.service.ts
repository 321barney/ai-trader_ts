/**
 * Gann Angle Calculation Service
 * 
 * True geometric angle calculations for market analysis:
 * - 1x1 = 45° (balanced trend)
 * - 2x1 = 63.75° (strong bullish)
 * - 1x2 = 26.25° (bearish)
 * - Full fan from 1x8 to 8x1
 */

export interface GannAngle {
    name: string;           // "1x1", "2x1", etc.
    degree: number;         // 45, 63.75, etc.
    priceLevel: number;     // Current support/resistance level
    slope: number;          // Price change per bar
    direction: 'UP' | 'DOWN';
}

export interface SwingPivot {
    price: number;
    barIndex: number;
    type: 'HIGH' | 'LOW';
    strength: number;       // How significant (bars since break)
}

export interface GannFan {
    pivot: SwingPivot;
    angles: GannAngle[];
    currentBar: number;
    currentPrice: number;
    nearestSupport: number;
    nearestResistance: number;
    trendAngle: number;     // Current price trend in degrees
}

export interface PriceTimeRatio {
    ratio: number;          // Price units per time unit
    scaleFactor: number;    // ATR-based dynamic scaling
    currentAngle: number;   // Current trend angle in degrees
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// Standard Gann angle ratios with their degrees
const GANN_ANGLES = [
    { ratio: '8x1', priceUnits: 8, timeUnits: 1, degree: 82.5 },
    { ratio: '4x1', priceUnits: 4, timeUnits: 1, degree: 75.0 },
    { ratio: '3x1', priceUnits: 3, timeUnits: 1, degree: 71.25 },
    { ratio: '2x1', priceUnits: 2, timeUnits: 1, degree: 63.75 },
    { ratio: '1x1', priceUnits: 1, timeUnits: 1, degree: 45.0 },  // Key level
    { ratio: '1x2', priceUnits: 1, timeUnits: 2, degree: 26.25 },
    { ratio: '1x3', priceUnits: 1, timeUnits: 3, degree: 18.75 },
    { ratio: '1x4', priceUnits: 1, timeUnits: 4, degree: 15.0 },
    { ratio: '1x8', priceUnits: 1, timeUnits: 8, degree: 7.5 },
];

class GannAnglesService {

    /**
     * Detect significant swing pivots (highs and lows)
     */
    detectSwingPivots(
        highs: number[],
        lows: number[],
        lookback: number = 5
    ): { swingHighs: SwingPivot[]; swingLows: SwingPivot[] } {
        const swingHighs: SwingPivot[] = [];
        const swingLows: SwingPivot[] = [];

        for (let i = lookback; i < highs.length - lookback; i++) {
            // Check for swing high
            let isSwingHigh = true;
            let isSwingLow = true;

            for (let j = 1; j <= lookback; j++) {
                if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) {
                    isSwingHigh = false;
                }
                if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) {
                    isSwingLow = false;
                }
            }

            if (isSwingHigh) {
                swingHighs.push({
                    price: highs[i],
                    barIndex: i,
                    type: 'HIGH',
                    strength: lookback
                });
            }

            if (isSwingLow) {
                swingLows.push({
                    price: lows[i],
                    barIndex: i,
                    type: 'LOW',
                    strength: lookback
                });
            }
        }

        return { swingHighs, swingLows };
    }

    /**
     * Calculate price/time ratio and convert to angle
     */
    calculatePriceTimeRatio(
        startPrice: number,
        endPrice: number,
        bars: number,
        scaleFactor: number  // ATR or average bar range
    ): PriceTimeRatio {
        if (bars === 0 || scaleFactor === 0) {
            return { ratio: 1, scaleFactor, currentAngle: 45, bias: 'NEUTRAL' };
        }

        const priceChange = endPrice - startPrice;
        const normalizedChange = priceChange / scaleFactor;  // Normalize by volatility
        const ratio = normalizedChange / bars;

        // Convert ratio to angle (arctan)
        const angleRadians = Math.atan(Math.abs(ratio));
        const angleDegrees = (angleRadians * 180) / Math.PI;

        let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        if (priceChange > 0 && angleDegrees > 45) {
            bias = 'BULLISH';
        } else if (priceChange < 0 || angleDegrees < 45) {
            bias = 'BEARISH';
        } else {
            bias = 'NEUTRAL';
        }

        return {
            ratio: Math.abs(ratio),
            scaleFactor,
            currentAngle: angleDegrees * Math.sign(priceChange) || 0,
            bias
        };
    }

    /**
     * Calculate Gann Fan from a pivot point
     * Returns ascending angles from LOW pivot, descending from HIGH pivot
     */
    calculateGannFan(
        pivot: SwingPivot,
        currentBar: number,
        currentPrice: number,
        scaleFactor: number  // ATR for proper scaling
    ): GannFan {
        const barsSincePivot = currentBar - pivot.barIndex;
        const angles: GannAngle[] = [];

        for (const angle of GANN_ANGLES) {
            // Slope = (Price Units / Time Units) * Scale Factor
            const slope = (angle.priceUnits / angle.timeUnits) * scaleFactor;

            let priceLevel: number;
            let direction: 'UP' | 'DOWN';

            if (pivot.type === 'LOW') {
                // Ascending angles from low pivot
                priceLevel = pivot.price + (slope * barsSincePivot);
                direction = 'UP';
            } else {
                // Descending angles from high pivot
                priceLevel = pivot.price - (slope * barsSincePivot);
                direction = 'DOWN';
            }

            angles.push({
                name: angle.ratio,
                degree: angle.degree,
                priceLevel,
                slope,
                direction
            });
        }

        // Find nearest support and resistance from angle levels
        const sortedLevels = angles.map(a => a.priceLevel).sort((a, b) => a - b);

        let nearestSupport = sortedLevels[0];
        let nearestResistance = sortedLevels[sortedLevels.length - 1];

        for (const level of sortedLevels) {
            if (level < currentPrice && level > nearestSupport) {
                nearestSupport = level;
            }
            if (level > currentPrice && level < nearestResistance) {
                nearestResistance = level;
            }
        }

        // Calculate current trend angle
        const trendRatio = this.calculatePriceTimeRatio(
            pivot.price,
            currentPrice,
            barsSincePivot,
            scaleFactor
        );

        return {
            pivot,
            angles,
            currentBar,
            currentPrice,
            nearestSupport,
            nearestResistance,
            trendAngle: trendRatio.currentAngle
        };
    }

    /**
     * Get complete Gann analysis for market data
     */
    analyze(
        highs: number[],
        lows: number[],
        closes: number[],
        atr: number
    ): {
        bullishFan: GannFan | null;
        bearishFan: GannFan | null;
        priceTimeRatio: PriceTimeRatio;
        keyLevels: { level: number; angle: string; type: 'SUPPORT' | 'RESISTANCE' }[];
        trendAngle: number;
        trendBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    } {
        const currentBar = closes.length - 1;
        const currentPrice = closes[currentBar];
        const scaleFactor = atr || currentPrice * 0.01;  // Fallback to 1% of price

        // Find recent pivots
        const { swingHighs, swingLows } = this.detectSwingPivots(highs, lows, 5);

        // Get most recent significant pivots
        const recentHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null;
        const recentLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : null;

        // Calculate fans from both pivots
        let bullishFan: GannFan | null = null;
        let bearishFan: GannFan | null = null;

        if (recentLow) {
            bullishFan = this.calculateGannFan(recentLow, currentBar, currentPrice, scaleFactor);
        }

        if (recentHigh) {
            bearishFan = this.calculateGannFan(recentHigh, currentBar, currentPrice, scaleFactor);
        }

        // Calculate overall price/time ratio from recent swing
        let priceTimeRatio: PriceTimeRatio;
        const lookback = 20;
        const startIdx = Math.max(0, currentBar - lookback);

        priceTimeRatio = this.calculatePriceTimeRatio(
            closes[startIdx],
            currentPrice,
            lookback,
            scaleFactor
        );

        // Collect key levels from both fans
        const keyLevels: { level: number; angle: string; type: 'SUPPORT' | 'RESISTANCE' }[] = [];

        if (bullishFan) {
            for (const angle of bullishFan.angles) {
                keyLevels.push({
                    level: angle.priceLevel,
                    angle: angle.name,
                    type: angle.priceLevel < currentPrice ? 'SUPPORT' : 'RESISTANCE'
                });
            }
        }

        if (bearishFan) {
            for (const angle of bearishFan.angles) {
                keyLevels.push({
                    level: angle.priceLevel,
                    angle: angle.name,
                    type: angle.priceLevel < currentPrice ? 'SUPPORT' : 'RESISTANCE'
                });
            }
        }

        // Sort key levels by distance from current price
        keyLevels.sort((a, b) =>
            Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice)
        );

        // Determine trend bias based on angle
        let trendBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        const trendAngle = priceTimeRatio.currentAngle;

        if (trendAngle > 50) {
            trendBias = 'BULLISH';
        } else if (trendAngle < 40 || trendAngle < 0) {
            trendBias = 'BEARISH';
        } else {
            trendBias = 'NEUTRAL';
        }

        return {
            bullishFan,
            bearishFan,
            priceTimeRatio,
            keyLevels: keyLevels.slice(0, 10),  // Top 10 closest levels
            trendAngle,
            trendBias
        };
    }

    /**
     * Format angle data for agent context/prompt
     */
    formatForAgent(analysis: ReturnType<typeof this.analyze>): string {
        const { bullishFan, bearishFan, priceTimeRatio, keyLevels, trendAngle, trendBias } = analysis;

        let output = `
=== GANN ANGLE ANALYSIS ===
Current Trend Angle: ${Math.abs(trendAngle).toFixed(1)}° (${trendBias})
Price/Time Ratio: ${priceTimeRatio.ratio.toFixed(2)} (${priceTimeRatio.bias})
`;

        if (bullishFan) {
            const oneByOne = bullishFan.angles.find(a => a.name === '1x1');
            output += `
ASCENDING FAN (from $${bullishFan.pivot.price.toFixed(2)}):
- 1x1 (45°) Level: $${oneByOne?.priceLevel.toFixed(2) || 'N/A'}
- Nearest Support: $${bullishFan.nearestSupport.toFixed(2)}
- Price ${bullishFan.currentPrice > (oneByOne?.priceLevel || 0) ? 'ABOVE' : 'BELOW'} 1x1 line
`;
        }

        if (bearishFan) {
            const oneByOne = bearishFan.angles.find(a => a.name === '1x1');
            output += `
DESCENDING FAN (from $${bearishFan.pivot.price.toFixed(2)}):
- 1x1 (45°) Level: $${oneByOne?.priceLevel.toFixed(2) || 'N/A'}
- Nearest Resistance: $${bearishFan.nearestResistance.toFixed(2)}
`;
        }

        // Key levels
        output += `
KEY ANGLE LEVELS:`;
        for (const level of keyLevels.slice(0, 5)) {
            output += `
- ${level.type}: $${level.level.toFixed(2)} (${level.angle} angle)`;
        }

        output += `

TRADING RULES:
- Price ABOVE 1x1 = Bullish, look for LONG entries
- Price BELOW 1x1 = Bearish, look for SHORT entries
- Trend angle > 63° = Very strong trend, follow momentum
- Trend angle < 26° = Weak trend, expect reversal`;

        return output;
    }
}

export const gannAnglesService = new GannAnglesService();
