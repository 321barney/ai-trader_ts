/**
 * Request Logging Middleware
 * 
 * Logs all HTTP requests with timing and response status.
 * Uses Winston logger for structured output.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simple request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    // Generate request ID
    const requestId = uuidv4().slice(0, 8);
    (req as any).requestId = requestId;

    // Record start time
    const startTime = Date.now();

    // Log request
    const logRequest = () => {
        const duration = Date.now() - startTime;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;

        // Skip health checks from verbose logging
        if (originalUrl.startsWith('/health')) {
            return;
        }

        const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

        // Use console for now, can be upgraded to Winston
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: logLevel,
                requestId,
                method,
                url: originalUrl,
                status: statusCode,
                duration,
                ip,
                userAgent: req.get('user-agent'),
                userId: (req as any).userId || null,
            }));
        } else {
            const color = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
            console.log(`${color}[${requestId}] ${message}\x1b[0m`);
        }
    };

    // Log on response finish
    res.on('finish', logRequest);

    next();
}

/**
 * Error logging middleware
 * Place after all routes but before error handlers
 */
export function errorLogger(err: any, req: Request, res: Response, next: NextFunction) {
    const requestId = (req as any).requestId || 'unknown';

    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        requestId,
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        userId: (req as any).userId || null,
    }));

    next(err);
}
