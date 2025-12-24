/**
 * Sentry Error Tracking Service
 * 
 * Captures and reports errors to Sentry for production monitoring.
 * 
 * Environment Variables:
 * - SENTRY_DSN: Your Sentry project DSN
 * - SENTRY_ENVIRONMENT: Environment name (production, staging, development)
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';

class SentryService {
    private isInitialized = false;

    /**
     * Initialize Sentry
     */
    initialize(app?: Express): boolean {
        const dsn = process.env.SENTRY_DSN;

        if (!dsn) {
            console.log('[Sentry] No SENTRY_DSN configured, error tracking disabled');
            return false;
        }

        try {
            Sentry.init({
                dsn,
                environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
                tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                integrations: [
                    // Enable HTTP calls tracing
                    ...(app ? [Sentry.expressIntegration()] : []),
                ],
                // Filter out sensitive data
                beforeSend(event) {
                    // Remove sensitive headers
                    if (event.request?.headers) {
                        delete event.request.headers['authorization'];
                        delete event.request.headers['cookie'];
                    }
                    return event;
                },
            });

            this.isInitialized = true;
            console.log('[Sentry] Initialized successfully');
            return true;
        } catch (error: any) {
            console.error('[Sentry] Failed to initialize:', error.message);
            return false;
        }
    }

    /**
     * Get request handler middleware (use at app start)
     */
    requestHandler() {
        return Sentry.Handlers.requestHandler();
    }

    /**
     * Get tracing handler middleware
     */
    tracingHandler() {
        return Sentry.Handlers.tracingHandler();
    }

    /**
     * Get error handler middleware (use before other error handlers)
     */
    errorHandler() {
        return Sentry.Handlers.errorHandler({
            shouldHandleError(error: any) {
                // Capture 4xx and 5xx errors
                if (error.status >= 400) {
                    return true;
                }
                return true;
            },
        });
    }

    /**
     * Capture an exception manually
     */
    captureException(error: Error, context?: Record<string, any>): string | undefined {
        if (!this.isInitialized) {
            console.error('[Sentry] Not initialized, error not captured:', error.message);
            return undefined;
        }

        return Sentry.captureException(error, {
            extra: context,
        });
    }

    /**
     * Capture a message
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string | undefined {
        if (!this.isInitialized) return undefined;
        return Sentry.captureMessage(message, level);
    }

    /**
     * Set user context for error tracking
     */
    setUser(user: { id: string; email?: string; username?: string } | null): void {
        if (!this.isInitialized) return;
        Sentry.setUser(user);
    }

    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(breadcrumb: {
        category?: string;
        message: string;
        level?: 'debug' | 'info' | 'warning' | 'error';
        data?: Record<string, any>;
    }): void {
        if (!this.isInitialized) return;
        Sentry.addBreadcrumb(breadcrumb);
    }

    /**
     * Start a transaction for performance monitoring
     */
    startTransaction(name: string, op: string): any {
        if (!this.isInitialized) return null;
        return Sentry.startInactiveSpan({ name, op });
    }

    /**
     * Check if Sentry is available
     */
    isAvailable(): boolean {
        return this.isInitialized;
    }

    /**
     * Flush pending events before shutdown
     */
    async flush(timeout = 2000): Promise<boolean> {
        if (!this.isInitialized) return true;
        return Sentry.flush(timeout);
    }
}

export const sentryService = new SentryService();
export default sentryService;
