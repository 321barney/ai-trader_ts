/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateSchema, registerSchema, loginSchema } from '../utils/validation.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * POST /api/auth/register
 */
console.log('[AuthRoutes] Registering POST /register endpoint');
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const validation = validateSchema(registerSchema, req.body);

    if (!validation.success) {
        return errorResponse(res, validation.error);
    }

    try {
        const result = await authService.register(validation.data);
        return successResponse(res, result, 'Registration successful', 201);
    } catch (error: any) {
        return errorResponse(res, error.message);
    }
}));

/**
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const validation = validateSchema(loginSchema, req.body);

    if (!validation.success) {
        return errorResponse(res, validation.error);
    }

    try {
        const result = await authService.login(validation.data);
        return successResponse(res, result, 'Login successful');
    } catch (error: any) {
        return errorResponse(res, error.message, 401);
    }
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        // Get token from authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (token) {
            await authService.logout(token);
        }

        return successResponse(res, null, 'Logged out successfully');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
}));

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await authService.logoutAll(req.userId!);
        return successResponse(res, result, 'Logged out from all devices');
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
}));

/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 */
router.get('/sessions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const sessions = await authService.getUserSessions(req.userId!);
        return successResponse(res, sessions);
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
}));

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return errorResponse(res, 'Refresh token required', 400);
        }

        const result = await authService.refreshToken(refreshToken);
        return successResponse(res, result, 'Token refreshed');
    } catch (error: any) {
        return errorResponse(res, error.message, 401);
    }
}));

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const user = await authService.getCurrentUser(req.userId!);
        return successResponse(res, user);
    } catch (error: any) {
        return errorResponse(res, error.message, 404);
    }
}));

export const authRouter = router;


