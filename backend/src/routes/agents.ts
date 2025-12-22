/**
 * Agent Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware, onboardingCompleteMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { rlService } from '../services/rl.service.js';

const router = Router();

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
    const { limit, agentType } = req.query;

    const decisions = await prisma.agentDecision.findMany({
        where: {
            userId: req.userId,
            ...(agentType && { agentType: agentType as any }),
        },
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
 * POST /api/agents/analyze
 */
router.post('/analyze', authMiddleware, onboardingCompleteMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;

    if (!symbol) {
        return errorResponse(res, 'Symbol is required');
    }

    const orchestrator = new AgentOrchestrator();

    // Mock market data
    const marketData = {
        currentPrice: 42500,
        change24h: 2.5,
        rsi: 52,
        macd: 150,
        volume: 1500000000,
    };

    // Get RL metrics
    const rlMetrics = await rlService.getMetrics();

    const result = await orchestrator.analyzeAndDecide({
        userId: req.userId!,
        symbol,
        marketData,
        riskMetrics: {
            ...rlMetrics,
            portfolioValue: 50000,
            currentExposure: 0,
            openPositions: 0,
        },
    });

    return successResponse(res, result);
}));

/**
 * GET /api/agents/rl/status
 */
router.get('/rl/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const metrics = await rlService.getMetrics();
    const trainingStatus = await rlService.getTrainingStatus();

    return successResponse(res, {
        ...metrics,
        training: trainingStatus,
        available: await rlService.isAvailable(),
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

export const agentRouter = router;
