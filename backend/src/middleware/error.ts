/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

/**
 * Global error handler
 */
export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('[Error]', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
    });
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create operational error
 */
export function createError(message: string, statusCode = 400): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
