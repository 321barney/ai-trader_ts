/**
 * Trading Service
 */

import { prisma } from '../utils/prisma.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { rlService } from './rl.service.js';

export class TradingService {
    private orchestrator: AgentOrchestrator;

    constructor() {
        this.orchestrator = new AgentOrchestrator();
    }

    /**
     * Get user's trading status
     */
    async getStatus(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                tradingEnabled: true,
                tradingMode: true,
                strategyMode: true,
                methodology: true,
                selectedPairs: true,
                onboardingCompleted: true,
                asterApiKey: true,
                deepseekApiKey: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const warnings: string[] = [];
        if (!user.asterApiKey) warnings.push('Exchange API not configured');
        if (!user.deepseekApiKey) warnings.push('DeepSeek API not configured');

        return {
            ...user,
            asterApiKey: undefined,
            deepseekApiKey: undefined,
            hasAsterApiKey: !!user.asterApiKey,
            hasDeepseekApiKey: !!user.deepseekApiKey,
            warnings,
        };
    }

    /**
     * Enable trading
     */
    async enableTrading(userId: string, disclaimerAccepted: boolean) {
        if (!disclaimerAccepted) {
            throw new Error('You must accept the risk disclaimer');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                tradingEnabled: true,
                disclaimerAccepted: true,
                disclaimerAcceptedAt: new Date(),
            },
        });

        return { tradingEnabled: user.tradingEnabled };
    }

    /**
     * Disable trading
     */
    async disableTrading(userId: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { tradingEnabled: false },
        });

        return { tradingEnabled: user.tradingEnabled };
    }

    /**
     * Update trading settings
     */
    async updateSettings(userId: string, settings: {
        tradingMode?: 'signal' | 'trade';
        strategyMode?: 'deepseek' | 'rl' | 'hybrid';
        tradingEnabled?: boolean;
        methodology?: string;
        leverage?: number;
        selectedPairs?: string[];
        asterApiKey?: string;
        asterApiSecret?: string;
        deepseekApiKey?: string;
    }) {
        // Build update data, only include non-undefined values
        const updateData: Record<string, any> = {};

        if (settings.tradingMode !== undefined) updateData.tradingMode = settings.tradingMode;
        if (settings.strategyMode !== undefined) updateData.strategyMode = settings.strategyMode;
        if (settings.tradingEnabled !== undefined) updateData.tradingEnabled = settings.tradingEnabled;
        if (settings.methodology !== undefined) updateData.methodology = settings.methodology;
        if (settings.leverage !== undefined) updateData.leverage = settings.leverage;
        if (settings.selectedPairs !== undefined) updateData.selectedPairs = settings.selectedPairs;
        if (settings.asterApiKey !== undefined) updateData.asterApiKey = settings.asterApiKey;
        if (settings.asterApiSecret !== undefined) updateData.asterApiSecret = settings.asterApiSecret;
        if (settings.deepseekApiKey !== undefined) updateData.deepseekApiKey = settings.deepseekApiKey;

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                tradingMode: true,
                strategyMode: true,
                tradingEnabled: true,
                methodology: true,
                leverage: true,
                selectedPairs: true,
            }
        });

        return user;
    }

    /**
     * Run agent analysis
     */
    async runAnalysis(userId: string, symbol: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { methodology: true, strategyMode: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get mock market data (would be real data in production)
        const marketData = await this.getMarketData(symbol);

        // Get RL metrics
        const rlMetrics = await rlService.getMetrics();

        // Run orchestrator
        const decision = await this.orchestrator.analyzeAndDecide({
            userId,
            symbol,
            marketData,
            riskMetrics: {
                ...rlMetrics,
                portfolioValue: 50000,
                currentExposure: 0,
                openPositions: 0,
            },
        });

        return decision;
    }

    /**
     * Get market data (mock for now)
     */
    private async getMarketData(symbol: string) {
        // In production, this would call exchange API
        return {
            symbol,
            currentPrice: 42500,
            change24h: 2.5,
            high24h: 43200,
            low24h: 41800,
            volume: 1500000000,
            rsi: 52,
            macd: 150,
            atr: 800,
        };
    }

    /**
     * Get recent signals
     */
    async getSignals(userId: string, options?: {
        limit?: number;
        symbol?: string;
    }) {
        const signals = await prisma.signal.findMany({
            where: {
                userId,
                ...(options?.symbol && { symbol: options.symbol }),
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 10,
        });

        return signals;
    }

    /**
     * Get recent trades
     */
    async getTrades(userId: string, options?: {
        limit?: number;
        status?: 'OPEN' | 'CLOSED';
    }) {
        const trades = await prisma.trade.findMany({
            where: {
                userId,
                ...(options?.status && { status: options.status }),
            },
            orderBy: { openedAt: 'desc' },
            take: options?.limit || 20,
        });

        return trades;
    }

    /**
     * Get PnL summary
     */
    async getPnLSummary(userId: string) {
        const trades = await prisma.trade.findMany({
            where: { userId, status: 'CLOSED' },
            select: { pnl: true, closedAt: true },
        });

        const now = new Date();
        const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const pnl1D = trades
            .filter(t => t.closedAt && t.closedAt >= day1)
            .reduce((sum, t) => sum + (t.pnl || 0), 0);

        const pnl7D = trades
            .filter(t => t.closedAt && t.closedAt >= day7)
            .reduce((sum, t) => sum + (t.pnl || 0), 0);

        const pnl30D = trades
            .filter(t => t.closedAt && t.closedAt >= day30)
            .reduce((sum, t) => sum + (t.pnl || 0), 0);

        const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        return { pnl1D, pnl7D, pnl30D, totalPnL, totalTrades: trades.length };
    }
}

export const tradingService = new TradingService();
