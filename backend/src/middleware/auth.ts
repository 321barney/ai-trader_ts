/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { unauthorizedResponse } from '../utils/response.js';


// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & { id: string };
            userId?: string;
        }
    }
}

/**
 * Verify JWT token and attach user to request
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('[Auth Middleware] No token in header');
            return unauthorizedResponse(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        console.log('[Auth Middleware] Verifying token:', token.substring(0, 20) + '...');

        // Verify token
        const payload = verifyToken(token);
        if (!payload) {
            console.error('[Auth Middleware] Token verification failed for:', token.substring(0, 20) + '...');
            return unauthorizedResponse(res, 'Invalid or expired token');
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, status: true },
        });

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        if (user.status !== 'ACTIVE') {
            return unauthorizedResponse(res, 'Account is not active');
        }

        // Attach user to request
        req.user = { ...payload, id: user.id };
        req.userId = user.id;

        next();
    } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        return unauthorizedResponse(res, 'Authentication failed');
    }
}

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);

        if (payload) {
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, email: true, role: true },
            });

            if (user) {
                req.user = { ...payload, id: user.id };
                req.userId = user.id;
            }
        }

        next();
    } catch (error) {
        next();
    }
}

/**
 * Require admin role
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return unauthorizedResponse(res, 'Admin access required');
    }
    next();
}

/**
 * Require completed onboarding
 */
export async function onboardingCompleteMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return unauthorizedResponse(res);
    }

    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { onboardingCompleted: true },
    });

    if (!user?.onboardingCompleted) {
        return res.status(403).json({
            success: false,
            error: 'Please complete onboarding first',
            redirectTo: '/onboarding',
        });
    }

    next();
}
