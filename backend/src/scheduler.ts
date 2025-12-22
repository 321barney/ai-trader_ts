/**
 * Scheduler Service
 * Handles automated trading loops and periodic tasks.
 */
import cron from 'node-cron';
import { prisma } from './utils/prisma.js';
import { tradingService } from './services/trading.service.js';
import { strategyService } from './services/strategy.service.js';

export class Scheduler {
    private tradingJob: cron.ScheduledTask | null = null;
    private isRunning = false;

    constructor() {
        // Initialize jobs
    }

    /**
     * Start the main trading loop
     * Runs every 5 minutes by default
     */
    public startTradingLoop() {
        if (this.tradingJob) return;

        console.log('[Scheduler] Starting trading loop (every 5m)...');

        // Schedule: Every 5 minutes
        this.tradingJob = cron.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                console.log('[Scheduler] Previous loop still running, skipping...');
                return;
            }

            this.isRunning = true;
            try {
                await this.runTradingCycle();
            } catch (error) {
                console.error('[Scheduler] Trading cycle failed:', error);
            } finally {
                this.isRunning = false;
            }
        });
    }

    /**
     * Stop the trading loop
     */
    public stopTradingLoop() {
        if (this.tradingJob) {
            this.tradingJob.stop();
            this.tradingJob = null;
            console.log('[Scheduler] Trading loop stopped.');
        }
    }

    /**
     * Execute one trading cycle for all active eligible users
     */
    private async runTradingCycle() {
        console.log('[Scheduler] Running trading cycle...');

        // 1. Find users with trading enabled and an active strategy
        const users = await prisma.user.findMany({
            where: {
                tradingEnabled: true,
                status: 'ACTIVE'
            },
            select: { id: true, username: true, selectedPairs: true }
        });

        console.log(`[Scheduler] Found ${users.length} active traders.`);

        // 2. Process each user
        for (const user of users) {
            // 2a. Check if user has an ACTIVE strategy
            const activeStrategy = await strategyService.getActiveStrategy(user.id);

            // Safety Check: If no active strategy, or it's not tested (if strictly enforced), skip
            if (!activeStrategy) {
                console.warn(`[Scheduler] User ${user.username} enabled but no ACTIVE strategy. Skipping.`);
                continue;
            }

            // 2b. Iterate over selected pairs
            const pairs = user.selectedPairs as string[] || [];
            for (const symbol of pairs) {
                try {
                    console.log(`[Scheduler] Analyzing ${symbol} for ${user.username}...`);
                    // runAnalysis will use the Active Strategy's methodology logic 
                    // (Need to ensure TradingService fetches methodology from strategy, not just user settings)
                    await tradingService.runAnalysis(user.id, symbol);
                } catch (err) {
                    console.error(`[Scheduler] Error analyzing ${symbol} for ${user.username}:`, err);
                }
            }
        }
        console.log('[Scheduler] Trading cycle completed.');
    }
}

export const scheduler = new Scheduler();
