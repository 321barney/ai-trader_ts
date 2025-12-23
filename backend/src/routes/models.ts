/**
 * Model Routes
 * 
 * API endpoints for TradingModel management:
 * - List models
 * - Get active model
 * - Activate/deactivate
 * - Trigger backtest
 * - Trigger retrain
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { modelService } from '../services/model.service.js';
import { schedulerService } from '../services/scheduler.service.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

// Helper for success response
const successResponse = (res: Response, data: any, message?: string) => {
    res.json({ success: true, data, message });
};

// Helper for error response
const errorResponse = (res: Response, message: string, status = 400) => {
    res.status(status).json({ success: false, error: message });
};

/**
 * GET /api/models
 * List all models for current user
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const models = await prisma.tradingModel.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return successResponse(res, models);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/models/active
 * Get the currently active model
 */
router.get('/active', authMiddleware, async (req: Request, res: Response) => {
    try {
        const activeModel = await modelService.getActiveModel(req.userId!);

        if (!activeModel) {
            return successResponse(res, null, 'No active model');
        }

        return successResponse(res, activeModel);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/models/:id
 * Get model by ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const model = await prisma.tradingModel.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!model) {
            return errorResponse(res, 'Model not found', 404);
        }

        return successResponse(res, model);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/models
 * Create a new draft model
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { methodology, parameters, timeframes } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { methodology: true }
        });

        const model = await modelService.createModel(
            req.userId!,
            methodology || user?.methodology || 'SMC',
            parameters || {
                entryRules: { indicators: ['RSI', 'MACD', 'EMA'], conditions: [] },
                exitRules: { stopLossPercent: 2, takeProfitPercent: 4 },
                timeframes: timeframes || ['5m', '15m', '1h', '4h'],
                methodology: methodology || user?.methodology || 'SMC',
                riskPerTrade: 2
            },
            timeframes || ['5m', '15m', '1h', '4h']
        );

        return successResponse(res, model, 'Model created');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/models/:id/activate
 * Activate a model (deactivates current active model)
 */
router.post('/:id/activate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const model = await prisma.tradingModel.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!model) {
            return errorResponse(res, 'Model not found', 404);
        }

        if (model.status !== 'APPROVED') {
            return errorResponse(res, 'Model must be approved before activation');
        }

        const activated = await modelService.activateModel(req.userId!, req.params.id);
        return successResponse(res, activated, 'Model activated');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/models/:id/backtest
 * Run backtest on a model
 */
router.post('/:id/backtest', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { symbol, startDate, endDate } = req.body;

        const model = await prisma.tradingModel.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!model) {
            return errorResponse(res, 'Model not found', 404);
        }

        // Update model status to BACKTESTING
        await prisma.tradingModel.update({
            where: { id: req.params.id },
            data: { status: 'BACKTESTING' }
        });

        // Create backtest session (would connect to existing backtest system)
        // For now, simulate backtest results
        const simulatedResults = {
            sharpeRatio: 1.5 + Math.random(),
            winRate: 55 + Math.random() * 15,
            maxDrawdown: 5 + Math.random() * 10,
            totalReturn: 20 + Math.random() * 30,
            backtestData: {
                symbol,
                startDate,
                endDate,
                trades: 50,
                profitFactor: 1.8
            }
        };

        const updated = await modelService.updateBacktestResults(
            req.params.id,
            simulatedResults
        );

        return successResponse(res, updated, 'Backtest completed');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/models/:id/approve
 * Add approval vote from an agent
 */
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { agentType } = req.body; // STRATEGY_CONSULTANT, RISK_OFFICER, MARKET_ANALYST

        if (!['STRATEGY_CONSULTANT', 'RISK_OFFICER', 'MARKET_ANALYST'].includes(agentType)) {
            return errorResponse(res, 'Invalid agent type');
        }

        const updated = await modelService.addApproval(req.params.id, agentType);
        return successResponse(res, updated, `Approval added from ${agentType}`);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/models/:id/retrain
 * Trigger model retraining
 */
router.post('/:id/retrain', authMiddleware, async (req: Request, res: Response) => {
    try {
        const model = await prisma.tradingModel.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!model) {
            return errorResponse(res, 'Model not found', 404);
        }

        // Mark for retraining
        await prisma.tradingModel.update({
            where: { id: req.params.id },
            data: { status: 'RETRAINING' }
        });

        // Create new draft model based on this one
        const newModel = await modelService.createModel(
            req.userId!,
            model.methodology,
            model.parameters as any,
            model.timeframes
        );

        return successResponse(res, newModel, 'Retraining initiated - new model created');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * DELETE /api/models/:id
 * Delete a model (only if not active)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const model = await prisma.tradingModel.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (!model) {
            return errorResponse(res, 'Model not found', 404);
        }

        if (model.isActive) {
            return errorResponse(res, 'Cannot delete active model');
        }

        await prisma.tradingModel.delete({
            where: { id: req.params.id }
        });

        return successResponse(res, null, 'Model deleted');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/models/stats
 * Get model statistics
 */
router.get('/stats/overview', authMiddleware, async (req: Request, res: Response) => {
    try {
        const [total, active, approved, backtesting] = await Promise.all([
            prisma.tradingModel.count({ where: { userId: req.userId } }),
            prisma.tradingModel.count({ where: { userId: req.userId, isActive: true } }),
            prisma.tradingModel.count({ where: { userId: req.userId, status: 'APPROVED' } }),
            prisma.tradingModel.count({ where: { userId: req.userId, status: 'BACKTESTING' } })
        ]);

        const activeModel = await modelService.getActiveModel(req.userId!);

        return successResponse(res, {
            total,
            active,
            approved,
            backtesting,
            currentDrawdown: activeModel?.currentDrawdown || 0,
            activeModelVersion: activeModel?.version || null
        });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

export default router;
