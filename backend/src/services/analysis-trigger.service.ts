/**
 * Analysis Trigger Service
 * 
 * "Smart Triggering" to reduce AI usage by 30%+
 * Only runs full analysis when market conditions change significantly.
 */

import { prisma } from '../utils/prisma.js';
import { marketDataService } from './market-data.service.js';

interface TriggerResult {
    shouldRun: boolean;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class AnalysisTriggerService {

    // Cache last analysis state to compare changes
    private lastAnalysisState: Map<string, {
        price: number;
        timestamp: number;
        rsi: number;
        trend: string;
    }> = new Map();

    /**
     * Determine if AI analysis is needed for a symbol
     */
    async shouldRunAnalysis(userId: string, symbol: string): Promise<TriggerResult> {
        // 1. Get recent market data (lightweight fetch)
        // We use a small window just to check price/indicators
        const marketData = await this.getQuickMarketData(symbol);

        if (!marketData) {
            return { shouldRun: true, reason: 'No market data available - safe fallback', priority: 'MEDIUM' };
        }

        const currentPrice = marketData.currentPrice;
        const now = Date.now();
        const stateKey = `${userId}:${symbol}`;
        const lastState = this.lastAnalysisState.get(stateKey);

        // 2. First run check
        if (!lastState) {
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: 'First analysis for session', priority: 'HIGH' };
        }

        // 3. Time-based decay (Force run every 4 hours regardless)
        const timeElapsed = now - lastState.timestamp;
        const hoursElapsed = timeElapsed / (1000 * 60 * 60);

        if (hoursElapsed >= 4) {
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: 'Scheduled 4h refresh', priority: 'MEDIUM' };
        }

        // 4. SMART TRIGGERS below this line

        // A. Significant Price Move (> 0.5% since last analysis)
        const priceChange = Math.abs((currentPrice - lastState.price) / lastState.price) * 100;
        if (priceChange > 0.5) {
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: `Price moved ${priceChange.toFixed(2)}%`, priority: 'HIGH' };
        }

        // B. RSI Cross/Extreme Trigger
        // If RSI crosses key levels (30/70) or enters extremes (<20/>80)
        const currentRsi = marketData.rsi || 50;
        const lastRsi = lastState.rsi;

        // Check for cross of 30 (Oversold)
        if ((lastRsi > 30 && currentRsi <= 30) || (lastRsi < 30 && currentRsi >= 30)) {
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: 'RSI crossing 30', priority: 'HIGH' };
        }

        // Check for cross of 70 (Overbought)
        if ((lastRsi < 70 && currentRsi >= 70) || (lastRsi > 70 && currentRsi <= 70)) {
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: 'RSI crossing 70', priority: 'HIGH' };
        }

        // Critical: Extreme RSI
        if (currentRsi < 20 || currentRsi > 80) {
            // Only trigger if we haven't analyzed recently (e.g. 1 hour) to avoid spamming on recurring extremes
            if (hoursElapsed > 1) {
                this.updateState(stateKey, marketData);
                return { shouldRun: true, reason: 'Extreme RSI detected', priority: 'CRITICAL' };
            }
        }

        // C. MACD Cross (if available in quick data)
        // (Simplified for now - requires history)

        // D. Positions Check
        // If user has OPEN positions, we might want to check more frequently
        const hasOpenPosition = await this.userHasPosition(userId, symbol);
        if (hasOpenPosition && hoursElapsed >= 1) {
            // For open positions, run every hour instead of 4
            this.updateState(stateKey, marketData);
            return { shouldRun: true, reason: 'Active position hourly monitoring', priority: 'HIGH' };
        }

        // 5. If no triggers met, SKIP analysis
        return { shouldRun: false, reason: 'No significant changes', priority: 'LOW' };
    }

    private updateState(key: string, data: any) {
        this.lastAnalysisState.set(key, {
            price: data.currentPrice,
            timestamp: Date.now(),
            rsi: data.rsi || 50,
            trend: 'NEUTRAL' // Placeholder
        });
    }

    private async getQuickMarketData(symbol: string) {
        try {
            // Fetch cached or quick data from market service
            // We use '1h' timeframe as baseline for triggers
            const klines = await marketDataService.getKlines(symbol, '1h', 50);
            if (!klines || klines.length === 0) return null;

            const close = klines[klines.length - 1].close;

            // Calculate quick RSI
            const rsi = this.calculateRSI(klines.map(k => k.close));

            return {
                currentPrice: close,
                rsi: rsi
            };
        } catch (e) {
            console.error('[TriggerService] Failed to get quick data', e);
            return null;
        }
    }

    private async userHasPosition(userId: string, symbol: string): Promise<boolean> {
        const count = await prisma.position.count({
            where: { userId, symbol, status: 'OPEN' }
        });
        return count > 0;
    }

    private calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
        }

        if (losses === 0) return 100;

        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
}

export const analysisTrigger = new AnalysisTriggerService();
