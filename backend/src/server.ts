import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/index.js';
import { healthRouter } from './routes/health.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestLogger, errorLogger } from './middleware/logging.js';
import { redisService } from './services/redis.service.js';
import { jobQueueService } from './services/queue.service.js';
import { sentryService } from './services/sentry.service.js';

// Load environment variables (loaded via import 'dotenv/config')

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (required for Railway/load balancers)
app.set('trust proxy', 1);

// Initialize Sentry (first middleware)
sentryService.initialize(app);
if (sentryService.isAvailable()) {
    app.use(sentryService.requestHandler());
    app.use(sentryService.tracingHandler());
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding
}));

// Request logging
app.use(requestLogger);

// Rate limiting for auth routes (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window per IP
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://www.cotrader.ai',
            'https://cotrader.ai',
            'https://www.cotrader.cc',
            'https://cotrader.cc',
            /\.railway\.app$/
        ]
        : ['http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Limit payload size

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Health check routes (no rate limit)
app.use('/health', healthRouter);

// API Routes
console.log('[Server] Mounting API routes at /api');
app.use('/api', apiRouter);

// Error logging (before error handler)
app.use(errorLogger);
if (sentryService.isAvailable()) {
    app.use(sentryService.errorHandler());
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);


// Debug: Print all registered routes
function printRoutes(app: express.Application) {
    console.log('📋 Registered Routes:');
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) { // routes registered directly on the app
            console.log(`TE  ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') { // router middleware 
            middleware.handle.stack.forEach((handler: any) => {
                const route = handler.route;
                if (route) {
                    // This creates a rough approximation of the path
                    console.log(`TE  ${Object.keys(route.methods).join(', ').toUpperCase()} /api${route.path}`);
                }
            });
        }
    });
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 AI Trader Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    printRoutes(app);

    // Verify database connection before starting background services
    const { verifyDatabaseConnection } = await import('./utils/prisma.js');
    const dbReady = await verifyDatabaseConnection();

    if (!dbReady) {
        console.error('❌ Database connection failed - background services will not start');
        console.error('💡 Check your DATABASE_URL in .env file');
        return; // Don't start schedulers if DB is not ready
    }

    console.log('✅ Database connected - starting background services...');



    // Resume interrupted backtests (only after DB is ready)
    import('./services/backtest.service.js').then(({ backtestService }) => {
        backtestService.resumeInterruptedBacktests();
    }).catch(err => {
        console.error('[Backtest] Failed to resume:', err.message);
    });

    // Start Cost-Efficient Scheduler (4h market analysis, monthly model refresh)
    import('./services/scheduler.service.js').then(({ schedulerService }) => {
        schedulerService.start();
        console.log('📅 Cost-efficient scheduler started');
    }).catch(err => {
        console.error('[SchedulerService] Failed to start:', err.message);
    });
});

export default app;
