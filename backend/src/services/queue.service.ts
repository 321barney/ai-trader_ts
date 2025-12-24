/**
 * BullMQ Job Queue Service
 * 
 * Background job processing for:
 * - Signal generation
 * - Backtesting
 * - Market data refresh
 * - Cleanup tasks
 * 
 * Uses Redis for job persistence and distribution.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redisService } from './redis.service.js';

// Job types
export enum JobType {
    GENERATE_SIGNAL = 'generate_signal',
    RUN_BACKTEST = 'run_backtest',
    REFRESH_MARKET_DATA = 'refresh_market_data',
    CLEANUP_OLD_DATA = 'cleanup_old_data',
    SEND_NOTIFICATION = 'send_notification',
}

// Job data interfaces
export interface SignalJobData {
    userId: string;
    symbol: string;
    methodology?: string;
}

export interface BacktestJobData {
    userId: string;
    strategyId: string;
    symbol: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
}

export interface MarketDataJobData {
    symbols: string[];
}

export interface NotificationJobData {
    userId: string;
    type: string;
    title: string;
    message: string;
}

class JobQueueService {
    private queues: Map<string, Queue> = new Map();
    private workers: Map<string, Worker> = new Map();
    private isInitialized = false;

    /**
     * Initialize job queues
     */
    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;

        // Check if Redis is available
        const redisAvailable = await redisService.ping();
        if (!redisAvailable) {
            console.warn('[JobQueue] Redis not available, job queue disabled');
            return false;
        }

        try {
            const connection = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            };

            // Use REDIS_URL if available (Railway)
            const redisUrl = process.env.REDIS_URL;
            const connectionOptions = redisUrl ? { url: redisUrl } : connection;

            // Create queues
            this.queues.set('signals', new Queue('signals', { connection: connectionOptions as any }));
            this.queues.set('backtests', new Queue('backtests', { connection: connectionOptions as any }));
            this.queues.set('maintenance', new Queue('maintenance', { connection: connectionOptions as any }));
            this.queues.set('notifications', new Queue('notifications', { connection: connectionOptions as any }));

            console.log('[JobQueue] Initialized successfully');
            this.isInitialized = true;
            return true;
        } catch (error: any) {
            console.error('[JobQueue] Failed to initialize:', error.message);
            return false;
        }
    }

    /**
     * Add a signal generation job
     */
    async addSignalJob(data: SignalJobData, options?: { delay?: number; priority?: number }): Promise<string | null> {
        const queue = this.queues.get('signals');
        if (!queue) {
            console.warn('[JobQueue] Signals queue not available');
            return null;
        }

        const job = await queue.add(JobType.GENERATE_SIGNAL, data, {
            delay: options?.delay,
            priority: options?.priority,
            removeOnComplete: 100,
            removeOnFail: 50,
        });

        console.log(`[JobQueue] Signal job added: ${job.id}`);
        return job.id || null;
    }

    /**
     * Add a backtest job
     */
    async addBacktestJob(data: BacktestJobData): Promise<string | null> {
        const queue = this.queues.get('backtests');
        if (!queue) {
            console.warn('[JobQueue] Backtests queue not available');
            return null;
        }

        const job = await queue.add(JobType.RUN_BACKTEST, data, {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 1, // Backtests shouldn't retry
        });

        console.log(`[JobQueue] Backtest job added: ${job.id}`);
        return job.id || null;
    }

    /**
     * Add a notification job
     */
    async addNotificationJob(data: NotificationJobData): Promise<string | null> {
        const queue = this.queues.get('notifications');
        if (!queue) return null;

        const job = await queue.add(JobType.SEND_NOTIFICATION, data, {
            removeOnComplete: 100,
            removeOnFail: 50,
        });

        return job.id || null;
    }

    /**
     * Start workers to process jobs
     */
    async startWorkers(handlers: {
        onSignalJob?: (job: Job<SignalJobData>) => Promise<any>;
        onBacktestJob?: (job: Job<BacktestJobData>) => Promise<any>;
        onNotificationJob?: (job: Job<NotificationJobData>) => Promise<any>;
    }): Promise<void> {
        if (!this.isInitialized) {
            console.warn('[JobQueue] Not initialized, cannot start workers');
            return;
        }

        const connection = process.env.REDIS_URL
            ? { url: process.env.REDIS_URL }
            : {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            };

        // Signal worker
        if (handlers.onSignalJob) {
            const worker = new Worker('signals', async (job) => {
                console.log(`[Worker:signals] Processing job ${job.id}`);
                return handlers.onSignalJob!(job as Job<SignalJobData>);
            }, { connection: connection as any, concurrency: 5 });

            worker.on('completed', (job: Job) => {
                console.log(`[Worker:signals] Job ${job.id} completed`);
            });

            worker.on('failed', (job: Job | undefined, err: Error) => {
                console.error(`[Worker:signals] Job ${job?.id} failed:`, err.message);
            });

            this.workers.set('signals', worker);
        }

        // Backtest worker (lower concurrency - resource intensive)
        if (handlers.onBacktestJob) {
            const worker = new Worker('backtests', async (job) => {
                console.log(`[Worker:backtests] Processing job ${job.id}`);
                return handlers.onBacktestJob!(job as Job<BacktestJobData>);
            }, { connection: connection as any, concurrency: 2 });

            worker.on('completed', (job: Job) => {
                console.log(`[Worker:backtests] Job ${job.id} completed`);
            });

            worker.on('failed', (job: Job | undefined, err: Error) => {
                console.error(`[Worker:backtests] Job ${job?.id} failed:`, err.message);
            });

            this.workers.set('backtests', worker);
        }

        // Notification worker
        if (handlers.onNotificationJob) {
            const worker = new Worker('notifications', async (job) => {
                return handlers.onNotificationJob!(job as Job<NotificationJobData>);
            }, { connection: connection as any, concurrency: 10 });

            this.workers.set('notifications', worker);
        }

        console.log('[JobQueue] Workers started');
    }

    /**
     * Get job status
     */
    async getJobStatus(queueName: string, jobId: string): Promise<any> {
        const queue = this.queues.get(queueName);
        if (!queue) return null;

        const job = await queue.getJob(jobId);
        if (!job) return null;

        const state = await job.getState();
        return {
            id: job.id,
            state,
            progress: job.progress,
            data: job.data,
            returnvalue: job.returnvalue,
            failedReason: job.failedReason,
        };
    }

    /**
     * Get queue stats
     */
    async getQueueStats(queueName: string): Promise<any> {
        const queue = this.queues.get(queueName);
        if (!queue) return null;

        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
        ]);

        return { waiting, active, completed, failed };
    }

    /**
     * Get all queue stats
     */
    async getAllStats(): Promise<Record<string, any>> {
        const stats: Record<string, any> = {};
        for (const [name] of this.queues) {
            stats[name] = await this.getQueueStats(name);
        }
        return stats;
    }

    /**
     * Shutdown gracefully
     */
    async shutdown(): Promise<void> {
        console.log('[JobQueue] Shutting down...');

        // Close workers
        for (const [name, worker] of this.workers) {
            await worker.close();
            console.log(`[JobQueue] Worker ${name} closed`);
        }

        // Close queues
        for (const [name, queue] of this.queues) {
            await queue.close();
            console.log(`[JobQueue] Queue ${name} closed`);
        }

        this.isInitialized = false;
    }

    /**
     * Check if queues are available
     */
    isAvailable(): boolean {
        return this.isInitialized;
    }
}

export const jobQueueService = new JobQueueService();
export default jobQueueService;
