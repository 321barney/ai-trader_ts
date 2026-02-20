/**
 * Trading Routes
 */

import { Router, Request, Response } from 'express';
import { tradingService } from '../services/trading.service.js';
import { vaultService } from '../services/vault.service.js';
import { authMiddleware } from '../middleware/auth.js';

import { asyncHandler } from '../middleware/error.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// All trading routes require authentication AND active subscription
router.use(authMiddleware);



/**
 * GET /api/trading/signals
 */
router.get('/signals', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const signals = await tradingService.getSignals(req.userId!);
        return successResponse(res, signals);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * POST /api/trading/signal
 * Generate a new trading signal using local RL interpretation
 * Works 100% offline - no external RL API required
 */
router.post('/signal', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;

    if (!symbol) {
        return errorResponse(res, 'Symbol is required');
    }

    try {
        const { AgentOrchestrator } = await import('../agents/orchestrator.js');
        const { signalTrackerService } = await import('../services/signal-tracker.service.js');
        const { prisma } = await import('../utils/prisma.js');
        const { schedulerService } = await import('../services/scheduler.service.js');

        // Get user settings
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return errorResponse(res, 'User not found');

        const asterApiKey = await vaultService.getSecret(req.userId!, 'aster_api_key');
        const asterApiSecret = await vaultService.getSecret(req.userId!, 'aster_api_secret');

        // Fetch market data
        const multiTF = await schedulerService.fetchMultiTFData(
            symbol,
            ['15m'], // Default timeframe for signal generation
            asterApiKey || undefined,
            asterApiSecret || undefined
        );

        // Get latest candle from the primary timeframe
        const primaryTF = multiTF.primaryTimeframe || '15m';
        const tfData = multiTF.timeframes[primaryTF] || [];
        const latestCandle = tfData[tfData.length - 1] || {};

        // Build context for local RL
        const orchestrator = new AgentOrchestrator();
        const context = {
            userId: req.userId!,
            symbol,
            marketData: {
                currentPrice: latestCandle.close || 0,
                high: latestCandle.high || 0,
                low: latestCandle.low || 0,
                open: latestCandle.open || 0,
                volume: latestCandle.volume || 0,
            },
            methodology: user.methodology || 'SMC',
        };

        // Use LOCAL RL interpretation (no external API)
        const rlPrediction = orchestrator.getLocalRLInterpretation(context);

        // Skip if HOLD
        if (rlPrediction.action === 'HOLD') {
            return successResponse(res, {
                action: 'HOLD',
                reasoning: rlPrediction.reasoning,
                message: 'No clear trading opportunity - holding position',
                signal: null
            });
        }

        // Create signal via signal tracker service
        const signal = await signalTrackerService.createSignal(
            req.userId!,
            null, // strategyVersionId
            {
                symbol,
                direction: rlPrediction.action,
                entryPrice: rlPrediction.entry || latestCandle.close || 0,
                stopLoss: rlPrediction.stopLoss || 0,
                takeProfit: rlPrediction.takeProfit || 0,
                confidence: rlPrediction.confidence,
                agentReasoning: {
                    strategyConsultant: 'Local RL Technical Analysis',
                    riskOfficer: `R:R ${rlPrediction.riskRewardRatio?.toFixed(2) || 'N/A'}`,
                    marketAnalyst: rlPrediction.smcAnalysis || 'SMC Analysis',
                },
                indicators: {
                    modelVersion: rlPrediction.modelVersion,
                    volumeAnalysis: rlPrediction.volumeAnalysis,
                    reasoning: rlPrediction.reasoning,
                    expectedReturn: rlPrediction.expectedReturn,
                },
            },
            24 // expires in 24 hours
        );

        return successResponse(res, {
            action: rlPrediction.action,
            confidence: rlPrediction.confidence,
            entry: rlPrediction.entry,
            stopLoss: rlPrediction.stopLoss,
            takeProfit: rlPrediction.takeProfit,
            riskRewardRatio: rlPrediction.riskRewardRatio,
            reasoning: rlPrediction.reasoning,
            smcAnalysis: rlPrediction.smcAnalysis,
            volumeAnalysis: rlPrediction.volumeAnalysis,
            modelVersion: rlPrediction.modelVersion,
            signal: {
                id: signal.id,
                status: signal.status,
                createdAt: signal.createdAt,
            },
            message: `${rlPrediction.action} signal generated using Local RL (no external API)`
        });

    } catch (error: any) {
        console.error('[Signal Endpoint] Error:', error);
        return errorResponse(res, error.message);
    }
}));

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
 * GET /api/trading/symbols
 */
