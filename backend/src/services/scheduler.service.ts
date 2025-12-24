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
import { rlService } from './rl.service.js';

// Multi-TF data requirements (need 50+ candles for TA indicators)
const TF_CONFIG = {
    '5m': { interval: '5m' as const, minBars: 100 },
    '15m': { interval: '15m' as const, minBars: 100 },
    '1h': { interval: '1h' as const, minBars: 100 },
    '4h': { interval: '4h' as const, minBars: 50 }
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

        // RL Model Check: Every 10 minutes
        cron.schedule('*/10 * * * *', () => {
            this.checkRLModelLifecycle();
        });

        // RL Model Update: Every 6 hours (at minute 0)
        cron.schedule('0 */6 * * *', () => {
            this.updateRLModelWithNewData();
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

            console.log(`[Scheduler] Found ${users.length} active users.`);

            for (const user of users) {
                try {
                    // Check for active TRADING MODEL first (Source of Truth for Timeframes)
                    const activeModel = await modelService.getActiveModel(user.id);
                    // Default to 1h if no model (legacy support)
                    const timeframes = activeModel?.timeframes || ['1h'];

                    console.log(`[Scheduler] User ${user.id} Timeframes: ${timeframes.join(',')} (Current Min: ${minutes})`);

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

                        let pairs = (user.selectedPairs as string[]) || ['BTCUSDT'];

                        // Enforce Strategy-Specific Pair (Backtested Pair)
                        // This ensures the strategy only runs on the pair it was optimized for
                        if (activeModel && activeModel.parameters) {
                            const params = activeModel.parameters as any;
                            if (params.symbol) {
                                pairs = [params.symbol];
                                console.log(`[Scheduler] Enforcing strategy pair constraint: ${params.symbol} for User ${user.id}`);
                            }
                        }

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
                        console.log(`[Scheduler] User ${user.id}: Waiting for candle close (TFs: ${timeframes.join(',')})`);
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

    // ============================================================================
    // RL Model Lifecycle Methods
    // ============================================================================

    /**
     * Check RL service availability and model status (every 10 minutes)
     * If online but no model, initiate model creation
     */
    async checkRLModelLifecycle() {
        console.log('[Scheduler] Checking RL model lifecycle...');

        try {
            // Step 1: Check if RL service is online
            const isOnline = await rlService.isAvailable();
            if (!isOnline) {
                console.log('[Scheduler] RL service offline, skipping lifecycle check');
                return;
            }

            // Step 2: Check if a model is available
            const modelStatus = await rlService.checkModelAvailability();

            if (modelStatus.available) {
                console.log(`[Scheduler] RL model available (ID: ${modelStatus.modelId})`);
                return;
            }

            // Step 3: No model - initiate creation
            console.log('[Scheduler] No RL model found, initiating creation...');

            // Fetch historical data for training (use BTCUSDT as default)
            const symbol = 'BTCUSDT';
            const aster = new AsterService();
            const historicalData = await aster.getKlines(symbol, '1h', 500);

            // Initiate model creation
            try {
                const result = await rlService.initiateModelCreation(symbol, historicalData);

                if (result.success) {
                    console.log(`[Scheduler] RL model created successfully! Metrics:`, result.metrics);

                    // Evaluate if model meets minimum criteria
                    if (result.metrics && result.metrics.winRate < 0.4) {
                        console.log('[Scheduler] Model win rate below 40%, triggering retrain...');
                        await rlService.startTraining({ symbols: [symbol], timesteps: 100000 });
                    }
                } else {
                    console.error('[Scheduler] RL model creation failed:', result.error);
                }
            } catch (creationError) {
                console.error('[Scheduler] Critical error during model creation process:', creationError);
                // Swallow error to protect other scheduler jobs
            }

        } catch (error) {
            console.error('[Scheduler] RL lifecycle check failed:', error);
        }
    }

    /**
     * Update RL model with new market data (every 6 hours)
     */
    async updateRLModelWithNewData() {
        console.log('[Scheduler] Updating RL model with new data...');

        try {
            // Check if RL service is online
            const isOnline = await rlService.isAvailable();
            if (!isOnline) {
                console.log('[Scheduler] RL service offline, skipping update');
                return;
            }

            // Check if model exists
            const modelStatus = await rlService.checkModelAvailability();
            if (!modelStatus.available) {
                console.log('[Scheduler] No model to update');
                return;
            }

            // Fetch last 6 hours of data (6 * 60 / 5 = 72 candles for 5m, or 6 for 1h)
            const symbol = 'BTCUSDT';
            const aster = new AsterService();
            const newData = await aster.getKlines(symbol, '1h', 24); // Last 24 hours

            // Send to RL for parameter update
            const updated = await rlService.updateModelWithNewData(symbol, newData);

            if (updated) {
                console.log('[Scheduler] RL model parameters updated successfully');
            } else {
                console.warn('[Scheduler] RL model update failed');
            }

        } catch (error) {
            console.error('[Scheduler] RL model update failed:', error);
        }
    }
}

export const schedulerService = new SchedulerService();

