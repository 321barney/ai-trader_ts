/**
 * Notifications API Routes
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { notificationService } from '../services/notification.service.js';
import { prisma } from '../utils/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

const db = prisma as any;
const router = Router();

/**
 * GET /api/notifications - Get unread notifications
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const notifications = await db.notification.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            take: 30
        });
        const unreadCount = await db.notification.count({
            where: { userId: req.userId, read: false }
        });
        return successResponse(res, { notifications, unreadCount });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/notifications/:id/read - Mark as read
 */
router.post('/:id/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        await db.notification.update({
            where: { id: req.params.id },
            data: { read: true }
        });
        return successResponse(res, { message: 'Marked as read' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

/**
 * POST /api/notifications/read-all - Mark all as read
 */
router.post('/read-all', authMiddleware, async (req: Request, res: Response) => {
    try {
        await db.notification.updateMany({
            where: { userId: req.userId, read: false },
            data: { read: true }
        });
        return successResponse(res, { message: 'All marked as read' });
    } catch (error: any) {
        return errorResponse(res, error.message, 500);
    }
});

export const notificationsRouter = router;
