/**
 * Trading Routes
 */

import { Router, Request, Response } from 'express';
import { tradingService } from '../services/trading.service.js';
import { authMiddleware, onboardingCompleteMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/trading/status
 */
router.get('/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const status = await tradingService.getStatus(req.userId!);
        return successResponse(res, status);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * PUT /api/trading/enable
 */
router.put('/enable', authMiddleware, onboardingCompleteMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { disclaimerAccepted } = req.body;

    try {
        const result = await tradingService.enableTrading(req.userId!, disclaimerAccepted);
        return successResponse(res, result, 'Trading enabled');
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * PUT /api/trading/disable
 */
router.put('/disable', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await tradingService.disableTrading(req.userId!);
        return successResponse(res, result, 'Trading disabled');
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * PUT /api/trading/settings
 */
router.put('/settings', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { tradingMode, strategyMode } = req.body;

    try {
        const result = await tradingService.updateSettings(req.userId!, {
            tradingMode,
            strategyMode,
        });
        return successResponse(res, result, 'Settings updated');
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * POST /api/trading/analyze
 */
router.post('/analyze', authMiddleware, onboardingCompleteMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;

    if (!symbol) {
        return errorResponse(res, 'Symbol is required');
    }

    try {
        const analysis = await tradingService.runAnalysis(req.userId!, symbol);
        return successResponse(res, analysis);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * GET /api/trading/signals
 */
router.get('/signals', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { limit, symbol } = req.query;

    try {
        const signals = await tradingService.getSignals(req.userId!, {
            limit: limit ? parseInt(limit as string) : 10,
            symbol: symbol as string,
        });
        return successResponse(res, signals);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * GET /api/trading/trades
 */
router.get('/trades', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { limit, status } = req.query;

    try {
        const trades = await tradingService.getTrades(req.userId!, {
            limit: limit ? parseInt(limit as string) : 20,
            status: status as 'OPEN' | 'CLOSED',
        });
        return successResponse(res, trades);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * GET /api/trading/pnl
 */
router.get('/pnl', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const pnl = await tradingService.getPnLSummary(req.userId!);
        return successResponse(res, pnl);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

export default router;