router.get('/symbols', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const symbols = await tradingService.getSymbols();
        return successResponse(res, symbols);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * PUT /api/trading/enable
 */
router.put('/enable', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
    const {
        tradingMode,
        strategyMode,
        tradingEnabled,
        methodology,
        leverage,
        selectedPairs,
        asterApiKey,
        asterApiSecret,
        asterTestnet,
        deepseekApiKey,
        openaiApiKey,
        anthropicApiKey,
        geminiApiKey,
        marketAnalystModel,
        riskOfficerModel,
        strategyConsultantModel,
        orchestratorModel
    } = req.body;

    try {
        const result = await tradingService.updateSettings(req.userId!, {
            tradingMode,
            strategyMode,
            tradingEnabled,
            methodology,
            leverage,
            selectedPairs,
            asterApiKey,
            asterApiSecret,
            asterTestnet,
            deepseekApiKey,
            openaiApiKey,
            anthropicApiKey,
            geminiApiKey,
            marketAnalystModel,
            riskOfficerModel,
            strategyConsultantModel,
            orchestratorModel
        });
        return successResponse(res, result, 'Settings updated');
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * POST /api/trading/analyze
 */
router.post('/analyze', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
 * POST /api/trading/debug/trigger-analysis
 * Manual trigger for debugging
 */
router.post('/debug/trigger-analysis', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.body;
    try {
        const { schedulerService } = await import('../services/scheduler.service.js');
        const { prisma } = await import('../utils/prisma.js');

        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return errorResponse(res, 'User not found');

        const asterApiKey = await vaultService.getSecret(req.userId!, 'aster_api_key');
        const asterApiSecret = await vaultService.getSecret(req.userId!, 'aster_api_secret');

        // Fetch Data
        const multiTF = await schedulerService.fetchMultiTFData(
            symbol || 'BTCUSDT',
            ['1h'], // Default timeframe for debug analysis
            asterApiKey || undefined,
            asterApiSecret || undefined
        );

        // Execute
        await tradingService.executeScheduledAnalysis(user.id, symbol || 'BTCUSDT', multiTF);

        return successResponse(res, { message: 'Analysis triggered manually check server logs' });
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

/**
 * POST /api/trading/test-aster
 * Test Aster exchange API connection
 */
router.post('/test-aster', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    let { apiKey, apiSecret, testnet } = req.body;

    try {
        // If keys not provided, try to get from DB
        if (!apiKey || !apiSecret) {
            const { prisma } = await import('../utils/prisma.js');
            // const user = await prisma.user.findUnique({ where: { id: req.userId } });

            const dbApiKey = await vaultService.getSecret(req.userId!, 'aster_api_key');
            const dbApiSecret = await vaultService.getSecret(req.userId!, 'aster_api_secret');

            if (dbApiKey && dbApiSecret) {
                apiKey = dbApiKey;
                apiSecret = dbApiSecret;
                testnet = true; // Defaulting to true as field removed. 
            } else {
                return successResponse(res, {
                    connected: false,
                    error: 'Please provide API credentials or save them in settings first'
                });
            }
        }

        // Import Exchange service dynamically to test connection
        const { exchangeFactory } = await import('../services/exchange.service.js');

        // Create a test client with provided credentials
        const testService = exchangeFactory.getAdapter('aster', { apiKey, apiSecret, testnet: testnet ?? true });

        // Test by fetching balance
        const balance = await testService.getBalance();

        return successResponse(res, {
            connected: true,
            balance: balance,
            message: 'Successfully connected to Aster exchange'
        });
    } catch (error: any) {
        return successResponse(res, {
            connected: false,
            error: error.message || 'Failed to connect to Aster exchange'
        });
    }
}));

/**
 * POST /api/trading/test-deepseek
 * Test DeepSeek AI API connection
 */
router.post('/test-deepseek', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    let { apiKey } = req.body;

    // If key not provided, try to get from DB
    if (!apiKey) {
        // const { prisma } = await import('../utils/prisma.js');
        const dbKey = await vaultService.getSecret(req.userId!, 'deepseek_api_key');
        if (dbKey) {
            apiKey = dbKey;
        } else {
            return successResponse(res, {
                connected: false,
                error: 'Please provide API key or save it in settings first'
            });
        }
    }

    try {
        // Test DeepSeek API directly
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: 'Ping' }],
                max_tokens: 1
            })
        });

        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.error?.message || 'DeepSeek API connection failed');
        }

        return successResponse(res, {
            connected: true,
            message: 'Successfully connected to DeepSeek AI'
        });
    } catch (error: any) {
        return successResponse(res, {
            connected: false,
            error: error.message || 'Failed to connect to DeepSeek API'
        });
    }
}));

