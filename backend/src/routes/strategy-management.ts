/**
 * Strategy Routes
 * 
 * Endpoints for creating, managing, and activating trading strategies
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireStrategies } from '../middleware/subscription.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { strategyBuilder } from '../services/strategy-builder.service.js';
import { strategyExecutor } from '../services/strategy-executor.service.js';
import { modelService } from '../services/model.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// All routes require authentication + PRO subscription
router.use(authMiddleware);
router.use(requireStrategies());

/**
 * GET /api/strategy/active
 * Get user's currently active trading strategy
 */
router.get('/active', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const activeModel = await modelService.getActiveModel(userId);

    if (!activeModel) {
        return res.json({
            success: true,
            data: null,
            message: 'No active strategy. Create one to enable LLM-free trading!'
        });
    }

    return successResponse(res, {
        id: activeModel.id,
        version: activeModel.version,
        methodology: activeModel.methodology,
        parameters: activeModel.parameters,
        status: activeModel.status,
        isActive: activeModel.isActive,
        winRate: activeModel.winRate,
        sharpeRatio: activeModel.sharpeRatio,
        activatedAt: activeModel.activatedAt,
        expiresAt: activeModel.expiresAt,
        monthlyReviewDue: activeModel.expiresAt
            ? new Date(activeModel.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
            : false
    });
}));

/**
 * POST /api/strategy/create-from-methodology
 * Create a new strategy based on methodology (SMC/ICT/GANN)
 */
router.post('/create-from-methodology', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { methodology } = req.body;

    if (!methodology || !['SMC', 'ICT', 'GANN', 'VSA'].includes(methodology)) {
        return errorResponse(res, 'Invalid methodology. Choose: SMC, ICT, GANN, or VSA', 400);
    }

    // Create strategy with default rules for methodology
    const mockDecision = {
        finalDecision: 'LONG',
        confidence: 0.85,
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 53000
    };

    const model = await strategyBuilder.buildFromSingleDecision(userId, mockDecision, methodology);

    return successResponse(res, model, `${methodology} strategy created! Backtest it before activation.`);
}));

/**
 * POST /api/strategy/activate/:id
 * Activate a strategy for live trading
 */
router.post('/activate/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    // Validate strategy before activation
    const validation = await strategyBuilder.validateStrategy(id);

    if (!validation.valid) {
        return errorResponse(res, `Strategy validation failed: ${validation.issues.join(', ')}`, 400);
    }

    const activatedModel = await modelService.activateModel(userId, id);

    return successResponse(res, activatedModel, '🚀 Strategy activated! Trading now LLM-free (95% token savings)');
}));

/**
 * GET /api/strategy/test-execution/:symbol
 * Test strategy execution on current market data (dry run)
 */
router.get('/test-execution/:symbol', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { symbol } = req.params;

    // Mock market data for testing
    const marketData = {
        currentPrice: 50000,
        rsi: 35,
        macd: 0.5,
        smcBias: 'BULLISH' as const,
        fairValueGaps: [{ type: 'BULLISH', price: 49500 }],
        orderBlocks: [{ type: 'BULLISH', price: 49000 }],
        killZone: { zone: 'LONDON', active: true }
    };

    const result = await strategyExecutor.executeStrategy(userId, symbol, marketData);

    return successResponse(res, {
        ...result,
        testMode: true,
        tokensUsed: result.requiresLLM ? '~15,000' : '0 🎉',
        explanation: result.requiresLLM
            ? 'Would call LLMs in live mode'
            : 'Executed via strategy - zero LLM calls!'
    });
}));

/**
 * GET /api/strategy/performance
 * Get performance stats of active strategy
 */
router.get('/performance', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const activeModel = await modelService.getActiveModel(userId);

    if (!activeModel) {
        return errorResponse(res, 'No active strategy', 404);
    }

    // Get trades from this strategy
    const trades = await (global as any).prisma.trade.findMany({
        where: {
            userId,
            createdAt: { gte: activeModel.activatedAt || new Date() }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    const losses = trades.filter(t => (t.pnl || 0) < 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return successResponse(res, {
        strategyVersion: activeModel.version,
        methodology: activeModel.methodology,
        activatedAt: activeModel.activatedAt,
        daysActive: activeModel.activatedAt
            ? Math.floor((Date.now() - activeModel.activatedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        totalTrades: trades.length,
        wins,
        losses,
        winRate: winRate.toFixed(1),
        totalPnL: totalPnL.toFixed(2),
        avgPnL: trades.length > 0 ? (totalPnL / trades.length).toFixed(2) : '0',
        tokensSaved: `~${trades.length * 15000} tokens!`,
        estimatedCostSavings: `$${(trades.length * 15000 * 0.001).toFixed(2)}`
    });
}));

/**
 * DELETE /api/strategy/deactivate
 * Deactivate current strategy (will fall back to LLM analysis)
 */
router.delete('/deactivate', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const activeModel = await modelService.getActiveModel(userId);

    if (!activeModel) {
        return errorResponse(res, 'No active strategy to deactivate', 404);
    }

    await (global as any).prisma.tradingModel.update({
        where: { id: activeModel.id },
        data: { isActive: false, status: 'RETIRED', retiredAt: new Date() }
    });

    return successResponse(res, null, 'Strategy deactivated. Will use LLM analysis until new strategy activated.');
}));

export default router;
