import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
        ? ['https://aitrader.app', 'https://aster.ai', /\.railway\.app$/]
        : ['http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Limit payload size

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Health check (no rate limit)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// API Routes
console.log('[Server] Mounting API routes at /api');
app.use('/api', apiRouter);

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
app.listen(PORT, () => {
    console.log(`🚀 AI Trader Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    printRoutes(app);

    // Start Scheduler
    import('./scheduler.js').then(({ scheduler }) => {
        scheduler.startTradingLoop();
        scheduler.startSignalMonitoring();
    });

    // Resume interrupted backtests
    import('./services/backtest.service.js').then(({ backtestService }) => {
        backtestService.resumeInterruptedBacktests();
    });

    // Start Cost-Efficient Scheduler (4h market analysis, monthly model refresh)
    import('./services/scheduler.service.js').then(({ schedulerService }) => {
        schedulerService.start();
        console.log('📅 Cost-efficient scheduler started');
    });
});

export default app;
