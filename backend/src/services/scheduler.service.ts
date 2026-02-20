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
import { vaultService } from './vault.service.js';
import { modelService } from './model.service.js';
import { exchangeFactory } from './exchange.service.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { tradingService } from './trading.service.js';
import { rlService } from './rl.service.js';
import { marketDataService, MultiTFData } from './market-data.service.js';

// Use centralized MultiTFData from market-data.service.ts
// Legacy TF_CONFIG kept for reference but data fetching is now dynamic

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
     * Fetch multi-timeframe data for a symbol (DELEGATES to marketDataService)
     * Kept for backwards compatibility - internally uses centralized service
     */
    async fetchMultiTFData(symbol: string, timeframes: string[] = ['1h'], apiKey?: string, apiSecret?: string): Promise<MultiTFData> {
        console.log(`[Scheduler] Delegating multi-TF fetch to marketDataService for ${symbol}`);
        return marketDataService.fetchMultiTFData(symbol, timeframes, timeframes[0], apiKey, apiSecret);
    }

    /**
     * Check if ANY of the user's configured timeframes just closed
     * Supports ALL possible timeframe combinations:
     * - Minutes: 1m, 3m, 5m, 15m, 30m
     * - Hours: 1h, 2h, 4h, 6h, 8h, 12h
     * - Days/Weeks: 1d, 3d, 1w
     */
    private shouldTriggerForTimeframes(timeframes: string[], now: Date): { shouldTrigger: boolean; triggerReason: string } {
        const minutes = now.getMinutes();
        const hours = now.getHours();
        const dayOfWeek = now.getDay(); // 0 = Sunday

        // Check each timeframe - trigger on the SMALLEST matching timeframe
        // This ensures frequent strategies (scalping) get checked first
        const triggeredTF: string[] = [];

        for (const tf of timeframes) {
            if (this.isTimeframeClosed(tf, minutes, hours, dayOfWeek)) {
                triggeredTF.push(tf);
            }
        }

        if (triggeredTF.length > 0) {
            return {
                shouldTrigger: true,
                triggerReason: `${triggeredTF.join(', ')} candle(s) closed`
            };
        }

        return { shouldTrigger: false, triggerReason: '' };
    }

    /**
     * Check if a specific timeframe candle just closed
     */
    private isTimeframeClosed(tf: string, minutes: number, hours: number, dayOfWeek: number): boolean {
        switch (tf) {
            // Minute-based timeframes
            case '1m':
                return true; // Always triggers (every minute)
            case '3m':
                return minutes % 3 === 0;
            case '5m':
                return minutes % 5 === 0;
            case '15m':
                return minutes % 15 === 0;
            case '30m':
                return minutes % 30 === 0;

            // Hour-based timeframes (require minutes === 0)
            case '1h':
                return minutes === 0;
            case '2h':
                return minutes === 0 && hours % 2 === 0;
            case '4h':
                return minutes === 0 && hours % 4 === 0;
            case '6h':
                return minutes === 0 && hours % 6 === 0;
            case '8h':
                return minutes === 0 && hours % 8 === 0;
            case '12h':
                return minutes === 0 && hours % 12 === 0;

            // Daily timeframe (trigger at 00:00 UTC)
            case '1d':
            case 'D':
                return minutes === 0 && hours === 0;

            // 3-day timeframe
            case '3d':
                return minutes === 0 && hours === 0 && dayOfWeek % 3 === 0;

            // Weekly (trigger on Monday 00:00 UTC - start of trading week)
            case '1w':
            case 'W':
                return minutes === 0 && hours === 0 && dayOfWeek === 1;

            // Monthly (first day of month at 00:00) - handled separately
            case '1M':
            case 'M':
                return minutes === 0 && hours === 0 && new Date().getDate() === 1;

            default:
                console.warn(`[Scheduler] Unknown timeframe: ${tf}`);
                return false;
        }
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
                    // keys removed
                    // keys removed
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

                    console.log(`[Scheduler] User ${user.id} Timeframes: ${timeframes.join(',')} (Current: ${hours}:${minutes})`);

                    // Dynamic trigger check for ALL possible timeframes
                    const { shouldTrigger, triggerReason } = this.shouldTriggerForTimeframes(
                        timeframes as string[],
                        now
                    );

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

                            const asterApiKey = await vaultService.getSecret(user.id, 'aster_api_key');
                            const asterApiSecret = await vaultService.getSecret(user.id, 'aster_api_secret');

                            // Fetch Data using DYNAMIC timeframes from model
                            const multiTF = await this.fetchMultiTFData(
                                symbol,
                                timeframes as string[],
                                asterApiKey || undefined,
                                asterApiSecret || undefined
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
                select: {
                    id: true,
                    preferredExchange: true
                }
            });

            for (const user of usersWithActiveModels) {
                try {
                    const activeModel = await modelService.getActiveModel(user.id);
                    if (!activeModel) continue;

                    const asterApiKey = await vaultService.getSecret(user.id, 'aster_api_key');
                    const asterApiSecret = await vaultService.getSecret(user.id, 'aster_api_secret');

                    // Get current portfolio value (simplified - would need actual balance)
                    const adapter = exchangeFactory.getAdapterForUser(
                        (user as any).preferredExchange || 'aster',
                        asterApiKey!,
                        asterApiSecret!,
                        true
                    );

                    const balances = await adapter.getBalance().catch(() => []);
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
    public aggregateMultiTFData(multiTF: MultiTFData): any {
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
                methodology: true
            }
        });

        if (!user) throw new Error('User not found');

        const asterApiKey = await vaultService.getSecret(userId, 'aster_api_key');
        const asterApiSecret = await vaultService.getSecret(userId, 'aster_api_secret');

        const multiTF = await this.fetchMultiTFData(
            symbol,
            ['1h'], // Default timeframe for manual analysis
            asterApiKey || undefined,
            asterApiSecret || undefined
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
            const exchange = exchangeFactory.getDefault();
            const historicalData = await exchange.getKlines(symbol, '1h', 2000);  // Increased from 500 for better generalization

            // Initiate model creation
            try {
                const result = await rlService.initiateModelCreation(symbol, historicalData);

                if (result.success) {
                    console.log(`[Scheduler] RL model created successfully! Metrics:`, result.metrics);

                    // Check if model passed validation thresholds
                    const validation = (result as any).validation;
                    const isProductionReady = (result as any).is_production_ready;

                    if (validation && !isProductionReady) {
                        console.log('[Scheduler] Model failed validation checks:', validation.failed_checks);
                        console.log('[Scheduler] Triggering retrain with more timesteps...');
                        await rlService.startTraining({ symbols: [symbol], timesteps: 150000 });
                    } else if (result.metrics && result.metrics.winRate < 0.52) {
                        console.log('[Scheduler] Model win rate below 52%, triggering retrain...');
                        await rlService.startTraining({ symbols: [symbol], timesteps: 100000 });
                    } else {
                        console.log('[Scheduler] Model is production-ready! ✅');
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
            const exchange = exchangeFactory.getDefault();
            const newData = await exchange.getKlines(symbol, '1h', 24); // Last 24 hours

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

