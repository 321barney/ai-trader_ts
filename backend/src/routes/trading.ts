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
    const {
        tradingMode,
        strategyMode,
        tradingEnabled,
        methodology,
        leverage,
        selectedPairs,
        asterApiKey,
        asterApiSecret,
        deepseekApiKey
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
            deepseekApiKey,
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
            const user = await prisma.user.findUnique({ where: { id: req.userId } });

            if (user?.asterApiKey && user?.asterApiSecret) {
                apiKey = user.asterApiKey;
                apiSecret = user.asterApiSecret;
                testnet = user.asterTestnet ?? true;
            } else {
                return successResponse(res, {
                    connected: false,
                    error: 'Please provide API credentials or save them in settings first'
                });
            }
        }

        // Import Aster service dynamically to test connection
        const { createAsterService } = await import('../services/aster.service.js');

        // Create a test client with provided credentials
        const testService = createAsterService(apiKey, apiSecret, testnet ?? true);

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
        const { prisma } = await import('../utils/prisma.js');
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (user?.deepseekApiKey) {
            apiKey = user.deepseekApiKey;
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
            const error = await response.json();
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

        if (!user?.asterApiKey || !user?.asterApiSecret) {
            return successResponse(res, {
                connected: false,
                balance: [],
                totalValue: 0,
                error: 'AsterDex not connected. Please add API credentials in Settings.'
            });
        }

        // Create Aster service with user's credentials
        const { createAsterService } = await import('../services/aster.service.js');
        const aster = createAsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet ?? true);

        // Fetch balance
        const balances = await aster.getBalance();

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
        const { prisma } = await import('../utils/prisma.js');
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });

        if (!user?.asterApiKey || !user?.asterApiSecret) {
            return successResponse(res, {
                positions: [],
                error: 'AsterDex not connected'
            });
        }

        const { createAsterService } = await import('../services/aster.service.js');
        const aster = createAsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet ?? true);

        const positions = await aster.getPositions();

        return successResponse(res, {
            positions,
            count: positions.length
        });
    } catch (error: any) {
        return successResponse(res, {
            positions: [],
            error: error.message
        });
    }
}));

/**
 * GET /api/trading/pairs
 * Get available trading pairs from AsterDex
 */
router.get('/pairs', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const { asterService } = await import('../services/aster.service.js');
        const pairs = await asterService.getPairs();

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


