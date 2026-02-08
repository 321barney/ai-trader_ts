/**
 * Authentication Service
 */

import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sessionService } from './session.service.js';


export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface AuthResult {
    user: {
        id: string;
        username: string;
        email: string;
        role: string;
        onboardingCompleted: boolean;
    };
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    /**
     * Register a new user
     */
    async register(input: RegisterInput): Promise<AuthResult> {
        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: input.email },
                    { username: input.username },
                ],
            },
        });

        if (existingUser) {
            throw new Error(
                existingUser.email === input.email
                    ? 'Email already registered'
                    : 'Username already taken'
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                username: input.username,
                email: input.email,
                password: hashedPassword,
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                onboardingCompleted: true,
            },
        });

        // Generate tokens
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        return { user, accessToken, refreshToken };
    }

    /**
     * Login user
     */
    async login(input: LoginInput): Promise<AuthResult> {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check password
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Check status
        if (user.status !== 'ACTIVE') {
            throw new Error('Account is not active');
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        // Generate tokens
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Create session in database
        await sessionService.createSession(user.id, accessToken, 24); // 24 hours

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                onboardingCompleted: user.onboardingCompleted,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Get current user
     */
    async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                onboardingCompleted: true,
                onboardingStep: true,
                tradingEnabled: true,
                tradingMode: true,
                strategyMode: true,
                methodology: true,
                leverage: true,
                selectedPairs: true,
                // API keys (returned as boolean check for security)
                asterApiKey: true,
                asterApiSecret: true,
                asterTestnet: true,
                deepseekApiKey: true,
                openaiApiKey: true,
                anthropicApiKey: true,
                geminiApiKey: true,
                marketAnalystModel: true,
                riskOfficerModel: true,
                strategyConsultantModel: true,
                createdAt: true,
                lastLogin: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // For security, don't expose full keys - just indicate if they're set
        return {
            ...user,
            asterApiKey: user.asterApiKey ? '••••••••' : null,
            asterApiSecret: user.asterApiSecret ? '••••••••' : null,
            deepseekApiKey: user.deepseekApiKey ? '••••••••' : null,
            openaiApiKey: user.openaiApiKey ? '••••••••' : null,
            anthropicApiKey: user.anthropicApiKey ? '••••••••' : null,
            geminiApiKey: user.geminiApiKey ? '••••••••' : null,
        };
    }

    /**
     * Refresh token
     */
    async refreshToken(token: string): Promise<{ accessToken: string, refreshToken: string }> {
        // Verify refresh token
        const payload = verifyRefreshToken(token);
        if (!payload) {
            throw new Error('Invalid refresh token');
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const newPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            accessToken: generateAccessToken(newPayload),
            refreshToken: generateRefreshToken(newPayload) // Rotate refresh token
        };
    }

    /**
     * Logout user (invalidate single session)
     */
    async logout(token: string): Promise<void> {
        await sessionService.deleteSession(token);
    }

    /**
     * Logout from all devices (invalidate all user sessions)
     */
    async logoutAll(userId: string): Promise<{ sessionsDeleted: number }> {
        const count = await sessionService.deleteAllUserSessions(userId);
        return { sessionsDeleted: count };
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId: string) {
        return await sessionService.getUserSessions(userId);
    }
}

export const authService = new AuthService();
