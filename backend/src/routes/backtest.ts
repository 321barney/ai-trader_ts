/**
 * Backtest Routes
 * Frontend-independent backtest management
 */

import { Router, Request, Response } from 'express';
import { backtestService } from '../services/backtest.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

/**
 * POST /api/backtest/start
 * Start a new backtest session
 */
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { strategyVersionId, symbol, initDate, endDate, initialCapital } = req.body;

    if (!strategyVersionId || !symbol || !initDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: strategyVersionId, symbol, initDate, endDate'
        });
    }

    const session = await backtestService.startBacktest(userId, {
        strategyVersionId,
        symbol,
        initDate: new Date(initDate),
        endDate: new Date(endDate),
        initialCapital: initialCapital || 10000
    });

    res.json({
        success: true,
        data: session
    });
}));

/**
 * GET /api/backtest/status/:sessionId
 * Get backtest session status and progress
 */
router.get('/status/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = await backtestService.getSession(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    res.json({
        success: true,
        data: {
            id: session.id,
            strategyVersionId: session.strategyVersionId,
            status: session.status,
            symbol: session.symbol,
            currentDate: session.currentDate,
            currentStep: session.currentStep,
            totalSteps: session.totalSteps,
            progress: session.totalSteps > 0
                ? Math.round((session.currentStep / session.totalSteps) * 100)
                : 0,
            portfolioValue: session.portfolioValue,
            portfolioHistory: session.portfolioHistory,
            initialCapital: session.initialCapital,
            totalReturn: session.totalReturn,
            maxDrawdown: session.maxDrawdown,
            completedAt: session.completedAt
        }
    });
}));

/**
 * GET /api/backtest/active
 * Get user's currently active backtest
 */
router.get('/active', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const session = await backtestService.getActiveBacktest(userId);

    res.json({
        success: true,
        data: session
    });
}));

/**
 * GET /api/backtest/history
 * Get user's backtest history
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const sessions = await backtestService.getUserBacktests(userId);

    res.json({
        success: true,
        data: sessions
    });
}));

/**
 * POST /api/backtest/pause/:sessionId
 * Pause a running backtest
 */
router.post('/pause/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = await backtestService.pauseBacktest(sessionId);

    res.json({
        success: true,
        data: session
    });
}));

/**
 * POST /api/backtest/resume/:sessionId
 * Resume a paused backtest
 */
router.post('/resume/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = await backtestService.resumeBacktest(sessionId);

    res.json({
        success: true,
        data: session
    });
}));

export { router as backtestRouter };
