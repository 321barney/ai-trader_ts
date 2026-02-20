/**
 * Agent Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';
import { asyncHandler } from '../middleware/error.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { rlService } from '../services/rl.service.js';

const router = Router();

// All agent routes require authentication AND active subscription
router.use(authMiddleware);
router.use(requireSubscription);


/**
 * POST /api/agents/reset
 * Clears agent decision history to reset strategy context
 */
router.post('/reset', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    await prisma.agentDecision.deleteMany({
        where: { userId: req.userId }
    });

    // Also clear recent trades/signals if needed? 
    // For now, just decisions as they form the "context"

    return successResponse(res, { success: true }, 'Strategy context reset successfully');
}));


/**
 * GET /api/agents/decisions
 */
router.get('/decisions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { limit, agentType, includeBacktest, sourceMode } = req.query;

    const where: any = {
        userId: req.userId,
        ...(agentType && { agentType: agentType as any }),
    };

    // Filter by source mode if provided
    if (sourceMode) {
        where.sourceMode = sourceMode;
    } else if (includeBacktest !== 'true') {
        // By default, exclude backtest results for the live dashboard
        where.isBacktest = false;
    }

    const decisions = await prisma.agentDecision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 20,
    });

    return successResponse(res, decisions);
}));

/**
 * GET /api/agents/decisions/:id
 */
router.get('/decisions/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const decision = await prisma.agentDecision.findFirst({
        where: {
            id: req.params.id,
            userId: req.userId,
        },
    });

    if (!decision) {
        return errorResponse(res, 'Decision not found', 404);
    }

    return successResponse(res, decision);
}));

/**
 * POST /api/agents/debug-create
 * Manual trigger to verify DB writes
 */
router.post('/debug-create', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const decision = await prisma.agentDecision.create({
        data: {
            userId: req.userId!,
            agentType: 'STRATEGY_CONSULTANT',
            decision: 'LONG',
            confidence: 0.95,
            reasoning: 'Debug Manual Creation ' + new Date().toISOString(),
            thoughtSteps: [{ step: 1, thought: 'Test thought step' }] as any,
            isBacktest: true,
            sourceMode: 'BACKTEST',
            symbol: 'BTCUSDT'
        }
    });
    return successResponse(res, decision);
}));

/**
 * POST /api/agents/analyze
 */
router.post('/analyze', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;

    if (!symbol) {
        return errorResponse(res, 'Symbol is required');
    }

    try {
        const { tradingService } = await import('../services/trading.service.js');
        const result = await tradingService.runAnalysis(req.userId!, symbol);
        return successResponse(res, result);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));


/**
 * GET /api/agents/rl/status
 */
router.get('/rl/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const available = await rlService.isAvailable();
    const metrics = await rlService.getMetrics();
    const trainingStatus = await rlService.getTrainingStatus();

    // Return real data or indicate service is offline
    return successResponse(res, {
        available,
        sharpeRatio: metrics?.sharpeRatio ?? null,
        winRate: metrics?.winRate ?? null,
        maxDrawdown: metrics?.maxDrawdown ?? null,
        totalReturn: metrics?.totalReturn ?? null,
        trainingStatus: metrics?.trainingStatus ?? 'offline',
        isMock: metrics?.isMock ?? true,  // true if null (no real data)
        training: trainingStatus ?? {
            status: 'offline',
            progress: 0,
            currentEpisode: 0,
            totalEpisodes: 0,
        },
    });
}));

/**
 * PUT /api/agents/rl/params
 */
router.put('/rl/params', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { learning_rate, gamma, batch_size } = req.body;

    const success = await rlService.modifyParams({
        learning_rate,
        gamma,
        batch_size,
    });

    if (!success) {
        return errorResponse(res, 'Failed to modify RL parameters');
    }

    return successResponse(res, null, 'Parameters updated');
}));

/**
 * POST /api/agents/rl/train
 */
router.post('/rl/train', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbols, timesteps, algorithm } = req.body;

    const result = await rlService.startTraining({
        symbols,
        timesteps,
        algorithm,
    });

    if (!result) {
        return errorResponse(res, 'Failed to start training');
    }

    return successResponse(res, result, 'Training started');
}));

/**
 * POST /api/agents/rl/stop
 */
router.post('/rl/stop', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    const success = await rlService.stopTraining(reason);

    if (!success) {
        return errorResponse(res, 'Failed to stop training');
    }

    return successResponse(res, null, 'Training stopped');
}));

/**
 * POST /api/agents/rl/backtest
 */
router.post('/rl/backtest', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;

    const result = await rlService.runBacktest(symbol || 'BTC-USD');

    if (!result) {
        return errorResponse(res, 'Failed to run backtest');
    }

    return successResponse(res, result, 'Backtest completed');
}));

export const agentRouter = router;
