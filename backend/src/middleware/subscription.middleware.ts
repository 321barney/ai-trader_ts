/**
 * Subscription Middleware
 * Enforces payment-based access control for premium features
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { unauthorizedResponse } from '../utils/response.js';

/**
 * Check if user has an active paid subscription (PRO or CUSTOM)
 */
export async function requirePaidSubscription(req: Request, res: Response, next: NextFunction) {
    // Subscription checks disabled for open source version
    next();
}

/**
 * Require RL (Reinforcement Learning) access
 * Only PRO and CUSTOM users can use RL training/trading
 */
export async function requireRL(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return unauthorizedResponse(res, 'Authentication required');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
            },
        });

        if (!user || user.subscriptionPlan === 'FREE') {
            return res.status(403).json({
                success: false,
                error: 'RL features require PRO subscription',
                message: 'Reinforcement Learning training and trading require a PRO subscription',
                feature: 'RL_TRAINING',
                upgradeUrl: '/pricing',
            });
        }

        if (user.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                message: 'Your subscription is not active',
                feature: 'RL_TRAINING',
            });
        }

        next();
    } catch (error) {
        console.error('[RL Middleware] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify RL access',
        });
    }
}

/**
 * Require AI Agents access
 * Only PRO and CUSTOM users can use AI agent decisions
 */
export async function requireAgents(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return unauthorizedResponse(res, 'Authentication required');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
            },
        });

        if (!user || user.subscriptionPlan === 'FREE') {
            return res.status(403).json({
                success: false,
                error: 'AI Agents require PRO subscription',
                message: 'AI-powered trading decisions require a PRO subscription',
                feature: 'AI_AGENTS',
                upgradeUrl: '/pricing',
            });
        }

        if (user.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                feature: 'AI_AGENTS',
            });
        }

        next();
    } catch (error) {
        console.error('[Agents Middleware] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify agent access',
        });
    }
}

/**
 * Require Signal Generation access
 * Only PRO and CUSTOM users can generate trading signals
 */
export async function requireSignals(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return unauthorizedResponse(res, 'Authentication required');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
            },
        });

        if (!user || user.subscriptionPlan === 'FREE') {
            return res.status(403).json({
                success: false,
                error: 'Signal generation requires PRO subscription',
                message: 'Trading signal generation requires a PRO subscription',
                feature: 'SIGNAL_GENERATION',
                upgradeUrl: '/pricing',
            });
        }

        if (user.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                feature: 'SIGNAL_GENERATION',
            });
        }

        next();
    } catch (error) {
        console.error('[Signals Middleware] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify signal access',
        });
    }
}

/**
 * Require Strategy Creation access
 * Only PRO and CUSTOM users can create and backtest strategies
 */
export async function requireStrategies(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return unauthorizedResponse(res, 'Authentication required');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                subscriptionPlan: true,
                subscriptionStatus: true,
            },
        });

        if (!user || user.subscriptionPlan === 'FREE') {
            return res.status(403).json({
                success: false,
                error: 'Strategy features require PRO subscription',
                message: 'Strategy creation and backtesting require a PRO subscription',
                feature: 'STRATEGY_CREATION',
                upgradeUrl: '/pricing',
            });
        }

        if (user.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required',
                feature: 'STRATEGY_CREATION',
            });
        }

        next();
    } catch (error) {
        console.error('[Strategies Middleware] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify strategy access',
        });
    }
}

/**
 * Helper: Get user subscription info (for internal use)
 */
export async function getUserSubscription(userId: string) {
    return await prisma.user.findUnique({
        where: { id: userId },
        select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
        },
    });
}
