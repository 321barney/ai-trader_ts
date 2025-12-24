/**
 * Scheduler Service
 * 
 * Handles automated scheduled tasks:
 * - Market Analysis: High-frequency polling (1m) with Candle Close triggers
 * - Model Refresh: Monthly
 * - Drawdown Check: Every hour
 */

import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { modelService } from './model.service.js';
import { AsterService } from './aster.service.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { tradingService } from './trading.service.js';

// Multi-TF data requirements
const TF_CONFIG = {
    '5m': { interval: '5m' as const, minBars: 10 },
    '15m': { interval: '15m' as const, minBars: 5 },
    '1h': { interval: '1h' as const, minBars: 4 },
    '4h': { interval: '4h' as const, minBars: 12 }
};

export interface MultiTFData {
    symbol: string;
    timeframes: {
        tf5m: any[];
        tf15m: any[];
        tf1h: any[];
        tf4h: any[];
    };
    fetchedAt: Date;
}

export class SchedulerService {
    private orchestrator: AgentOrchestrator;
    private isRunning: boolean = false;

    constructor() {
        this.orchestrator = new AgentOrchestrator();
    }

    /**
     * Initialize all scheduled jobs
     */
    start() {
        if (this.isRunning) {
            console.log('[Scheduler] Already running');
            return;
        }

        console.log('[Scheduler] Starting scheduled jobs...');

        // Market Analysis: Start fast polling (Every minute)
        cron.schedule('* * * * *', () => {
            this.runMarketAnalysisForAllUsers();
        });

        // Drawdown Check: Every hour
        cron.schedule('0 * * * *', () => {
            this.checkDrawdownForAllUsers();
        });

        // Model Refresh: 1st of every month at 00:00
        cron.schedule('0 0 1 * *', () => {
            this.triggerMonthlyModelRefresh();
        });

        this.isRunning = true;
        console.log('[Scheduler] All jobs scheduled');
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        console.log('[Scheduler] Stopping all jobs');
        this.isRunning = false;
    }

    /**
     * Fetch multi-timeframe data for a symbol
     */
    async fetchMultiTFData(symbol: string, apiKey?: string, apiSecret?: string): Promise<MultiTFData> {
        const aster = new AsterService(apiKey, apiSecret);

        console.log(`[Scheduler] Fetching multi-TF data for ${symbol}...`);

        const [tf5m, tf15m, tf1h, tf4h] = await Promise.all([
            aster.getKlines(symbol, '5m', TF_CONFIG['5m'].minBars + 5),
            aster.getKlines(symbol, '15m', TF_CONFIG['15m'].minBars + 5),
            aster.getKlines(symbol, '1h', TF_CONFIG['1h'].minBars + 5),
            aster.getKlines(symbol, '4h', TF_CONFIG['4h'].minBars + 5)
        ]);

        console.log(`[Scheduler] Fetched: 5m=${tf5m.length}, 15m=${tf15m.length}, 1h=${tf1h.length}, 4h=${tf4h.length}`);

        return {
            symbol,
            timeframes: { tf5m, tf15m, tf1h, tf4h },
            fetchedAt: new Date()
        };
    }

