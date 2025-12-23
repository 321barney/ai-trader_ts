/**
 * Analytics API Routes
 * 
 * Endpoints for analysis services
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { postTradeAnalysisService } from '../services/post-trade-analysis.service.js';
import { multiTimeframeService } from '../services/multi-timeframe.service.js';
import { sentimentService } from '../services/sentiment.service.js';
import { historicalReplayService } from '../services/historical-replay.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// ============ Post-Trade Analysis ============

/**
 * GET /api/analytics/trade/:id - Analyze a specific trade
 */
router.get('/trade/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const analysis = await postTradeAnalysisService.analyzeTradeWithAI(req.params.id);
        if (!analysis) {
            return errorResponse(res, 'Trade not found or not closed', 404);
        }
        return successResponse(res, analysis);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/analytics/performance - Get performance insights
 */
router.get('/performance', authMiddleware, async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const insights = await postTradeAnalysisService.getPerformanceInsights(req.userId!, days);
        return successResponse(res, insights);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/analytics/journal - Get daily journal
 */
router.get('/journal', authMiddleware, async (req: Request, res: Response) => {
    try {
        const date = req.query.date ? new Date(req.query.date as string) : undefined;
        const journal = await postTradeAnalysisService.getDailyJournal(req.userId!, date);
        return successResponse(res, journal);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

// ============ Multi-Timeframe Analysis ============

/**
 * GET /api/analytics/mtf/:symbol - Get multi-timeframe analysis
 */
router.get('/mtf/:symbol', authMiddleware, async (req: Request, res: Response) => {
    try {
        const result = await multiTimeframeService.analyzeSymbol(req.params.symbol);
        return successResponse(res, result);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/analytics/mtf/validate - Validate signal with MTF
 */
router.post('/mtf/validate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { symbol, direction } = req.body;
        const validation = await multiTimeframeService.validateSignal(symbol, direction);
        return successResponse(res, validation);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

// ============ Sentiment ============

/**
 * GET /api/analytics/sentiment/:symbol - Get sentiment data
 */
router.get('/sentiment/:symbol', authMiddleware, async (req: Request, res: Response) => {
    try {
        const sentiment = await sentimentService.getSentiment(req.params.symbol);
        return successResponse(res, sentiment);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

// ============ Historical Replay ============

/**
 * POST /api/analytics/replay - Create replay session
 */
router.post('/replay', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { symbol, startDate, endDate, speed, initialCapital } = req.body;
        const replayId = await historicalReplayService.createReplay(req.userId!, {
            symbol,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            speed: speed || 1,
            initialCapital: initialCapital || 10000
        });
        return successResponse(res, { replayId });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/analytics/replay/:id/start - Start replay
 */
router.post('/replay/:id/start', authMiddleware, async (req: Request, res: Response) => {
    try {
        await historicalReplayService.startReplay(req.params.id);
        return successResponse(res, { message: 'Replay started' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/analytics/replay/:id/stop - Stop replay
 */
router.post('/replay/:id/stop', authMiddleware, async (req: Request, res: Response) => {
    try {
        const state = historicalReplayService.stopReplay(req.params.id);
        const stats = historicalReplayService.getStatistics(req.params.id);
        return successResponse(res, { state, stats });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * GET /api/analytics/replay/:id - Get replay state
 */
router.get('/replay/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const state = historicalReplayService.getState(req.params.id);
        if (!state) {
            return errorResponse(res, 'Replay not found', 404);
        }
        return successResponse(res, state);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

export const analyticsRouter = router;
