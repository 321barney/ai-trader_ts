/**
 * Authentication Service
 */

import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';


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
    token: string;
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

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return { user, token };
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

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                onboardingCompleted: user.onboardingCompleted,
            },
            token,
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
                selectedPairs: true,
                createdAt: true,
                lastLogin: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    /**
     * Refresh token
     */
    async refreshToken(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
    }
}

export const authService = new AuthService();
