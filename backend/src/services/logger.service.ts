/**
 * Winston Logger Service
 * 
 * Structured logging for production with:
 * - JSON format for production (easy to parse)
 * - Pretty format for development
 * - Log levels: error, warn, info, http, debug
 * - Request ID tracking
 * - File rotation for production
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Determine log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Custom format for development (pretty print)
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info: any) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports
const transports: winston.transport[] = [
    // Console output
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logDir = process.env.LOG_DIR || 'logs';

    // Error log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: prodFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );

    // Combined log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: prodFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        })
    );
}

// Create the logger
const winstonLogger = winston.createLogger({
    level: level(),
    levels,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Logger wrapper with additional functionality
class Logger {
    private requestId: string | null = null;

    /**
     * Set request ID for tracing
     */
    setRequestId(id: string) {
        this.requestId = id;
    }

    /**
     * Clear request ID
     */
    clearRequestId() {
        this.requestId = null;
    }

    /**
     * Add common metadata to log entries
     */
    private addMeta(meta: any = {}) {
        if (this.requestId) {
            meta.requestId = this.requestId;
        }
        return meta;
    }

    error(message: string, meta?: any) {
        winstonLogger.error(message, this.addMeta(meta));
    }

    warn(message: string, meta?: any) {
        winstonLogger.warn(message, this.addMeta(meta));
    }

    info(message: string, meta?: any) {
        winstonLogger.info(message, this.addMeta(meta));
    }

    http(message: string, meta?: any) {
        winstonLogger.http(message, this.addMeta(meta));
    }

    debug(message: string, meta?: any) {
        winstonLogger.debug(message, this.addMeta(meta));
    }

    /**
     * Log an error with stack trace
     */
    exception(error: Error, context?: string) {
        this.error(context || error.message, {
            error: error.message,
            stack: error.stack,
            name: error.name,
        });
    }

    /**
     * Create a child logger with additional context
     */
    child(context: Record<string, any>): Logger {
        const childLogger = new Logger();
        childLogger.requestId = this.requestId;
        // Note: In a full implementation, you'd pass context to winston
        return childLogger;
    }
}

export const logger = new Logger();
export default logger;

// Also export the raw winston logger for advanced usage
export { winstonLogger };
