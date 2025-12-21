/**
 * Onboarding Routes
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
const prisma = new PrismaClient();

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
            onboardingCompleted: true,
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
        completed: user.onboardingCompleted,
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
                onboardingCompleted: true,
            };
            break;
    }

    const user = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
            onboardingStep: true,
            onboardingCompleted: true,
        },
    });

    return successResponse(res, {
        step,
        nextStep: step < 6 ? step + 1 : null,
        completed: user.onboardingCompleted,
    });
}));

/**
 * POST /api/onboarding/skip
 */
router.post('/skip', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { step } = req.body;

    if (step !== 6) {
        return errorResponse(res, 'Only step 6 (DeepSeek) can be skipped');
    }

    const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
            onboardingStep: 6,
            onboardingCompleted: true,
        },
    });

    return successResponse(res, { completed: user.onboardingCompleted });
}));

/**
 * POST /api/onboarding/test-connection
 * Test AsterDex API connection before saving
 */
router.post('/test-connection', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { apiKey, apiSecret, testnet } = req.body;

    if (!apiKey || !apiSecret) {
        return errorResponse(res, 'API key and secret are required');
    }

    try {
        // Dynamic import to avoid circular dependencies
        const { createAsterService } = await import('../services/aster.service.js');
        const aster = createAsterService(apiKey, apiSecret, testnet ?? true);

        const result = await aster.testConnection();

        if (!result.success) {
            return errorResponse(res, result.error || 'Connection failed');
        }

        // Get available pairs
        const pairs = await aster.getPairs();
        const activePairs = pairs.filter(p => p.status === 'TRADING');

        return successResponse(res, {
            connected: true,
            balance: result.balance,
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
        const { createAsterService } = await import('../services/aster.service.js');
        const aster = createAsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet);

        const pairs = await aster.getPairs();
        const activePairs = pairs.filter(p => p.status === 'TRADING');

        return successResponse(res, activePairs);
    } catch (error: any) {
        return errorResponse(res, `Failed to fetch pairs: ${error.message}`);
    }
}));

export const onboardingRouter = router;
