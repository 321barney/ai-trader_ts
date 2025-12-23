/**
 * JWT Utility Functions
 */

import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';


export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export function generateToken(payload: JwtPayload): string {
    return generateAccessToken(payload);
}

export function generateAccessToken(payload: JwtPayload): string {
    const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
    return jwt.sign(payload as object, JWT_SECRET, options);
}

export function generateRefreshToken(payload: JwtPayload): string {
    const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
    return jwt.sign(payload as object, JWT_REFRESH_SECRET, options);
}

export function verifyToken(token: string): JwtPayload | null {
    return verifyAccessToken(token);
}

export function verifyAccessToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    } catch (error) {
        return null;
    }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET) as unknown as JwtPayload;
    } catch (error) {
        return null;
    }
}

export function decodeToken(token: string): JwtPayload | null {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch (error) {
        return null;
    }
}
