/**
 * Response Utilities
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export function successResponse<T>(res: Response, data: T, message?: string, status = 200) {
    return res.status(status).json({
        success: true,
        data,
        message,
    } as ApiResponse<T>);
}

export function errorResponse(res: Response, error: string, status = 400) {
    return res.status(status).json({
        success: false,
        error,
    } as ApiResponse);
}

export function notFoundResponse(res: Response, message = 'Resource not found') {
    return errorResponse(res, message, 404);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized') {
    return errorResponse(res, message, 401);
}

export function forbiddenResponse(res: Response, message = 'Forbidden') {
    return errorResponse(res, message, 403);
}

export function serverErrorResponse(res: Response, message = 'Internal server error') {
    return errorResponse(res, message, 500);
}
