/**
 * Background Worker
 * 
 * Processes background jobs from BullMQ queues.
 * Run separately from main server: node dist/worker.js
 */

import { jobQueueService, SignalJobData, BacktestJobData, NotificationJobData } from './services/queue.service.js';
import { redisService } from './services/redis.service.js';
import { logger } from './services/logger.service.js';
import { prisma } from './utils/prisma.js';

async function main() {
    logger.info('Starting background worker...');

    // Connect to Redis
    const redisConnected = await redisService.connect();
    if (!redisConnected) {
        logger.error('Failed to connect to Redis. Exiting.');
        process.exit(1);
    }

    // Initialize job queue
    const queueInitialized = await jobQueueService.initialize();
    if (!queueInitialized) {
        logger.error('Failed to initialize job queue. Exiting.');
        process.exit(1);
    }

    // Start workers with handlers
    await jobQueueService.startWorkers({
        // Handle signal generation jobs
        onSignalJob: async (job) => {
            const data = job.data as SignalJobData;
            logger.info(`Processing signal job for user ${data.userId}, symbol ${data.symbol}`);

            try {
                // Import services dynamically to avoid circular deps
                const { AgentOrchestrator } = await import('./agents/orchestrator.js');
                const { schedulerService } = await import('./services/scheduler.service.js');

                // Get user
                const user = await prisma.user.findUnique({ where: { id: data.userId } });
                if (!user) throw new Error('User not found');

                // Fetch market data
                const multiTF = await schedulerService.fetchMultiTFData(
                    data.symbol,
                    (user as any).asterApiKey || undefined,
                    (user as any).asterApiSecret || undefined
                );

                // Run orchestrator
                const orchestrator = new AgentOrchestrator();
                const result = await orchestrator.runFullAnalysis({
                    userId: data.userId,
                    symbol: data.symbol,
                    marketData: {
                        symbol: data.symbol,
                        price: multiTF.price,
                        ...multiTF.md
                    },
                    settings: {
                        methodology: data.methodology || (user as any).methodology || 'SMC',
                        riskPercent: (user as any).riskMaxPerTrade || 0.02
                    }
                });

                logger.info(`Signal job completed for ${data.symbol}`, { result: result.decision });
                return result;
            } catch (error: any) {
                logger.error(`Signal job failed: ${error.message}`);
                throw error;
            }
        },

        // Handle backtest jobs
        onBacktestJob: async (job) => {
            const data = job.data as BacktestJobData;
            logger.info(`Processing backtest job for user ${data.userId}, strategy ${data.strategyId}`);

            try {
                const { backtestService } = await import('./services/backtest.service.js');

                // Update job progress
                await job.updateProgress(10);

                // Run backtest
                const result = await backtestService.runBacktest(
                    data.strategyId,
                    data.symbol,
                    data.startDate,
                    data.endDate,
                    data.initialCapital
                );

                await job.updateProgress(100);
                logger.info(`Backtest job completed for strategy ${data.strategyId}`);
                return result;
            } catch (error: any) {
                logger.error(`Backtest job failed: ${error.message}`);
                throw error;
            }
        },

        // Handle notification jobs
        onNotificationJob: async (job) => {
            const data = job.data as NotificationJobData;
            logger.info(`Sending notification to user ${data.userId}: ${data.title}`);

            try {
                // Create notification in database
                await (prisma as any).notification.create({
                    data: {
                        userId: data.userId,
                        type: data.type,
                        title: data.title,
                        message: data.message,
                    }
                });

                return { sent: true };
            } catch (error: any) {
                logger.error(`Notification job failed: ${error.message}`);
                throw error;
            }
        }
    });

    logger.info('Worker started and listening for jobs');

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down worker...');
        await jobQueueService.shutdown();
        await redisService.disconnect();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch((error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
});
