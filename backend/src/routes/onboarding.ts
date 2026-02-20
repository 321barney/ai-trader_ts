/**
 * Onboarding Routes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
    validateSchema,
    onboardingStep1Schema,
    onboardingStep2Schema,
    onboardingStep3Schema,
    onboardingStep4Schema,
    onboardingStep5Schema,
    onboardingStep6Schema,
} from '../utils/validation.js';

const router = Router();


const stepSchemas = {
    1: onboardingStep1Schema,
    2: onboardingStep2Schema,
    3: onboardingStep3Schema,
    4: onboardingStep4Schema,
    5: onboardingStep5Schema,
    6: onboardingStep6Schema,
};

/**
 * GET /api/onboarding/status
 */
router.get('/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
            onboardingStep: true,
            asterApiKey: true,
            leverage: true,
            selectedPairs: true,
            marketType: true,
            methodology: true,
            deepseekApiKey: true,
        },
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
        currentStep: user.onboardingStep,
        completed: user.onboardingStep >= 6,
        steps: {
            1: !!user.asterApiKey,
            2: !!user.leverage,
            3: !!(user.selectedPairs as any)?.length,
            4: !!user.marketType,
            5: !!user.methodology,
            6: true, // DeepSeek is optional
        },
    });
}));

/**
 * POST /api/onboarding/fix
 * Force-complete onboarding for existing users
 */
router.post('/fix', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
            onboardingStep: 6,
        },
        select: {
            id: true,
            onboardingStep: true,
        },
    });

    return successResponse(res, {
        fixed: true,
        onboardingCompleted: true,
        message: 'Onboarding marked as complete'
    });
}));

/**
 * POST /api/onboarding/step
 */
router.post('/step', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { step, data } = req.body;

    if (!step || step < 1 || step > 6) {
        return errorResponse(res, 'Invalid step number');
    }

    const schema = stepSchemas[step as keyof typeof stepSchemas];
    const validation = validateSchema(schema as any, data);

    if (!validation.success) {
        return errorResponse(res, validation.error);
    }

    // Build update data based on step
    let updateData: any = { onboardingStep: step };

    switch (step) {
        case 1:
            updateData = {
                ...updateData,
                asterApiKey: (validation.data as any).asterApiKey,
                asterApiSecret: (validation.data as any).asterApiSecret,
                asterTestnet: (validation.data as any).asterTestnet ?? true,
            };
            break;
        case 2:
            updateData = {
                ...updateData,
                leverage: (validation.data as any).leverage,
            };
            break;
        case 3:
            updateData = {
                ...updateData,
                selectedPairs: (validation.data as any).selectedPairs,
            };
            break;
        case 4:
            updateData = {
                ...updateData,
                marketType: (validation.data as any).marketType,
            };
            break;
        case 5:
            updateData = {
                ...updateData,
                methodology: (validation.data as any).methodology,
            };
            break;
        case 6:
            updateData = {
                ...updateData,
                deepseekApiKey: (validation.data as any).deepseekApiKey || null,
            };
            break;
    }

    const user = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
            onboardingStep: true,
        },
    });

    return successResponse(res, {
        step,
        nextStep: step < 6 ? step + 1 : null,
        completed: step >= 6,
    });
}));

/**
 * POST /api/onboarding/skip
 */
router.post('/skip', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { step } = req.body;

    // Allow skipping step 1 (exchange) and step 6 (deepseek)
    if (step !== 1 && step !== 6) {
        return errorResponse(res, 'Only step 1 (Exchange) and 6 (DeepSeek) can be skipped');
    }

    const updateData: any = { onboardingStep: step + 1 };



    const user = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
    });

    return successResponse(res, {
        step,
        nextStep: step < 6 ? step + 1 : null,
        completed: step >= 6
    });
}));

/**
 * POST /api/onboarding/test-connection
 * Test AsterDex API connection before saving
 */
console.log('[OnboardingRoutes] Registering POST /test-connection');
router.post('/test-connection', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    console.log('[OnboardingRoutes] test-connection called with:', { apiKey: !!req.body.apiKey, apiSecret: !!req.body.apiSecret });
    const { apiKey, apiSecret, testnet } = req.body;

    if (!apiKey || !apiSecret) {
        return errorResponse(res, 'API key and secret are required');
    }

    try {
        // Dynamic import to avoid circular dependencies
        const { exchangeFactory } = await import('../services/exchange.service.js');
        const exchange = exchangeFactory.getAdapter(
            req.body.preferredExchange || 'aster',
            { apiKey, apiSecret, testnet: testnet ?? true }
        );

        const result = await exchange.testConnection();

        if (!result.success) {
            return errorResponse(res, result.error || 'Connection failed');
        }

        // Get available pairs
        const pairs = await exchange.getPairs();
        const activePairs = pairs.filter(p => p.status === 'TRADING');

        // Fetch balance explicitly
        const balance = await exchange.getBalance();

        return successResponse(res, {
            connected: true,
            balance: balance,
            availablePairs: activePairs.slice(0, 20), // Return top 20 pairs
            totalPairs: activePairs.length,
        });
    } catch (error: any) {
        return errorResponse(res, `Connection failed: ${error.message}`);
    }
}));

/**
 * GET /api/onboarding/pairs
 * Get available trading pairs from AsterDex
 */
router.get('/pairs', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { asterApiKey: true, asterApiSecret: true, asterTestnet: true },
    });

    if (!user?.asterApiKey || !user?.asterApiSecret) {
        return errorResponse(res, 'API credentials not configured');
    }

    try {
        const { exchangeFactory } = await import('../services/exchange.service.js');
        // Use default exchange or user's preference if available (here default to Aster for pairs list if not specified)
        const exchange = exchangeFactory.getAdapterForUser(
            (user as any).preferredExchange || 'aster',
            user.asterApiKey,
            user.asterApiSecret,
            user.asterTestnet
        );

        const pairs = await exchange.getPairs();
        const activePairs = pairs.filter(p => p.status === 'TRADING');

        return successResponse(res, activePairs);
    } catch (error: any) {
        return errorResponse(res, `Failed to fetch pairs: ${error.message}`);
    }
}));

export const onboardingRouter = router;
