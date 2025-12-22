/**
 * Scheduler Service
 * Handles automated trading loops and periodic tasks.
 */
import cron from 'node-cron';
import { prisma } from './utils/prisma.js';
import { tradingService } from './services/trading.service.js';
import { strategyService } from './services/strategy.service.js';
import { signalTrackerService } from './services/signal-tracker.service.js';
import { AsterService } from './services/aster.service.js';

export class Scheduler {
    private tradingJob: cron.ScheduledTask | null = null;
    private signalMonitorJob: cron.ScheduledTask | null = null;
    private isRunning = false;
    private isMonitoring = false;

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
     * Start signal monitoring loop
     * Checks pending signals every minute
     */
    public startSignalMonitoring() {
        if (this.signalMonitorJob) return;

        console.log('[Scheduler] Starting signal monitoring (every 1m)...');

        this.signalMonitorJob = cron.schedule('* * * * *', async () => {
            if (this.isMonitoring) return;

            this.isMonitoring = true;
            try {
                const updated = await signalTrackerService.updateAllPendingSignals();
                if (updated > 0) {
                    console.log(`[Scheduler] Updated ${updated} signals.`);
                }
            } catch (error) {
                console.error('[Scheduler] Signal monitoring failed:', error);
            } finally {
                this.isMonitoring = false;
            }
        });
    }

    /**
     * Stop all jobs
     */
    public stopAll() {
        this.stopTradingLoop();
        if (this.signalMonitorJob) {
            this.signalMonitorJob.stop();
            this.signalMonitorJob = null;
            console.log('[Scheduler] Signal monitoring stopped.');
        }
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
            select: {
                id: true,
                username: true,
                selectedPairs: true,
                asterApiKey: true,
                asterApiSecret: true,
                asterTestnet: true,
                maxDrawdownPercent: true,
            }
        });

        console.log(`[Scheduler] Found ${users.length} active traders.`);

        // 2. Process each user
        for (const user of users) {
            // 2a. Check if user has an ACTIVE strategy
            const activeStrategy = await strategyService.getActiveStrategy(user.id);

            if (!activeStrategy) {
                console.warn(`[Scheduler] User ${user.username} enabled but no ACTIVE strategy. Skipping.`);
                continue;
            }

            // 2b. Drawdown check - Skip if max drawdown exceeded
            if (user.asterApiKey && user.asterApiSecret) {
                try {
                    const aster = new AsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet || true);
                    const balances = await aster.getBalance();
                    const usdtBalance = balances.find(b => b.asset === 'USDT');

                    if (usdtBalance) {
                        // Simple check: if unrealized PnL is very negative, skip
                        // In production: track initial balance and compare
                        const positions = await aster.getPositions();
                        const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
                        const currentBalance = usdtBalance.total + unrealizedPnL;
                        const drawdownPercent = ((usdtBalance.total - currentBalance) / usdtBalance.total) * 100;

                        if (drawdownPercent > (user.maxDrawdownPercent || 15)) {
                            console.warn(`[Scheduler] User ${user.username} drawdown ${drawdownPercent.toFixed(1)}% exceeds max ${user.maxDrawdownPercent}%. Skipping.`);
                            continue;
                        }
                    }
                } catch (err) {
                    console.warn(`[Scheduler] Could not check drawdown for ${user.username}:`, err);
                }
            }

            // 2c. Iterate over selected pairs
            const pairs = user.selectedPairs as string[] || [];
            for (const symbol of pairs) {
                try {
                    console.log(`[Scheduler] Analyzing ${symbol} for ${user.username}...`);
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