    /**
     * Run market analysis for all active users
     */
    async runMarketAnalysisForAllUsers() {
        console.log('[Scheduler] Polling for analysis triggers...');
        const now = new Date();
        const minutes = now.getMinutes();
        const hours = now.getHours();

        try {
            const users = await prisma.user.findMany({
                where: { tradingEnabled: true },
                select: {
                    id: true,
                    selectedPairs: true,
                    asterApiKey: true,
                    asterApiSecret: true,
                    methodology: true
                }
            });

            for (const user of users) {
                try {
                    // Check for active TRADING MODEL first (Source of Truth for Timeframes)
                    const activeModel = await modelService.getActiveModel(user.id);
                    // Default to 1h if no model (legacy support)
                    const timeframes = activeModel?.timeframes || ['1h'];

                    let shouldTrigger = false;
                    let triggerReason = '';

                    // Check if any timeframe just closed
                    if (timeframes.includes('1m')) {
                        shouldTrigger = true; // Always trigger for 1m
                        triggerReason = '1m candle';
                    } else if (timeframes.includes('5m') && minutes % 5 === 0) {
                        shouldTrigger = true;
                        triggerReason = '5m candle';
                    } else if (timeframes.includes('15m') && minutes % 15 === 0) {
                        shouldTrigger = true;
                        triggerReason = '15m candle';
                    } else if (timeframes.includes('1h') && minutes === 0) {
                        shouldTrigger = true;
                        triggerReason = '1h candle';
                    } else if (timeframes.includes('4h') && minutes === 0 && hours % 4 === 0) {
                        shouldTrigger = true;
                        triggerReason = '4h candle';
                    }

                    if (shouldTrigger) {
                        console.log(`[Scheduler] Triggering analysis for User ${user.id} (${triggerReason} closed)`);

                        const pairs = (user.selectedPairs as string[]) || ['BTCUSDT'];

                        for (const symbol of pairs.slice(0, 3)) {
                            // Fetch Data
                            const multiTF = await this.fetchMultiTFData(
                                symbol,
                                user.asterApiKey || undefined,
                                user.asterApiSecret || undefined
                            );

                            // Execute Analysis
                            await tradingService.executeScheduledAnalysis(
                                user.id,
                                symbol,
                                multiTF
                            );
                        }
                    } else {
                        // Optional: verbose logging for debugging
                        // console.log(`[Scheduler] User ${user.id}: Waiting for candle close (TFs: ${timeframes.join(',')})`);
                    }

                } catch (error) {
                    console.error(`[Scheduler] Error for user ${user.id}:`, error);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Market analysis job failed:', error);
        }
    }

    /**
     * Check drawdown for all users with active models
     */
    async checkDrawdownForAllUsers() {
        console.log('[Scheduler] Checking drawdown for all active models...');

        try {
            const usersWithActiveModels = await prisma.user.findMany({
                where: { tradingEnabled: true },
                select: { id: true, asterApiKey: true, asterApiSecret: true }
            });

            for (const user of usersWithActiveModels) {
                try {
                    const activeModel = await modelService.getActiveModel(user.id);
                    if (!activeModel) continue;

                    // Get current portfolio value (simplified - would need actual balance)
                    const aster = new AsterService(
                        user.asterApiKey || undefined,
                        user.asterApiSecret || undefined
                    );

                    const balances = await aster.getBalance().catch(() => []);
                    const totalValue = balances.reduce((sum, b) => sum + b.total, 0);

                    // Assume peak is 10% higher for now (would track actual peak)
                    const peakValue = totalValue * 1.1;

                    await this.orchestrator.checkAndUpdateDrawdown(
                        user.id,
                        totalValue,
                        peakValue
                    );
                } catch (error) {
                    console.error(`[Scheduler] Drawdown check failed for user ${user.id}:`, error);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Drawdown check job failed:', error);
        }
    }

    /**
     * Trigger monthly model refresh for all users
     */
    async triggerMonthlyModelRefresh() {
        console.log('[Scheduler] Triggering monthly model refresh...');

        try {
            const users = await prisma.user.findMany({
                where: { tradingEnabled: true },
                select: { id: true, methodology: true, selectedPairs: true }
            });

            for (const user of users) {
                try {
                    // Check if model is expired
                    const needsRefresh = await modelService.checkModelExpiry(user.id);

                    if (needsRefresh) {
                        console.log(`[Scheduler] User ${user.id} needs model refresh`);

                        // Create new draft model
                        await modelService.createModel(
                            user.id,
                            user.methodology,
                            {
                                entryRules: { indicators: ['RSI', 'MACD', 'EMA'], conditions: [] },
                                exitRules: { stopLossPercent: 2, takeProfitPercent: 4 },
                                timeframes: ['5m', '15m', '1h', '4h'],
                                methodology: user.methodology,
                                riskPerTrade: 2
                            }
                        );
                    }
                } catch (error) {
                    console.error(`[Scheduler] Model refresh failed for user ${user.id}:`, error);
                }
            }
        } catch (error) {
            console.error('[Scheduler] Monthly refresh job failed:', error);
        }
    }

    /**
     * Aggregate multi-TF data into market data object
     */
    private aggregateMultiTFData(multiTF: MultiTFData): any {
        const tf1h = multiTF.timeframes.tf1h;
        const latest = tf1h[tf1h.length - 1] || {};

        return {
            currentPrice: latest.close,
            high24h: Math.max(...tf1h.slice(-24).map(c => c.high || 0)),
            low24h: Math.min(...tf1h.slice(-24).map(c => c.low || Infinity)),
            volume: tf1h.slice(-24).reduce((sum, c) => sum + (c.volume || 0), 0),
            change24h: tf1h.length >= 2 ?
                ((latest.close - tf1h[tf1h.length - 24]?.close) / tf1h[tf1h.length - 24]?.close * 100) : 0,
            multiTF: multiTF.timeframes
        };
    }

    /**
     * Run manual market analysis for a specific user
     */
    async runManualAnalysis(userId: string, symbol: string) {
        console.log(`[Scheduler] Running manual analysis for ${userId} on ${symbol}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                asterApiKey: true,
                asterApiSecret: true,
                methodology: true
            }
        });

        if (!user) throw new Error('User not found');

        const multiTF = await this.fetchMultiTFData(
            symbol,
            user.asterApiKey || undefined,
            user.asterApiSecret || undefined
        );

        return await this.orchestrator.analyzeWithCaching({
            userId,
            symbol,
            methodology: user.methodology,
            marketData: this.aggregateMultiTFData(multiTF)
        });
    }
}

export const schedulerService = new SchedulerService();
