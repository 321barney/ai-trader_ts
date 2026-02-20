/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { unauthorizedResponse } from '../utils/response.js';
import { sessionService } from '../services/session.service.js';

// Rate-limited logging: track last log time per token prefix
const authLogCache = new Map<string, number>();
const AUTH_LOG_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function shouldLogAuth(tokenPrefix: string): boolean {
    const now = Date.now();
    const lastLog = authLogCache.get(tokenPrefix);
    if (!lastLog || now - lastLog > AUTH_LOG_INTERVAL_MS) {
        authLogCache.set(tokenPrefix, now);
        // Clean old entries periodically (keep map small)
        if (authLogCache.size > 100) {
            const cutoff = now - AUTH_LOG_INTERVAL_MS;
            for (const [key, time] of authLogCache.entries()) {
                if (time < cutoff) authLogCache.delete(key);
            }
        }
        return true;
    }
    return false;
}

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
        // 1. Check for API Key (X-API-KEY or Authorization: Api-Key <key>)
        const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-api-token'];
        if (apiKeyHeader && typeof apiKeyHeader === 'string') {
            return await verifyApiKey(req, res, next, apiKeyHeader);
        }

        // 2. Check for Bearer Token (JWT)
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Api-Key ')) {
            return await verifyApiKey(req, res, next, authHeader.split(' ')[1]);
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // console.warn('[Auth Middleware] No token in header');
            return unauthorizedResponse(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        const tokenPrefix = token.substring(0, 20);

        // Rate-limited logging (once per 10 min per token)
        if (shouldLogAuth(tokenPrefix)) {
            console.log('[Auth Middleware] Verifying token:', tokenPrefix + '...');
        }

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

        // Validate session exists in database
        const session = await sessionService.validateSession(token);
        if (!session) {
            return unauthorizedResponse(res, 'Session expired. Please login again.');
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

// Helper to verify API Key
import bcrypt from 'bcrypt';

async function verifyApiKey(req: Request, res: Response, next: NextFunction, apiKey: string) {
    try {
        // Key format: pk_randomString
        const keyPrefix = apiKey.substring(0, 8); // "pk_xxxxx"

        // Find potential key match by prefix (optimization)
        const storedKeys = await prisma.apiKey.findMany({
            where: { keyPrefix },
            include: { user: true }
        });

        for (const storedKey of storedKeys) {
            const isValid = await bcrypt.compare(apiKey, storedKey.keyHash);
            if (isValid) {
                // Update usage
                await prisma.apiKey.update({
                    where: { id: storedKey.id },
                    data: { lastUsedAt: new Date() }
                });

                // Attach user
                req.user = {
                    userId: storedKey.userId,
                    email: storedKey.user.email,
                    role: storedKey.user.role,
                    id: storedKey.userId
                };
                req.userId = storedKey.userId;
                return next();
            }
        }

        return unauthorizedResponse(res, 'Invalid API Key');
    } catch (error) {
        console.error('API Key Verify Error:', error);
        return unauthorizedResponse(res, 'API Key Validation Failed');
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


