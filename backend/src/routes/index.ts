import { Router } from 'express';
import { authRouter } from './auth.js';
import { onboardingRouter } from './onboarding.js';
import { tradingRouter } from './trading.js';
import { agentRouter } from './agents.js';
import { featureRouter } from './features.js';

const router = Router();

// ... existing routes
console.log('[ApiRouter] Mounting /auth routes');
router.use('/auth', authRouter);
router.use('/onboarding', onboardingRouter);
router.use('/trading', tradingRouter);
router.use('/agents', agentRouter);
router.use('/features', featureRouter);

export default router;
