/**
 * Trading Service
 */

import { prisma } from '../utils/prisma.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { rlService } from './rl.service.js';
import { AsterService } from './aster.service.js';

export class TradingService {
    private orchestrator: AgentOrchestrator;
    private asterService: AsterService;

    constructor() {
        this.orchestrator = new AgentOrchestrator();
        this.asterService = new AsterService();
    }

    /**
     * Get available trading symbols
     */
    async getSymbols() {
        return await this.asterService.getPairs();
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
        asterTestnet?: boolean;
        deepseekApiKey?: string;
        marketType?: string;
    }) {
        // Build update data, only include non-undefined values
        const updateData: Record<string, any> = {};

        if (settings.tradingMode !== undefined) updateData.tradingMode = settings.tradingMode;
        if (settings.strategyMode !== undefined) updateData.strategyMode = settings.strategyMode;
        if (settings.tradingEnabled !== undefined) updateData.tradingEnabled = settings.tradingEnabled;
        if (settings.methodology !== undefined) updateData.methodology = settings.methodology;
        if (settings.leverage !== undefined) updateData.leverage = settings.leverage;
        if (settings.selectedPairs !== undefined) updateData.selectedPairs = settings.selectedPairs;
        if (settings.marketType !== undefined) updateData.marketType = settings.marketType;
        if (settings.asterApiKey !== undefined) updateData.asterApiKey = settings.asterApiKey;
        if (settings.asterApiSecret !== undefined) updateData.asterApiSecret = settings.asterApiSecret;
        if (settings.asterTestnet !== undefined) updateData.asterTestnet = settings.asterTestnet;
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
            select: {
                methodology: true,
                strategyMode: true,
                tradingEnabled: true,
                tradingMode: true,
                asterApiKey: true,
                asterApiSecret: true,
                asterTestnet: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get mock market data (would be real data in production)
        const marketData = await this.getMarketData(symbol);

        // Get RL metrics
        const rlMetrics = await rlService.getMetrics();

        // Initialize Aster Service with user keys
        const asterService = new AsterService(user.asterApiKey!, user.asterApiSecret!, user.asterTestnet || true);

        // Fetch Real Account Data
        let portfolioValue = 0;
        let openPositionsCount = 0;
        let currentExposure = 0;

        try {
            if (user.asterApiKey && user.asterApiSecret) {
                const balances = await asterService.getBalance();
                const usdtBalance = balances.find(b => b.asset === 'USDT');
                const positions = await asterService.getPositions();

                // Calculate Portfolio Value (Wallet Balance + Unrealized PnL)
                const walletBalance = usdtBalance ? usdtBalance.total : 0;
                const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
                portfolioValue = walletBalance + unrealizedPnL;

                openPositionsCount = positions.length;
                currentExposure = positions.reduce((sum, p) => sum + (p.size * p.markPrice), 0);
            }
        } catch (error) {
            console.warn(`Failed to fetch real account data for user ${userId}, using defaults:`, error);
            // Default fallbacks if API fails or keys missing
            portfolioValue = 50000;
        }

        // Run orchestrator with REAL context
        const decision = await this.orchestrator.analyzeAndDecide({
            userId,
            symbol,
            marketData,
            riskMetrics: {
                ...rlMetrics,
                portfolioValue,
                currentExposure,
                openPositions: openPositionsCount,
            },
        });

        if (decision.finalDecision !== 'HOLD' && decision.confidence > 70) {
            // If trading is enabled and mode is 'trade', execute
            if (user.tradingEnabled && user.tradingMode === 'trade') {
                await this.executeOrder(userId, decision, symbol);
            }
        }

        return decision;
    }

    /**
     * Get market data (mock for now)
     */
    /**
     * Get market data from AsterDex
     */
    private async getMarketData(symbol: string) {
        try {
            // Get 24hr ticker for general stats
            const ticker = await this.asterService.getTicker(symbol);

            // Get RSI/MACD/ATR (Calculated from Klines) - Implementation simplified for now
            // Ideally we'd calculate these using technicalindicators lib on fetched klines
            const klines = await this.asterService.getKlines(symbol, '1h', 100);

            // Simple mock indicators for now until we add a technical analysis lib
            // In a real scenario, use 'technicalindicators' package
            return {
                symbol,
                currentPrice: ticker.price,
                change24h: ticker.priceChangePercent,
                high24h: ticker.high24h,
                low24h: ticker.low24h,
                volume: ticker.volume24h,
                rsi: 50, // Placeholder
                macd: 0, // Placeholder
                atr: 0,  // Placeholder
            };
        } catch (error) {
            console.error(`Failed to fetch market data for ${symbol}:`, error);
            // Fallback to mock if API fails
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
    }

    /**
     * Execute an order on AsterDex
     */
    private async executeOrder(userId: string, decision: any, symbol: string) {
        // Fetch user secrets
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { asterApiKey: true, asterApiSecret: true, asterTestnet: true }
        });

        if (!user || !user.asterApiKey || !user.asterApiSecret) {
            console.warn(`User ${userId} missing API keys, skipping execution`);
            return null;
        }

        const authService = new AsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet || true);

        try {
            // Calculate quantity based on risk/portfolio (Simplified)
            // In production: fetch balance, apply risk %

            // For now, if decision is LONG/SHORT, execute min quantity
            if (decision.finalDecision === 'LONG' || decision.finalDecision === 'SHORT') {
                const type = 'MARKET'; // Or LIMIT if price is specified
                const side = decision.finalDecision === 'LONG' ? 'BUY' : 'SELL';

                // Fetch symbol info to get minQty/precision
                const pairs = await this.asterService.getPairs();
                const pairInfo = pairs.find(p => p.symbol === symbol);
                const quantity = pairInfo ? pairInfo.minQty : 0.001; // Default fallback

                console.log(`Executing ${side} order for ${symbol} quantity ${quantity}`);

                const order = await authService.placeOrder({
                    symbol,
                    side,
                    type,
                    quantity,
                    // positionSide: 'BOTH' // Default for One-Way Mode
                });

                // Log trade to DB
                await prisma.trade.create({
                    data: {
                        userId,
                        symbol,
                        side: decision.finalDecision,
                        entryPrice: order.avgPrice,
                        quantity: order.executedQty,
                        status: 'OPEN',
                        pnl: 0
                    }
                });

                return order;
            }
        } catch (error) {
            console.error('Order execution failed:', error);
            // Don't throw, just log execution failure
        }
        return null;
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
