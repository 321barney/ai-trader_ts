/**
 * Subscription Routes
 * Payment and subscription management
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { subscriptionService } from '../services/subscription.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/subscription/plans
 * Get available subscription plans (public)
 */
router.get('/plans', asyncHandler(async (req: Request, res: Response) => {
    const plans = subscriptionService.getPlans();
    return successResponse(res, plans);
}));

/**
 * GET /api/subscription/status
 * Get current user's subscription status
 */
router.get('/status', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const status = await subscriptionService.getSubscriptionStatus(req.userId!);
    return successResponse(res, status);
}));

/**
 * POST /api/subscription/create
 * Create a new subscription payment
 */
router.post('/create', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const { plan } = req.body;

    if (!plan || !['PRO', 'CUSTOM'].includes(plan)) {
        return errorResponse(res, 'Invalid plan. Choose PRO or contact support for CUSTOM.');
    }

    try {
        const result = await subscriptionService.createSubscription(req.userId!, plan);
        return successResponse(res, result, 'Payment invoice created');
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * POST /api/subscription/accept-terms
 * Accept terms of service
 */
router.post('/accept-terms', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionService.acceptTerms(req.userId!);
    return successResponse(res, result, 'Terms accepted');
}));

/**
 * POST /api/subscription/cancel
 * Cancel current subscription
 */
router.post('/cancel', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await subscriptionService.cancelSubscription(req.userId!);
        return successResponse(res, result);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * GET /api/subscription/refund-eligibility
 * Check if user is eligible for refund
 */
router.get('/refund-eligibility', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionService.canRequestRefund(req.userId!);
    return successResponse(res, result);
}));

/**
 * POST /api/subscription/webhook
 * NOWPayments webhook handler (public, signature verified)
 */
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-nowpayments-sig'] as string;

    try {
        const result = await subscriptionService.handleWebhook(req.body, signature);

        if (result.processed) {
            return res.status(200).json({ status: 'ok' });
        } else {
            console.warn('[Webhook] Not processed');
            return res.status(200).json({ status: 'ok', warning: 'skipped' });
        }
    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        // Still return 200 to prevent retries for invalid signatures
        return res.status(200).json({ status: 'error', message: error.message });
    }
}));

export const subscriptionRouter = router;
