/**
 * Trading Model Service
 * 
 * Manages the lifecycle of trading models:
 * - Creation from Strategy Consultant analysis
 * - Backtesting and validation
 * - Counsel approval workflow
 * - Activation and deactivation
 * - Drawdown monitoring and retraining triggers
 */

import { prisma } from '../utils/prisma.js';
// Note: TradingModelStatus will be available after running `prisma migrate deploy`
// Cast prisma to any to allow pre-migration compilation
const db = prisma as any;

export interface ModelParameters {
    entryRules: {
        indicators: string[];
        conditions: any[];
    };
    exitRules: {
        stopLossPercent: number;
        takeProfitPercent: number;
        trailingStop?: boolean;
    };
    timeframes: string[];
    methodology: string;
    riskPerTrade: number;
}

export interface MultiTFData {
    tf5m: { bars: number; data: any[] };
    tf15m: { bars: number; data: any[] };
    tf1h: { bars: number; data: any[] };
    tf4h: { bars: number; data: any[] };
}

// Minimum bars required per timeframe
const MIN_BARS = {
    '5m': 10,
    '15m': 5,
    '1h': 4,
    '4h': 12  // 2 days of data
};

export class ModelService {
    /**
     * Create a new draft trading model
     */
    async createModel(
        userId: string,
        methodology: string,
        parameters: ModelParameters,
        timeframes: string[] = ['5m', '15m', '1h', '4h']
    ) {
        // Get next version number
        const lastModel = await db.tradingModel.findFirst({
            where: { userId },
            orderBy: { version: 'desc' }
        });
        const version = (lastModel?.version || 0) + 1;

        return await db.tradingModel.create({
            data: {
                userId,
                version,
                methodology,
                timeframes,
                parameters: parameters as any, // Cast for Prisma JSON compatibility
                status: 'DRAFT',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // + 1 month
            }
        });
    }

    /**
     * Get active model for user
     */
    async getActiveModel(userId: string) {
        return await db.tradingModel.findFirst({
            where: {
                userId,
                isActive: true,
                status: 'ACTIVE'
            }
        });
    }

    /**
     * Update model backtest results
     */
    async updateBacktestResults(
        modelId: string,
        results: {
            sharpeRatio: number;
            winRate: number;
            maxDrawdown: number;
            totalReturn: number;
            backtestData: any;
        }
    ) {
        return await db.tradingModel.update({
            where: { id: modelId },
            data: {
                backtestResults: results.backtestData,
                sharpeRatio: results.sharpeRatio,
                winRate: results.winRate,
                maxDrawdown: results.maxDrawdown,
                totalReturn: results.totalReturn,
                status: 'PENDING_APPROVAL'
            }
        });
    }

    /**
     * Add counsel approval to model
     */
    async addApproval(modelId: string, agentType: string) {
        const model = await db.tradingModel.findUnique({
            where: { id: modelId }
        });

        if (!model) throw new Error('Model not found');

        const approvedBy = [...(model.approvedBy || [])];
        if (!approvedBy.includes(agentType)) {
            approvedBy.push(agentType);
        }

        // Check if all 3 agents have approved
        const allApproved = ['STRATEGY_CONSULTANT', 'RISK_OFFICER', 'MARKET_ANALYST']
            .every(agent => approvedBy.includes(agent));

        return await db.tradingModel.update({
            where: { id: modelId },
            data: {
                approvedBy,
                status: allApproved ? 'APPROVED' : 'PENDING_APPROVAL'
            }
        });
    }

    /**
     * Activate a model (deactivates any currently active model)
     */
    async activateModel(userId: string, modelId: string) {
        // Deactivate current active model
        await db.tradingModel.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false, status: 'RETIRED', retiredAt: new Date() }
        });

        // Activate new model
        return await db.tradingModel.update({
            where: { id: modelId },
            data: {
                isActive: true,
                status: 'ACTIVE',
                activatedAt: new Date()
            }
        });
    }

    /**
     * Update drawdown and check for retrain trigger
     */
    async updateDrawdown(modelId: string, currentDrawdown: number): Promise<boolean> {
        const DRAWDOWN_THRESHOLD = 15; // 15%

        const model = await db.tradingModel.update({
            where: { id: modelId },
            data: { currentDrawdown }
        });

        if (currentDrawdown >= DRAWDOWN_THRESHOLD) {
            console.log(`[ModelService] Drawdown ${currentDrawdown}% >= ${DRAWDOWN_THRESHOLD}%. Triggering retrain.`);

            await db.tradingModel.update({
                where: { id: modelId },
                data: { status: 'RETRAINING', isActive: false }
            });

            return true; // Retrain triggered
        }

        return false;
    }

    /**
     * Check if model is expired or needs refresh
     */
    async checkModelExpiry(userId: string): Promise<boolean> {
        const activeModel = await this.getActiveModel(userId);

        if (!activeModel) return true; // No active model
        if (!activeModel.expiresAt) return false;

        return new Date() > activeModel.expiresAt;
    }

    /**
     * Get cached market analysis if still valid (< 4 hours old)
     */
    async getCachedMarketAnalysis(userId: string) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                lastMarketAnalysisAt: true,
                lastMarketAnalysis: true
            }
        });

        if (!user?.lastMarketAnalysisAt) return null;

        const hoursSinceLastAnalysis =
            (Date.now() - user.lastMarketAnalysisAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastAnalysis < 4) {
            return user.lastMarketAnalysis;
        }

        return null; // Cache expired
    }

    /**
     * Cache market analysis result
     */
    async cacheMarketAnalysis(userId: string, analysis: any) {
        await db.user.update({
            where: { id: userId },
            data: {
                lastMarketAnalysisAt: new Date(),
                lastMarketAnalysis: analysis
            }
        });
    }

    /**
     * Validate multi-TF data has minimum required bars
     */
    validateMultiTFData(data: MultiTFData): { valid: boolean; missing: string[] } {
        const missing: string[] = [];

        if (data.tf5m.bars < MIN_BARS['5m']) missing.push(`5m needs ${MIN_BARS['5m']} bars`);
        if (data.tf15m.bars < MIN_BARS['15m']) missing.push(`15m needs ${MIN_BARS['15m']} bars`);
        if (data.tf1h.bars < MIN_BARS['1h']) missing.push(`1h needs ${MIN_BARS['1h']} bars`);
        if (data.tf4h.bars < MIN_BARS['4h']) missing.push(`4h needs ${MIN_BARS['4h']} bars`);

        return { valid: missing.length === 0, missing };
    }
}

export const modelService = new ModelService();
