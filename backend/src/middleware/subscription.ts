/**
 * Subscription Middleware
 * Protects endpoints that require an active paid subscription
 * 
 * Set PAYMENT_REQUIRED=false in .env to disable payment protection (for development)
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

/**
 * Check if payment protection is enabled
 * Default is true (payment required)
 * Set PAYMENT_REQUIRED=false to disable
 */
function isPaymentRequired(): boolean {
    const envValue = process.env.PAYMENT_REQUIRED?.toLowerCase();
    // Only disable if explicitly set to 'false'
    return envValue !== 'false';
}

/**
 * Middleware to require an active PRO or CUSTOM subscription
 * Users on FREE plan will be blocked from accessing protected endpoints
 * 
 * Can be disabled by setting PAYMENT_REQUIRED=false in environment
 */
export async function requireSubscription(req: Request, res: Response, next: NextFunction) {
    // Check if payment protection is disabled via env var
    if (!isPaymentRequired()) {
        console.log('[SubscriptionMiddleware] Payment protection DISABLED via PAYMENT_REQUIRED=false');
        return next();
    }

    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Get user's subscription status
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionEndsAt: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user has a paid subscription
        if (user.subscriptionPlan === 'FREE') {
            return res.status(402).json({
                success: false,
                error: 'Active subscription required to access this feature',
                code: 'SUBSCRIPTION_REQUIRED',
                redirect: '/pricing'
            });
        }

        // Check if subscription is active
        if (user.subscriptionStatus !== 'ACTIVE') {
            return res.status(402).json({
                success: false,
                error: 'Your subscription is not active. Please renew to continue.',
                code: 'SUBSCRIPTION_INACTIVE',
                status: user.subscriptionStatus,
                redirect: '/pricing'
            });
        }

        // Check if subscription has expired
        if (user.subscriptionEndsAt && new Date() > new Date(user.subscriptionEndsAt)) {
            // Update user status to expired
            await (prisma as any).user.update({
                where: { id: userId },
                data: {
                    subscriptionPlan: 'FREE',
                    subscriptionStatus: 'EXPIRED'
                }
            });

            return res.status(402).json({
                success: false,
                error: 'Your subscription has expired. Please renew to continue.',
                code: 'SUBSCRIPTION_EXPIRED',
                redirect: '/pricing'
            });
        }

        // Subscription is valid, continue
        next();
    } catch (error: any) {
        console.error('[SubscriptionMiddleware] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify subscription status'
        });
    }
}

/**
 * Middleware for endpoints that are enhanced with subscription but still work on free plan
 * Sets req.hasPaidSubscription for conditional logic
 */
export async function checkSubscription(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId;

        if (!userId) {
            (req as any).hasPaidSubscription = false;
            return next();
        }

        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionEndsAt: true
            }
        });

        if (!user) {
            (req as any).hasPaidSubscription = false;
            return next();
        }

        // Check if subscription is active and not expired
        const isActive = user.subscriptionPlan !== 'FREE' &&
            user.subscriptionStatus === 'ACTIVE' &&
            (!user.subscriptionEndsAt || new Date() <= new Date(user.subscriptionEndsAt));

        (req as any).hasPaidSubscription = isActive;
        (req as any).subscriptionPlan = user.subscriptionPlan;

        next();
    } catch (error) {
        (req as any).hasPaidSubscription = false;
        next();
    }
}
