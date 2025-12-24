/**
 * Strategy Routes
 * CRUD operations for strategy versions
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireSubscription } from '../middleware/subscription.js';
import { strategyService } from '../services/strategy.service.js';

const router = Router();

// All routes require authentication AND active subscription
router.use(authMiddleware);
router.use(requireSubscription);


/**
 * GET /api/strategies
 * List all strategy versions for the user
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const versions = await strategyService.getVersions(userId);

        res.json({
            success: true,
            data: versions
        });
    } catch (error: any) {
        console.error('[Strategy] Error fetching versions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/strategies/active
 * Get the currently active strategy
 */
router.get('/active', async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const active = await strategyService.getActiveStrategy(userId);

        res.json({
            success: true,
            data: active
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/strategies
 * Create a new strategy draft
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { baseMethodology, rules, timeframes } = req.body;

        if (!baseMethodology) {
            return res.status(400).json({
                success: false,
                error: 'baseMethodology is required'
            });
        }

        // Validate timeframes or use default
        const validTimeframes = Array.isArray(timeframes) && timeframes.length > 0
            ? timeframes
            : ['1h'];

        const draft = await strategyService.createDraft(userId, baseMethodology, rules || {}, validTimeframes);

        res.json({
            success: true,
            data: draft
        });
    } catch (error: any) {
        console.error('[Strategy] Error creating draft:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/strategies/:id/test
 * Mark strategy as tested
 */
router.put('/:id/test', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updated = await strategyService.markAsTested(id);

        res.json({
            success: true,
            data: updated
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/strategies/:id/promote
 * Promote strategy to ACTIVE (archives previous active)
 */
router.put('/:id/promote', async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const promoted = await strategyService.promoteToActive(userId, id);

        res.json({
            success: true,
            data: promoted
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/strategies/:id/backtest-complete
 * Mark strategy backtest as completed (required before marking as TESTED)
 */
router.put('/:id/backtest-complete', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const updated = await strategyService.markBacktestCompleted(id);

        res.json({
            success: true,
            data: updated
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/strategies/:id
 * Delete a strategy version (only if not ACTIVE)
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const deleted = await strategyService.deleteStrategy(userId, id);

        res.json({
            success: true,
            data: deleted,
            message: 'Strategy deleted successfully'
        });
    } catch (error: any) {
        console.error('[Strategy] Error deleting strategy:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export { router as strategyRouter };

