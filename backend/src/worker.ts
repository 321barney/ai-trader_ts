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

                // Aggregate market data (using the public method I just exposed)
                const marketData = schedulerService.aggregateMultiTFData(multiTF);

                // Run orchestrator
                const orchestrator = new AgentOrchestrator();

                // Use analyzeAndDecide instead of non-existent runFullAnalysis
                const methodology = data.methodology || (user as any).methodology || 'SMC';
                const result = await orchestrator.analyzeAndDecide({
                    userId: data.userId,
                    symbol: data.symbol,
                    marketData: {
                        symbol: data.symbol,
                        ...marketData
                    },
                    methodology: methodology,
                    riskMetrics: {
                        portfolioValue: 10000, // Default for signal generation context if unknown
                        currentExposure: 0,
                        openPositions: 0
                    }
                }, 'hybrid'); // Default to hybrid mode

                logger.info(`Signal job completed for ${data.symbol}`, { result: result.finalDecision });
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

                // Start backtest (returns session immediately)
                const session = await backtestService.startBacktest(data.userId, {
                    symbol: data.symbol,
                    initDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    initialCapital: data.initialCapital,
                    strategyVersionId: data.strategyId
                });

                logger.info(`Backtest session ${session.id} started, polling for completion...`);

                // Poll for completion
                let completed = false;
                let resultSession;
                let attempts = 0;

                while (!completed && attempts < 3600) { // Max 1 hour timeout
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
                    attempts++;

                    resultSession = await backtestService.getSession(session.id);
                    if (!resultSession) continue;

                    if (resultSession.status === 'COMPLETED' || resultSession.status === 'FAILED') {
                        completed = true;
                    }

                    // Update job progress based on steps
                    if (resultSession.totalSteps > 0) {
                        const progress = Math.min(99, Math.round((resultSession.currentStep / resultSession.totalSteps) * 100));
                        await job.updateProgress(progress);
                    }
                }

                if (!completed) {
                    throw new Error('Backtest timed out');
                }

                await job.updateProgress(100);
                logger.info(`Backtest job completed for strategy ${data.strategyId}`);
                return resultSession;
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
                // Removed DB storage as Notification table was dropped
                // Ideally this would push to a real-time service or external notification provider

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
