/**
 * Trading Service
 */

import { prisma } from '../utils/prisma.js';
import { AgentOrchestrator } from '../agents/orchestrator.js';
import { rlService } from './rl.service.js';
import { AsterService } from './aster.service.js';
import { TechnicalAnalysisService } from './technical-analysis.service.js';
import { MultiTFData } from './scheduler.service.js';

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
        openaiApiKey?: string;
        anthropicApiKey?: string;
        geminiApiKey?: string;
        marketType?: string;
        marketAnalystModel?: string;
        riskOfficerModel?: string;
        strategyConsultantModel?: string;
        orchestratorModel?: string;
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
        if (settings.openaiApiKey !== undefined) updateData.openaiApiKey = settings.openaiApiKey;
        if (settings.anthropicApiKey !== undefined) updateData.anthropicApiKey = settings.anthropicApiKey;
        if (settings.geminiApiKey !== undefined) updateData.geminiApiKey = settings.geminiApiKey;
        if (settings.marketAnalystModel !== undefined) updateData.marketAnalystModel = settings.marketAnalystModel;
        if (settings.riskOfficerModel !== undefined) updateData.riskOfficerModel = settings.riskOfficerModel;
        if (settings.strategyConsultantModel !== undefined) updateData.strategyConsultantModel = settings.strategyConsultantModel;
        if (settings.orchestratorModel !== undefined) updateData.orchestratorModel = settings.orchestratorModel;

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
                marketAnalystModel: true,
                riskOfficerModel: true,
                strategyConsultantModel: true,
                orchestratorModel: true
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

        // Fetch ACTIVE Strategy Version
        const activeStrategy = await prisma.strategyVersion.findFirst({
            where: { userId, status: 'ACTIVE' }
        });

        // Use Strategy Methodology if available, fall back to user setting
        const methodology = activeStrategy?.baseMethodology || user.methodology || 'SMC';

        // Get market data with strategy-specific analysis (SMC/ICT/Gann patterns)
        const marketData = await this.getMarketData(symbol, methodology);

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
        let decision: any;
        try {
            decision = await this.orchestrator.analyzeAndDecide({
                userId,
                symbol,
                marketData,
                riskMetrics: {
                    ...rlMetrics,
                    portfolioValue,
                    currentExposure,
                    openPositions: openPositionsCount,
                },
                methodology: methodology,
            }, user.strategyMode as any); // Pass user's preferred mode (deepseek/rl/hybrid)
        } catch (error: any) {
            console.error(`[TradingService] Orchestrator failed for ${symbol}:`, error);
            // Create error record visible to user
            await prisma.agentDecision.create({
                data: {
                    userId,
                    agentType: 'ORCHESTRATOR',
                    reasoning: `Analysis Failed: ${error.message || 'Unknown error'}`,
                    thoughtSteps: [
                        { step: 1, thought: 'Attempted live market analysis' },
                        { step: 2, thought: `Error: ${error.message}` },
                        { step: 3, thought: 'Check API keys and Strategy Settings.' }
                    ],
                    decision: 'BLOCKED',
                    confidence: 0,
                    symbol,
                    marketData: marketData as any,
                    isBacktest: false,
                    sourceMode: (user.tradingEnabled && user.tradingMode === 'trade') ? 'TRADE' : 'SIGNAL'
                }
            });
            throw error; // Re-throw to stop execution
        }

        await this.handleTradingDecision(userId, symbol, decision, user, activeStrategy);

        return decision;
    }

    /**
     * Handle trading decision (Save DB, Create Signal, Execute Trade)
     */
    private async handleTradingDecision(
        userId: string,
        symbol: string,
        decision: any,
        user: any,
        activeStrategy: any
    ) {
        // Determine source mode: TRADE if executing, SIGNAL if signal-only
        const sourceMode = (user.tradingEnabled && user.tradingMode === 'trade') ? 'TRADE' : 'SIGNAL';

        // Save AgentDecision to database (live trading, not backtest)
        const agentDecision = await prisma.agentDecision.create({
            data: {
                userId,
                agentType: 'ORCHESTRATOR',
                reasoning: decision.agentDecisions?.strategy?.reasoning || 'Live trading analysis',
                thoughtSteps: [
                    { step: 1, thought: `Market Analysis: ${decision.marketAnalysis?.reasoning || 'N/A'}` },
                    { step: 2, thought: `Strategy Proposal: ${decision.strategyDecision?.reasoning || 'N/A'}` },
                    { step: 3, thought: `Risk Assessment: ${decision.riskAssessment?.reasoning || 'N/A'}` },
                    { step: 4, thought: `Counsel Consensus: ${decision.agentConsensus ? 'AGREEMENT' : 'DISAGREEMENT'}. Final Verdict: ${decision.finalDecision}` },
                    ...(decision.counsel?.deliberation ? [{ step: 5, thought: `Deliberation: ${decision.counsel.deliberation}` }] : [])
                ],
                decision: decision.finalDecision,
                confidence: decision.confidence,
                symbol,
                marketData: decision.marketAnalysis?.data || {},
                isBacktest: false,
                sourceMode: sourceMode
            }
        });

        // Create Signal record for LONG/SHORT decisions (live trading)
        if (decision.finalDecision === 'LONG' || decision.finalDecision === 'SHORT') {
            await prisma.signal.create({
                data: {
                    userId,
                    symbol,
                    direction: decision.finalDecision,
                    confidence: decision.confidence,
                    methodology: decision.strategyMode || user.methodology || 'SMC',
                    entryPrice: decision.entryPrice || 0, // Ensure entry price is captured
                    stopLoss: decision.stopLoss,
                    takeProfit: decision.takeProfit,
                    agentDecisionId: agentDecision.id,
                    isBacktest: false,
                    sourceMode: sourceMode
                }
            });
        }

        if (decision.finalDecision !== 'HOLD' && decision.confidence > 0.7) {
            // If trading is enabled and mode is 'trade' AND we have an active strategy, execute
            if (user.tradingEnabled && user.tradingMode === 'trade' && activeStrategy) {
                await this.executeOrder(userId, decision, symbol);
            } else if (user.tradingEnabled && user.tradingMode === 'trade' && !activeStrategy) {
                console.warn(`[TradingService] User ${userId} wants to trade but no ACTIVE strategy. Skipping execution.`);
            } else {
                console.log(`[TradingService] Decision ${decision.finalDecision} (Conf: ${decision.confidence}) - Skipping execution (Mode: ${user.tradingMode})`);
            }
        } else {
            console.log(`[TradingService] Decision Skipped: ${decision.finalDecision} (Confidence: ${decision.confidence}) - Threshold not met (>0.7)`);
        }
    }

    /**
     * Execute scheduled analysis (Called by Scheduler)
     */
    async executeScheduledAnalysis(userId: string, symbol: string, multiTFData: MultiTFData) {
        console.log(`[TradingService] Executing scheduled analysis for ${userId} on ${symbol}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                methodology: true,
                strategyMode: true,
                tradingEnabled: true,
                tradingMode: true,
                asterApiKey: true, // Need API key for execution check
                asterApiSecret: true,
                asterTestnet: true,
                leverage: true,
                tradingCapitalPercent: true,
            },
        });

        if (!user) return;

        // Fetch ACTIVE Strategy Version
        const activeStrategy = await prisma.strategyVersion.findFirst({
            where: { userId, status: 'ACTIVE' }
        });

        const methodology = activeStrategy?.baseMethodology || user.methodology || 'SMC';

        // Prepare Market Data from Multi-TF
        // We use 1h data for the primary analysis as per current logic
        const tf1h = multiTFData.timeframes.tf1h;
        if (!tf1h || tf1h.length < 50) {
            console.warn(`[TradingService] Insufficient 1h data for ${symbol}`);
            return;
        }

        // Format data for technical analysis
        const highs = tf1h.map(k => k.high);
        const lows = tf1h.map(k => k.low);
        const closes = tf1h.map(k => k.close);
        const opens = tf1h.map(k => k.open);

        // Analyze
        const indicators = TechnicalAnalysisService.analyze(highs, lows, closes, opens, methodology);

        // Construct Market Data Object
        const latest = tf1h[tf1h.length - 1];
        const marketData = {
            ...indicators,
            symbol,
            currentPrice: latest.close,
            change24h: tf1h.length >= 24 ?
                ((latest.close - tf1h[tf1h.length - 24]?.close) / tf1h[tf1h.length - 24]?.close * 100) : 0,
            high24h: Math.max(...tf1h.slice(-24).map(c => c.high)),
            low24h: Math.min(...tf1h.slice(-24).map(c => c.low)),
            volume: tf1h.slice(-24).reduce((sum, c) => sum + c.volume, 0),
            // Map calculated indicators to simplified flat structure if needed
            rsi: indicators.rsi,
            macd: indicators.macd.MACD || 0,
            atr: indicators.atr,
            methodology: methodology,
            multiTF: multiTFData.timeframes
        };

        // Get RL metrics (simplified for scheduled run)
        const rlMetrics = await rlService.getMetrics();

        // Run Analysis using Orchestrator Caching
        // We do typically want to use the caching here since it's the 4-hour cycle
        // But Scheduler calls this every 4 hours. So cache might be expired anyway.
        // However, if manual analysis was run 10 mins ago, we should use that cache?
        // Yes, verify logic in orchestrator: checks if cache exists and is < 4h old.

        try {
            const decision = await this.orchestrator.analyzeWithCaching({
                userId,
                symbol,
                marketData,
                riskMetrics: {
                    ...rlMetrics,
                    portfolioValue: 0, // Simplified for background job (or fetch real)
                    currentExposure: 0,
                    openPositions: 0
                },
                methodology: methodology
            }, user.strategyMode as any);

            // Handle Decision (Signal + Trade)
            await this.handleTradingDecision(userId, symbol, decision, user, activeStrategy);

        } catch (error) {
            console.error(`[TradingService] Scheduled analysis failed via Orchestrator:`, error);
        }
    }

    /**
     * Get market data from AsterDex with Strategy-Specific Analysis
     */
    /**
     * Get market data from AsterDex with Strategy-Specific Analysis
     */
    private async getMarketData(symbol: string, methodology?: string) {
        try {
            // Get 24hr ticker for general stats
            const ticker = await this.asterService.getTicker(symbol);

            // Get RSI/MACD/ATR (Calculated from Klines)
            // Fetch Klines for TA (100 candles for sufficient history)
            const klines = await this.asterService.getKlines(symbol, '1h', 100);

            // Format data for technical analysis
            const highs = klines.map(k => k.high);
            const lows = klines.map(k => k.low);
            const closes = klines.map(k => k.close);
            const opens = klines.map(k => k.open);

            // Calculate Indicators with Strategy-Specific patterns
            const indicators = TechnicalAnalysisService.analyze(highs, lows, closes, opens, methodology);

            return {
                ...indicators, // Include all strategy-specific fields first
                symbol,
                currentPrice: ticker.price,
                change24h: ticker.priceChangePercent,
                high24h: ticker.high24h,
                low24h: ticker.low24h,
                volume: ticker.volume24h,
                rsi: indicators.rsi,
                macd: indicators.macd.MACD || 0, // Scalar value for prompt
                atr: indicators.atr,
                bollinger: indicators.bollinger,
                // Strategy-specific data
                methodology: methodology || 'GENERIC',
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
        // Fetch user secrets and trading config
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                asterApiKey: true,
                asterApiSecret: true,
                asterTestnet: true,
                leverage: true,
                methodology: true,
                tradingCapitalPercent: true,
                maxDrawdownPercent: true,
            }
        });

        if (!user || !user.asterApiKey || !user.asterApiSecret) {
            console.warn(`User ${userId} missing API keys, skipping execution`);
            return null;
        }

        const authService = new AsterService(user.asterApiKey, user.asterApiSecret, user.asterTestnet || true);

        try {
            // Get current balance to calculate position size
            const balances = await authService.getBalance();
            const usdtBalance = balances.find(b => b.asset === 'USDT');
            const availableBalance = usdtBalance ? usdtBalance.available : 0;

            if (availableBalance <= 0) {
                console.warn(`User ${userId} has no available balance, skipping execution`);
                return null;
            }

            // Calculate position size based on tradingCapitalPercent
            const capitalPercent = user.tradingCapitalPercent || 10; // Default 10%
            const positionUSDT = (availableBalance * capitalPercent) / 100;

            // For now, if decision is LONG/SHORT, execute calculated quantity
            if (decision.finalDecision === 'LONG' || decision.finalDecision === 'SHORT') {
                const type = 'MARKET';
                const side = decision.finalDecision === 'LONG' ? 'BUY' : 'SELL';

                // Fetch current price to calculate quantity
                const currentPrice = decision.entryPrice || (await authService.getPrice(symbol));
                const leverage = user.leverage || 10;

                // Calculate quantity: (USDT amount * leverage) / price
                const rawQuantity = (positionUSDT * leverage) / currentPrice;

                // Get symbol precision
                const pairs = await this.asterService.getPairs();
                const pairInfo = pairs.find(p => p.symbol === symbol);
                const stepSize = (pairInfo as any)?.stepSize || pairInfo?.minQty || 0.001;
                const minQty = pairInfo?.minQty || 0.001;

                // Round quantity to step size
                const quantity = Math.max(minQty, Math.floor(rawQuantity / stepSize) * stepSize);

                console.log(`[Execute] ${side} ${symbol} | Balance: $${availableBalance.toFixed(2)} | ${capitalPercent}% = $${positionUSDT.toFixed(2)} | Qty: ${quantity}`);

                const order = await authService.placeOrder({
                    symbol,
                    side,
                    type,
                    quantity,
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
                        pnl: 0,
                        leverage: leverage,
                        methodology: user.methodology || 'SMC'
                    }
                });

                return order;
            }
        } catch (error) {
            console.error('Order execution failed:', error);
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
            select: { pnl: true, closedAt: true, symbol: true, methodology: true },
        });

        const now = new Date();
        const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const pnl1D = trades
            .filter((t: any) => t.closedAt && t.closedAt >= day1)
            .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

        const pnl7D = trades
            .filter((t: any) => t.closedAt && t.closedAt >= day7)
            .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

        const pnl30D = trades
            .filter((t: any) => t.closedAt && t.closedAt >= day30)
            .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

        const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
        const winCount = trades.filter((t: any) => (t.pnl || 0) > 0).length;
        const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;

        // Calculate breakdown by Pair
        const pairStats: Record<string, { pnl: number, trades: number, wins: number }> = {};
        trades.forEach((t: any) => {
            if (!pairStats[t.symbol]) pairStats[t.symbol] = { pnl: 0, trades: 0, wins: 0 };
            pairStats[t.symbol].pnl += (t.pnl || 0);
            pairStats[t.symbol].trades += 1;
            if ((t.pnl || 0) > 0) pairStats[t.symbol].wins += 1;
        });

        const pnlByPair = Object.entries(pairStats).map(([pair, stats]) => ({
            pair,
            pnl: stats.pnl,
            trades: stats.trades,
            winRate: Math.round((stats.wins / stats.trades) * 100)
        })).sort((a, b) => b.pnl - a.pnl);

        // Calculate breakdown by Strategy
        const strategyStats: Record<string, { pnl: number, trades: number, wins: number }> = {};
        trades.forEach((t: any) => {
            const strategy = t.methodology || 'Unknown';
            if (!strategyStats[strategy]) strategyStats[strategy] = { pnl: 0, trades: 0, wins: 0 };
            strategyStats[strategy].pnl += (t.pnl || 0);
            strategyStats[strategy].trades += 1;
            if ((t.pnl || 0) > 0) strategyStats[strategy].wins += 1;
        });

        const pnlByStrategy = Object.entries(strategyStats).map(([strategy, stats]) => ({
            strategy,
            pnl: stats.pnl,
            trades: stats.trades,
            winRate: Math.round((stats.wins / stats.trades) * 100)
        })).sort((a, b) => b.pnl - a.pnl);

        return {
            pnl1D,
            pnl7D,
            pnl30D,
            totalPnL,
            totalTrades: trades.length,
            winRate: Math.round(winRate),
            pnlByPair,
            pnlByStrategy
        };
    }
}

export const tradingService = new TradingService();
