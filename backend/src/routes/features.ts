import { Router, Request, Response } from 'express';
import { jinaSearchService } from '../services/jina-search.service.js';
import { performanceService } from '../services/performance.service.js';
import { historicalReplayService } from '../services/historical-replay.service.js';
import { postTradeAnalysisService } from '../services/post-trade-analysis.service.js';
import { toolRegistry } from '../mcp/tool-registry.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// ============================================
// MARKET INTELLIGENCE (Jina)
// ============================================

router.get('/market/news', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { query, symbol, days } = req.query;

    if (symbol) {
        const news = await jinaSearchService.getSymbolNews(
            symbol as string,
            { days: Number(days) || 7 }
        );
        res.json({ success: true, count: news.length, data: news });
    } else if (query) {
        const result = await jinaSearchService.searchMarketNews(query as string);
        res.json({ success: true, count: result.totalResults, data: result.results });
    } else {
        res.status(400).json({ success: false, error: 'Query or symbol required' });
    }
}));

router.post('/market/analyze-sentiment', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: 'Text required' });
    }

    const result = jinaSearchService.analyzeSentiment(text);
    res.json({ success: true, data: result });
}));

router.get('/market/financial-reports', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol, reportType } = req.query;

    if (!symbol) {
        return res.status(400).json({ success: false, error: 'Symbol required' });
    }

    const reports = await jinaSearchService.getFinancialReports(
        symbol as string,
        { reportType: reportType as any }
    );

    res.json({ success: true, count: reports.length, data: reports });
}));

// ============================================
// PERFORMANCE ANALYTICS
// ============================================

router.get('/analytics/performance', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const report = await performanceService.generateReport(userId);
    res.json({ success: true, data: report });
}));

router.post('/analytics/analyze-trade', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { tradeId } = req.body;

    if (!tradeId) {
        return res.status(400).json({ success: false, error: 'Trade ID required' });
    }

    const analysis = await postTradeAnalysisService.analyzeTradeWithAI(tradeId);
    res.json({ success: true, data: analysis });
}));

// ============================================
// HISTORICAL REPLAY
// ============================================

router.post('/replay/start', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.userId;
    const config = req.body; // ReplayConfig

    const replayId = await historicalReplayService.createReplay(userId, {
        symbol: config.symbol,
        startDate: new Date(config.initDate || config.startDate),
        endDate: new Date(config.endDate),
        speed: config.speed || 1,
        initialCapital: config.initialCapital || 10000
    });

    res.json({ success: true, data: { replayId } });
}));

router.post('/replay/action/:sessionId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { action } = req.body; // action: 'start', 'pause', 'stop'

    let result;
    if (action === 'start') {
        await historicalReplayService.startReplay(sessionId);
        result = historicalReplayService.getState(sessionId);
    } else if (action === 'pause') {
        historicalReplayService.pauseReplay(sessionId);
        result = historicalReplayService.getState(sessionId);
    } else if (action === 'stop') {
        result = historicalReplayService.stopReplay(sessionId);
    } else {
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    if (!result) {
        return res.status(404).json({
            success: false,
            error: 'Session expired or not found.',
            code: 'SESSION_EXPIRED'
        });
    }

    res.json({ success: true, data: result });
}));

router.get('/replay/session/:sessionId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const state = historicalReplayService.getState(sessionId);
    const stats = historicalReplayService.getStatistics(sessionId);

    if (!state) {
        return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: { state, stats } });
}));

router.post('/replay/trade/:sessionId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { side, price, size } = req.body;

    if (side === 'LONG' || side === 'SHORT') {
        historicalReplayService.openPosition(sessionId, side, price, size);
    } else {
        // Close position - index 0 for simplicity
        historicalReplayService.closePosition(sessionId, 0, price);
    }

    const state = historicalReplayService.getState(sessionId);
    res.json({ success: true, data: state });
}));

// ============================================
// MCP TOOLCHAIN (Debug/Manual)
// ============================================

router.get('/mcp/tools', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const tools = toolRegistry.listTools().map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters
    }));
    res.json({ success: true, count: tools.length, data: tools });
}));

router.post('/mcp/execute', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.userId;
    const { toolName, params, context } = req.body;

    const result = await toolRegistry.executeTool(
        toolName,
        params || {},
        {
            userId,
            isBacktest: context?.isBacktest || false,
            sessionId: context?.sessionId,
            currentDate: context?.currentDate ? new Date(context.currentDate) : undefined
        }
    );

    res.json({ success: true, data: result });
}));

export const featureRouter = router;
