import { Router } from 'express';
import { authRouter } from './auth.js';
import { onboardingRouter } from './onboarding.js';
import { tradingRouter } from './trading.js';
import { agentRouter } from './agents.js';
import { featureRouter } from './features.js';
import { strategyRouter } from './strategy.js';
import { backtestRouter } from './backtest.js';
import modelsRouter from './models.js';
import { positionsRouter } from './positions.js';
import { portfolioRouter } from './portfolio.js';
import { analyticsRouter } from './analytics.js';
import apiKeyRouter from './api-keys.js';

import analysisRouter from './analysis.js';

const router = Router();

// ... existing routes
console.log('[ApiRouter] Mounting /auth routes');
router.use('/auth', authRouter);
router.use('/onboarding', onboardingRouter);
router.use('/trading', tradingRouter);
router.use('/agents', agentRouter);
router.use('/features', featureRouter);
router.use('/strategies', strategyRouter);
router.use('/backtest', backtestRouter);
router.use('/models', modelsRouter);
router.use('/positions', positionsRouter);
router.use('/portfolio', portfolioRouter);
router.use('/analytics', analyticsRouter);
router.use('/api-keys', apiKeyRouter);

router.use('/analysis', analysisRouter);

export default router;
