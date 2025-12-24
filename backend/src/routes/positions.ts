/**
 * Positions API Routes
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';
import { positionManager } from '../services/position-manager.service.js';
import { executionService } from '../services/execution.service.js';
import { prisma } from '../utils/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

const db = prisma as any;
const router = Router();

// All position routes require authentication AND active subscription
router.use(authMiddleware);
router.use(requireSubscription);


/**
 * GET /api/positions - Get open positions
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const positions = await db.position.findMany({
            where: { userId: req.userId, status: 'OPEN' },
            orderBy: { createdAt: 'desc' }
        });
        return successResponse(res, positions);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/positions/history - Get closed positions
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
    try {
        const positions = await db.position.findMany({
            where: { userId: req.userId, status: 'CLOSED' },
            orderBy: { closedAt: 'desc' },
            take: 50
        });
        return successResponse(res, positions);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/positions/:id/close - Close a position manually
 */
router.post('/:id/close', authMiddleware, async (req: Request, res: Response) => {
    try {
        const position = await db.position.findFirst({
            where: { id: req.params.id, userId: req.userId, status: 'OPEN' }
        });

        if (!position) {
            return errorResponse(res, 'Position not found', 404);
        }

        // Get current price for PnL calculation
        const { asterService } = await import('../services/aster.service.js');
        const currentPrice = await asterService.getPrice(position.symbol);

        await positionManager.closePosition(position, 'MANUAL', currentPrice);

        return successResponse(res, { message: 'Position closed' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/positions/stats - Get position stats
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
        const [openCount, totalPnl] = await Promise.all([
            db.position.count({ where: { userId: req.userId, status: 'OPEN' } }),
            db.position.aggregate({
                where: { userId: req.userId, status: 'CLOSED' },
                _sum: { realizedPnl: true }
            })
        ]);

        return successResponse(res, {
            openPositions: openCount,
            totalRealizedPnl: totalPnl._sum?.realizedPnl || 0
        });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/positions/execution/status - Get execution service status
 */
router.get('/execution/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const status = executionService.getStatus();
        const pmStatus = positionManager.getStatus();
        return successResponse(res, { execution: status, positionManager: pmStatus });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/positions/execution/start - Start execution loop
 */
router.post('/execution/start', authMiddleware, async (req: Request, res: Response) => {
    try {
        await executionService.start(req.userId!);
        await positionManager.start();
        return successResponse(res, { message: 'Execution started' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/positions/execution/stop - Stop execution loop
 */
router.post('/execution/stop', authMiddleware, async (req: Request, res: Response) => {
    try {
        executionService.stop();
        positionManager.stop();
        return successResponse(res, { message: 'Execution stopped' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

export const positionsRouter = router;
