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
    // Disabled for open source
    next();
}

/**
 * Require AI Agents access
 * Only PRO and CUSTOM users can use AI agent decisions
 */
export async function requireAgents(req: Request, res: Response, next: NextFunction) {
    // Disabled for open source
    next();
}

/**
 * Require Signal Generation access
 * Only PRO and CUSTOM users can generate trading signals
 */
export async function requireSignals(req: Request, res: Response, next: NextFunction) {
    // Disabled for open source
    next();
}

/**
 * Require Strategy Creation access
 * Only PRO and CUSTOM users can create and backtest strategies
 */
export async function requireStrategies(req: Request, res: Response, next: NextFunction) {
    // Disabled for open source
    next();
}

/**
 * Helper: Get user subscription info (for internal use)
 */
export async function getUserSubscription(userId: string) {
    // Mock response
    return {
        subscriptionPlan: 'PRO',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: null,
    };
}
