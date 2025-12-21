import { Router } from 'express';
import authRoutes from './auth.js';
import onboardingRoutes from './onboarding.js';
import tradingRoutes from './trading.js';
import agentRoutes from './agents.js';
import featureRoutes from './features.js';

const router = Router();

// ... existing routes
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/trading', tradingRoutes);
router.use('/agents', agentRoutes);
router.use('/features', featureRoutes);

export default router;
