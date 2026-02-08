/**
 * Session Management Service
 * Handles database-backed session tracking for multi-device logout support
 */

import { prisma } from '../utils/prisma.js';
import crypto from 'crypto';

export interface SessionData {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

export class SessionService {
    /**
     * Create a new session for a user
     * @param userId - User ID
     * @param token - JWT token
     * @param expiresInHours - Session expiration time in hours (default: 24h)
     */
    async createSession(userId: string, token: string, expiresInHours: number = 24): Promise<SessionData> {
        // Calculate expiration time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiresInHours);

        // Create session in database
        const session = await prisma.userSession.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });

        return session;
    }

    /**
     * Validate if a session exists and is not expired
     * @param token - JWT token
     * @returns Session data if valid, null otherwise
     */
    async validateSession(token: string): Promise<SessionData | null> {
        const session = await prisma.userSession.findUnique({
            where: { token },
        });

        if (!session) {
            return null;
        }

        // Check if session is expired
        if (session.expiresAt < new Date()) {
            // Delete expired session
            await this.deleteSession(token);
            return null;
        }

        return session;
    }

    /**
     * Delete a single session (logout from current device)
     * @param token - JWT token
     */
    async deleteSession(token: string): Promise<void> {
        await prisma.userSession.delete({
            where: { token },
        }).catch(() => {
            // Ignore errors if session doesn't exist
        });
    }

    /**
     * Delete all sessions for a user (logout from all devices)
     * @param userId - User ID
     * @returns Number of sessions deleted
     */
    async deleteAllUserSessions(userId: string): Promise<number> {
        const result = await prisma.userSession.deleteMany({
            where: { userId },
        });

        return result.count;
    }

    /**
     * Get all active sessions for a user
     * @param userId - User ID
     * @returns List of active sessions
     */
    async getUserSessions(userId: string): Promise<SessionData[]> {
        const sessions = await prisma.userSession.findMany({
            where: {
                userId,
                expiresAt: {
                    gte: new Date(), // Only non-expired sessions
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return sessions;
    }

    /**
     * Clean up expired sessions (should be run periodically)
     * @returns Number of sessions deleted
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await prisma.userSession.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });

        console.log(`[SessionService] Cleaned up ${result.count} expired sessions`);
        return result.count;
    }

    /**
     * Extend session expiration (e.g., on activity)
     * @param token - JWT token
     * @param extendByHours - Hours to extend (default: 24h)
     */
    async extendSession(token: string, extendByHours: number = 24): Promise<void> {
        const newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + extendByHours);

        await prisma.userSession.update({
            where: { token },
            data: { expiresAt: newExpiresAt },
        }).catch(() => {
            // Ignore errors if session doesn't exist
        });
    }
}

export const sessionService = new SessionService();
