/**
 * Portfolio API Routes
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { portfolioService } from '../services/portfolio.service.js';
import { riskManager } from '../services/risk-manager.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/portfolio - Get full portfolio summary
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const summary = await portfolioService.getSummary(req.userId!);
        return successResponse(res, summary);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/portfolio/performance - Get performance metrics
 */
router.get('/performance', authMiddleware, async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const metrics = await portfolioService.getPerformanceMetrics(req.userId!, days);
        return successResponse(res, metrics);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/portfolio/risk - Get risk status
 */
router.get('/risk', authMiddleware, async (req: Request, res: Response) => {
    try {
        const riskStatus = await riskManager.checkUserRisk(req.userId!);
        return successResponse(res, riskStatus);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/portfolio/risk/check-trade - Check if a trade is allowed
 */
router.post('/risk/check-trade', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { positionSize } = req.body;
        const result = await riskManager.canOpenTrade(req.userId!, positionSize);
        return successResponse(res, result);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

export const portfolioRouter = router;
