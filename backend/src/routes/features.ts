import { Router } from 'express';
import { jinaSearchService } from '../services/jina-search.service.js';
import { performanceService } from '../services/performance.service.js';
import { historicalReplayService } from '../services/historical-replay.service.js';
import { postTradeAnalysisService } from '../services/post-trade-analysis.service.js';
import { toolRegistry } from '../mcp/tool-registry.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async.js';

const router = Router();

// ============================================
// MARKET INTELLIGENCE (Jina)
// ============================================

router.get('/market/news', authMiddleware, asyncHandler(async (req, res) => {
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

router.post('/market/analyze-sentiment', authMiddleware, asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: 'Text required' });
    }

    const result = jinaSearchService.analyzeSentiment(text);
    res.json({ success: true, data: result });
}));

router.get('/market/financial-reports', authMiddleware, asyncHandler(async (req, res) => {
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

router.get('/analytics/performance', authMiddleware, asyncHandler(async (req, res) => {
    // @ts-ignore
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const report = await performanceService.generateReport(userId);
    res.json({ success: true, data: report });
}));

router.post('/analytics/analyze-trade', authMiddleware, asyncHandler(async (req, res) => {
    const { tradeId } = req.body;
    // In a real app, you'd fetch the trade from DB first
    // For now, we accept full trade object for testing
    const trade = req.body.trade;

    if (!trade) {
        return res.status(400).json({ success: false, error: 'Trade data required' });
    }

    const analysis = await postTradeAnalysisService.analyzeTrade(trade);
    res.json({ success: true, data: analysis });
}));

// ============================================
// HISTORICAL REPLAY
// ============================================

router.post('/replay/start', authMiddleware, asyncHandler(async (req, res) => {
    // @ts-ignore
    const userId = req.user.userId;
    const config = req.body; // ReplayConfig

    const session = historicalReplayService.createSession(userId, config);
    res.json({ success: true, data: session });
}));

router.post('/replay/action/:sessionId', authMiddleware, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { action, steps } = req.body; // action: 'start', 'pause', 'advance'

    let result;
    if (action === 'start') {
        result = historicalReplayService.startSession(sessionId);
    } else if (action === 'pause') {
        result = historicalReplayService.pauseSession(sessionId);
    } else if (action === 'advance') {
        result = historicalReplayService.advanceTime(sessionId, steps || 1);
    } else {
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    if (!result) {
        return res.status(404).json({ success: false, error: 'Session not found or invalid state' });
    }

    res.json({ success: true, data: result });
}));

router.get('/replay/session/:sessionId', authMiddleware, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const summary = historicalReplayService.getSessionSummary(sessionId);

    if (!summary.session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: summary });
}));

router.post('/replay/trade/:sessionId', authMiddleware, asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { symbol, side, quantity, reasoning } = req.body;

    const result = historicalReplayService.executeTrade(
        sessionId,
        symbol,
        side,
        quantity,
        reasoning
    );

    if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.trade });
}));

// ============================================
// MCP TOOLCHAIN (Debug/Manual)
// ============================================

router.get('/mcp/tools', authMiddleware, asyncHandler(async (req, res) => {
    const tools = toolRegistry.listTools().map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters
    }));
    res.json({ success: true, count: tools.length, data: tools });
}));

router.post('/mcp/execute', authMiddleware, asyncHandler(async (req, res) => {
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

export default router;