/**
 * POST /api/trading/test-openai
 * Test OpenAI API connection
 */
router.post('/test-openai', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    let { apiKey } = req.body;

    if (!apiKey) {
        const dbKey = await vaultService.getSecret(req.userId!, 'openai_api_key');
        if (dbKey) apiKey = dbKey;
        else return successResponse(res, { connected: false, error: 'Please provide API key or save it in settings first' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Ping' }],
                max_tokens: 1
            })
        });

        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.error?.message || 'OpenAI API connection failed');
        }

        return successResponse(res, { connected: true, message: 'Successfully connected to OpenAI' });
    } catch (error: any) {
        return successResponse(res, { connected: false, error: error.message || 'Failed to connect to OpenAI API' });
    }
}));

/**
 * POST /api/trading/test-anthropic
 * Test Anthropic API connection
 */
router.post('/test-anthropic', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    let { apiKey } = req.body;

    if (!apiKey) {
        const dbKey = await vaultService.getSecret(req.userId!, 'anthropic_api_key');
        if (dbKey) apiKey = dbKey;
        else return successResponse(res, { connected: false, error: 'Please provide API key or save it in settings first' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Ping' }]
            })
        });

        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.error?.message || 'Anthropic API connection failed');
        }

        return successResponse(res, { connected: true, message: 'Successfully connected to Anthropic' });
    } catch (error: any) {
        return successResponse(res, { connected: false, error: error.message || 'Failed to connect to Anthropic API' });
    }
}));

/**
 * POST /api/trading/test-gemini
 * Test Google Gemini API connection
 */
router.post('/test-gemini', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    let { apiKey } = req.body;

    if (!apiKey) {
        const dbKey = await vaultService.getSecret(req.userId!, 'gemini_api_key');
        if (dbKey) apiKey = dbKey;
        else return successResponse(res, { connected: false, error: 'Please provide API key or save it in settings first' });
    }

    try {
        // Models: gemini-1.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ping' }] }]
            })
        });

        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.error?.message || 'Gemini API connection failed');
        }

        return successResponse(res, { connected: true, message: 'Successfully connected to Google Gemini' });
    } catch (error: any) {
        return successResponse(res, { connected: false, error: error.message || 'Failed to connect to Gemini API' });
    }
}));

/**
 * GET /api/trading/portfolio
 * Get real portfolio data from AsterDex
 */
router.get('/portfolio', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        // Get user's AsterDex credentials
        const { prisma } = await import('../utils/prisma.js');
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });

        const asterApiKey = await vaultService.getSecret(req.userId!, 'aster_api_key');
        const asterApiSecret = await vaultService.getSecret(req.userId!, 'aster_api_secret');

        if (!asterApiKey || !asterApiSecret) {
            return successResponse(res, {
                connected: false,
                balance: [],
                totalValue: 0,
                error: 'AsterDex not connected. Please add API credentials in Settings.'
            });
        }

        // Create Exchange service with user's credentials
        const { exchangeFactory } = await import('../services/exchange.service.js');
        const exchange = exchangeFactory.getAdapterForUser(
            (user as any).preferredExchange || 'aster',
            asterApiKey,
            asterApiSecret,
            true // Defaulting to testnet as field removed
        );

        // Fetch balance
        const balances = await exchange.getBalance();

        // Calculate total value (assuming USDT as base)
        const totalValue = balances.reduce((sum, b) => sum + b.total, 0);

        return successResponse(res, {
            connected: true,
            balance: balances,
            totalValue,
            testnet: user.asterTestnet ?? true
        });
    } catch (error: any) {
        return successResponse(res, {
            connected: false,
            balance: [],
            totalValue: 0,
            error: error.message
        });
    }
}));

/**
 * GET /api/trading/positions
 * Get open positions from AsterDex
 */
router.get('/positions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        // Use unified service method to get Real + Virtual positions
        const result = await tradingService.getUnifiedPositions(req.userId!);

        return successResponse(res, {
            positions: result.real, // Keep 'positions' as real API positions for backward compat
            virtual: result.virtual,
            combined: result.combined,
            count: result.real.length,
            virtualCount: result.virtual.length
        });
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * GET /api/trading/pairs
 * Get available trading pairs from AsterDex
 */
router.get('/pairs', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const { exchangeFactory } = await import('../services/exchange.service.js');
        const pairs = await exchangeFactory.getDefault().getPairs();

        // Filter to only trading pairs
        const activePairs = pairs.filter(p => p.status === 'TRADING');

        return successResponse(res, {
            pairs: activePairs,
            count: activePairs.length
        });
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

export const tradingRouter = router;


