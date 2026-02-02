/**
 * Trading Pipeline
 * 
 * Orchestrates the full trading flow:
 * 1. Fetch market data from AsterDex
 * 2. Run AI agents through orchestrator
 * 3. Track signal
 * 4. Execute based on mode (signal/trade/test)
 */

import { exchangeFactory, OrderParams } from './exchange.service.js';
import { marketDataService, AnalysisData } from './market-data.service.js';
import { strategyService, StrategyVersion } from './strategy.service.js';
import { signalTrackerService, TrackedSignal } from './signal-tracker.service.js';
import { AgentOrchestrator, OrchestratorDecision } from '../agents/orchestrator.js';
import { prisma } from '../utils/prisma.js';


// Types
export type TradingMode = 'signal' | 'trade' | 'test';

export interface PipelineResult {
    mode: TradingMode;
    signal: TrackedSignal;
    orchestratorDecision: OrchestratorDecision;
    analysisData: AnalysisData;
    executed?: boolean;
    order?: any;
    error?: string;
}

export interface UserTradingConfig {
    userId: string;
    tradingMode: TradingMode;
    tradingEnabled: boolean;
    leverage: number;
    selectedPairs: string[];
    methodology: string;
    asterApiKey?: string;
    asterApiSecret?: string;
    asterTestnet: boolean;
    preferredExchange?: string;
    maxPositionSize: number;  // % of portfolio
    maxRiskPerTrade: number;  // % of portfolio
}

export class TradingPipeline {
    private orchestrator: AgentOrchestrator;

    constructor() {
        this.orchestrator = new AgentOrchestrator();
    }

    /**
     * Run the full trading pipeline
     */
    async run(userId: string, symbol: string): Promise<PipelineResult> {
        // 1. Get user config
        const config = await this.getUserConfig(userId);

        if (!config.tradingEnabled) {
            throw new Error('Trading is not enabled');
        }

        if (!config.selectedPairs.includes(symbol)) {
            throw new Error(`Symbol ${symbol} is not in your selected pairs`);
        }

        // 2. Get or create strategy
        let strategy = await strategyService.getCurrentStrategy(userId);
        if (!strategy) {
            strategy = await strategyService.createFromMethodology(
                userId,
                config.methodology as any
            );
        }

        // 3. Fetch market data from AsterDex
        const analysisData = await marketDataService.getAnalysisData(symbol);

        // 4. Get real portfolio value from AsterDex
        let portfolioValue = 10000; // Default fallback
        if (config.asterApiKey && config.asterApiSecret) {
            try {
                const exchange = exchangeFactory.getAdapterForUser(
                    config.preferredExchange || 'aster',
                    config.asterApiKey,
                    config.asterApiSecret,
                    config.asterTestnet
                );
                const balances = await exchange.getBalance();
                const usdtBalance = balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    portfolioValue = usdtBalance.total;
                }
            } catch (error) {
                console.warn('[Pipeline] Failed to fetch portfolio value, using default:', error);
            }
        }

        // 5. Prepare context for orchestrator
        const context = {
            userId,
            symbol,
            marketData: {
                currentPrice: analysisData.currentPrice,
                change24h: analysisData.change24h,
                volume: analysisData.volume24h,
                rsi: analysisData.indicators.rsi,
                macd: analysisData.indicators.macd.macd,
                atr: analysisData.indicators.atr,
            },
            riskMetrics: {
                portfolioValue,
                currentExposure: 0,
                openPositions: 0,
                maxRiskPerTrade: config.maxRiskPerTrade,
                maxPositionSize: config.maxPositionSize,
            },
            strategyRules: strategy.rules,
            methodology: strategy.baseMethodology,
            analysisDataFormatted: marketDataService.formatForDeepSeek(analysisData),
            strategyRulesFormatted: strategyService.formatRulesForPrompt(strategy),
        };

        // 5. Run AI agents through orchestrator
        const orchestratorDecision = await this.orchestrator.analyzeAndDecide(context);

        // 6. Create tracked signal
        const signal = await signalTrackerService.createSignal(
            userId,
            strategy.id,
            {
                symbol,
                direction: orchestratorDecision.finalDecision as 'LONG' | 'SHORT',
                entryPrice: orchestratorDecision.entryPrice || analysisData.currentPrice,
                stopLoss: orchestratorDecision.stopLoss || this.calculateStopLoss(
                    analysisData.currentPrice,
                    orchestratorDecision.finalDecision,
                    analysisData.indicators.atr
                ),
                takeProfit: orchestratorDecision.takeProfit || this.calculateTakeProfit(
                    analysisData.currentPrice,
                    orchestratorDecision.finalDecision,
                    analysisData.indicators.atr
                ),
                confidence: orchestratorDecision.confidence,
                agentReasoning: {
                    strategyConsultant: orchestratorDecision.agentDecisions?.strategy?.reasoning || '',
                    riskOfficer: orchestratorDecision.agentDecisions?.risk?.reasoning || '',
                    marketAnalyst: orchestratorDecision.agentDecisions?.market?.reasoning || '',
                },
                indicators: analysisData.indicators,
            }
        );

