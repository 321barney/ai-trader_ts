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
    // In a more complex setup, we'd invalidate the token in a blacklist
    return successResponse(res, null, 'Logged out successfully');
}));

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    try {
        const token = await authService.refreshToken(req.userId!);
        return successResponse(res, { token }, 'Token refreshed');
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

export default router;
