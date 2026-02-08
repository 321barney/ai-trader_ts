import { Router } from 'express';
import { analysisTrigger } from '../services/analysis-trigger.service.js';
import { schedulerService } from '../services/scheduler.service.js';
import { rlService } from '../services/rl.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const router = Router();

/**
 * @route GET /api/analysis/trigger-status/:symbol
 * @desc Check if analysis would run for a symbol (without running it)
 * @access Private
 */
router.get('/trigger-status/:symbol', authenticate, async (req, res) => {
    try {
        const { symbol } = req.params;
        const userId = (req as any).user.id;

        const result = await analysisTrigger.shouldRunAnalysis(userId, symbol);

        res.json({
            symbol,
            ...result,
            timestamp: new Date()
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error checking trigger status', error: error.message });
    }
});

/**
 * @route POST /api/analysis/trigger/:symbol
 * @desc Manually trigger analysis (bypassing smart triggers)
 * @access Private (Premium)
 */
router.post('/trigger/:symbol', authenticate, requireSubscription, async (req, res) => {
    try {
        const { symbol } = req.params;
        const userId = (req as any).user.id;

        // Force run manual analysis
        const decision = await schedulerService.runManualAnalysis(userId, symbol);

        res.json({
            message: 'Analysis triggered successfully',
            decision
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error triggering analysis', error: error.message });
    }
});

/**
 * @route GET /api/analysis/rl/status
 * @desc Get RL training status
 * @access Private
 */
router.get('/rl/status', authenticate, async (req, res) => {
    try {
        const status = await rlService.getTrainingStatus();
        const metrics = await rlService.getMetrics();
        const modelStatus = await rlService.checkModelAvailability();

        res.json({
            training: status || { status: 'idle', progress: 0 },
            metrics: metrics || { winRate: 0, sharpeRatio: 0 },
            model: modelStatus
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching RL status', error: error.message });
    }
});

/**
 * @route POST /api/analysis/rl/train
 * @desc Manually trigger RL training (Admin/Dev only)
 * @access Private
 */
router.post('/rl/train', authenticate, async (req, res) => {
    try {
        const { symbol, timesteps } = req.body;

        // In real app, check for admin role

        const result = await rlService.startTraining({
            symbols: [symbol || 'BTCUSDT'],
            timesteps: timesteps || 50000
        });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Error starting RL training', error: error.message });
    }
});

export default router;