        // 7. Execute based on mode
        const result: PipelineResult = {
            mode: config.tradingMode,
            signal,
            orchestratorDecision,
            analysisData,
        };

        if (config.tradingMode === 'trade' && orchestratorDecision.readyToExecute) {
            // Execute real trade
            try {
                const order = await this.executeOrder(config, signal, analysisData);
                result.executed = true;
                result.order = order;

                // Mark signal as executed
                await signalTrackerService.markExecuted(
                    signal.id,
                    order.orderId,
                    order.avgPrice || signal.entryPrice
                );
            } catch (error: any) {
                result.executed = false;
                result.error = error.message;
            }
        } else if (config.tradingMode === 'test') {
            // Test mode - just track, don't execute
            // Signal will be monitored for paper performance
            result.executed = false;
        } else {
            // Signal mode - notify user, don't execute
            result.executed = false;
        }

        return result;
    }

    /**
     * Get user trading configuration
     */
    private async getUserConfig(userId: string): Promise<UserTradingConfig> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                tradingEnabled: true,
                tradingMode: true,
                leverage: true,
                selectedPairs: true,
                methodology: true,
                asterApiKey: true,
                asterApiSecret: true,
                asterTestnet: true,
                preferredExchange: true,
                maxPositionSize: true,
                maxRiskPerTrade: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return {
            userId: user.id,
            tradingEnabled: user.tradingEnabled,
            tradingMode: (user.tradingMode as TradingMode) || 'signal',
            leverage: user.leverage || 10,
            selectedPairs: (user.selectedPairs as string[]) || [],
            methodology: user.methodology || 'Custom',
            asterApiKey: user.asterApiKey || undefined,
            asterApiSecret: user.asterApiSecret || undefined,
            asterTestnet: user.asterTestnet ?? true,
            preferredExchange: (user as any).preferredExchange,
            maxPositionSize: user.maxPositionSize || 5,
            maxRiskPerTrade: user.maxRiskPerTrade || 2,
        };
    }

    /**
     * Execute order on AsterDex
     */
    private async executeOrder(
        config: UserTradingConfig,
        signal: TrackedSignal,
        analysisData: AnalysisData
    ): Promise<any> {
        if (!config.asterApiKey || !config.asterApiSecret) {
            throw new Error('API credentials not configured');
        }

        // Create Exchange client with user credentials
        const exchange = exchangeFactory.getAdapterForUser(
            config.preferredExchange || 'aster',
            config.asterApiKey,
            config.asterApiSecret,
            config.asterTestnet
        );

        // Set leverage
        if (exchange.setLeverage) {
            await exchange.setLeverage(signal.symbol, config.leverage);
        }

        // Calculate position size
        const balance = await exchange.getBalance();
        const usdtBalance = balance.find(b => b.asset === 'USDT')?.available || 0;
        const positionValue = usdtBalance * (config.maxPositionSize / 100);
        const quantity = positionValue / signal.entryPrice;

        // Create order params
        const orderParams: OrderParams = {
            symbol: signal.symbol,
            side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
            type: 'LIMIT',
            quantity,
            price: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            positionSide: signal.direction,
        };

        // Place order
        const order = await exchange.placeOrder(orderParams);
        return order;
    }

    /**
     * Calculate stop loss based on ATR
     */
    private calculateStopLoss(
        price: number,
        direction: string,
        atr: number
    ): number {
        const slDistance = atr * 1.5;
        return direction === 'LONG'
            ? Math.round((price - slDistance) * 100) / 100
            : Math.round((price + slDistance) * 100) / 100;
    }

    /**
     * Calculate take profit (2:1 R:R)
     */
    private calculateTakeProfit(
        price: number,
        direction: string,
        atr: number
    ): number {
        const tpDistance = atr * 3;
        return direction === 'LONG'
            ? Math.round((price + tpDistance) * 100) / 100
            : Math.round((price - tpDistance) * 100) / 100;
    }

    /**
     * Run analysis for multiple symbols
     */
    async runForAllPairs(userId: string): Promise<PipelineResult[]> {
        const config = await this.getUserConfig(userId);
        const results: PipelineResult[] = [];

        for (const symbol of config.selectedPairs) {
            try {
                const result = await this.run(userId, symbol);
                results.push(result);
            } catch (error: any) {
                console.error(`[Pipeline] Error for ${symbol}:`, error);
            }
        }

        return results;
    }
}

export const tradingPipeline = new TradingPipeline();
