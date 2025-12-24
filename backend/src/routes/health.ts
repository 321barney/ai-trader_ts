/**
 * Health Check Routes
 * 
 * Provides health and readiness endpoints for:
 * - Load balancer health checks
 * - Kubernetes probes
 * - Monitoring systems
 */

import { Router, Request, Response } from 'express';
import { redisService } from '../services/redis.service.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    checks: {
        database: boolean;
        redis: boolean;
    };
}

/**
 * GET /health
 * Quick health check for load balancers
 */
router.get('/', async (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/ready
 * Readiness probe - checks all dependencies
 */
router.get('/ready', async (_req: Request, res: Response) => {
    const checks = {
        database: false,
        redis: false,
    };

    // Check database
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = true;
    } catch {
        checks.database = false;
    }

    // Check Redis
    try {
        checks.redis = await redisService.ping();
    } catch {
        checks.redis = false;
    }

    const allHealthy = Object.values(checks).every(v => v);

    const status: HealthStatus = {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks,
    };

    res.status(allHealthy ? 200 : 503).json(status);
});

/**
 * GET /health/live
 * Liveness probe - is the process running
 */
router.get('/live', (_req: Request, res: Response) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});

/**
 * GET /health/metrics
 * Basic metrics endpoint
 */
router.get('/metrics', async (_req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();

    // Try to get queue stats if available
    let queueStats = null;
    try {
        const { jobQueueService } = await import('../services/queue.service.js');
        if (jobQueueService.isAvailable()) {
            queueStats = await jobQueueService.getAllStats();
        }
    } catch {
        // Queue not available
    }

    res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        queues: queueStats,
    });
});

export const healthRouter = router;
export default healthRouter;
