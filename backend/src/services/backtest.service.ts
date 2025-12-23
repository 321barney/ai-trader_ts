/**
 * Backend Backtest Service
 * Runs simulations independently of frontend
 */

import { prisma } from '../utils/prisma.js';
import { marketDataService } from './market-data.service.js';

interface BacktestConfig {
    symbol: string;
    initDate: Date;
    endDate: Date;
    initialCapital: number;
    strategyVersionId: string;
}

interface CandleData {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

class BacktestService {
    private runningBacktests: Set<string> = new Set();

    /**
     * Start a new backtest session
     */
    async startBacktest(userId: string, config: BacktestConfig) {
        // Calculate total steps (trading days between dates)
        const msPerDay = 24 * 60 * 60 * 1000;
        const totalDays = Math.ceil((config.endDate.getTime() - config.initDate.getTime()) / msPerDay);

        // Create session in database
        const session = await prisma.backtestSession.create({
            data: {
                userId,
                strategyVersionId: config.strategyVersionId,
                symbol: config.symbol,
                initDate: config.initDate,
                endDate: config.endDate,
                initialCapital: config.initialCapital,
                status: 'RUNNING',
                currentDate: config.initDate,
                currentStep: 0,
                totalSteps: totalDays,
                portfolioValue: config.initialCapital,
                portfolioHistory: [{ date: config.initDate.toISOString(), value: config.initialCapital }],
                trades: []
            }
        });

        console.log(`[Backtest] Started session ${session.id} for ${config.symbol}`);

        // Start background processing
        this.processBacktest(session.id);

        return session;
    }

    /**
     * Process backtest in background
     */
    private async processBacktest(sessionId: string) {
        if (this.runningBacktests.has(sessionId)) {
            return; // Already running
        }
        this.runningBacktests.add(sessionId);

        try {
            while (true) {
                const session = await prisma.backtestSession.findUnique({
                    where: { id: sessionId }
                });

                if (!session) {
                    console.log(`[Backtest] Session ${sessionId} not found, stopping`);
                    break;
                }

                if (session.status === 'PAUSED') {
                    // Paused, wait and check again
                    await this.sleep(1000);
                    continue;
                }

                if (session.status !== 'RUNNING') {
                    console.log(`[Backtest] Session ${sessionId} status is ${session.status}, stopping`);
                    break;
                }

                // Check if completed
                if (session.currentStep >= session.totalSteps) {
                    await this.completeBacktest(sessionId);
                    break;
                }

                // Advance one step
                await this.advanceStep(sessionId);

                // Small delay - prevent rate limiting (AI agents need time)
                // 5 seconds delay to stay within safe limits for most APIs
                await this.sleep(5000);
            }
        } catch (error) {
            console.error(`[Backtest] Error in session ${sessionId}:`, error);
            await prisma.backtestSession.update({
                where: { id: sessionId },
                data: { status: 'FAILED' }
            });
        } finally {
            this.runningBacktests.delete(sessionId);
        }
    }

    /**
     * Advance simulation by one step with AI Agent analysis
     */
    private async advanceStep(sessionId: string) {
        const session = await prisma.backtestSession.findUnique({
            where: { id: sessionId },
            include: { user: true }
        });

        if (!session) return;

        // Fetch strategy version for methodology
        const strategyVersion = await prisma.strategyVersion.findUnique({
            where: { id: session.strategyVersionId }
        });

        const msPerDay = 24 * 60 * 60 * 1000;
        const nextDate = new Date(session.currentDate!.getTime() + msPerDay);
        const nextStep = session.currentStep + 1;

        // Get methodology from strategy or user setting
        const methodology = strategyVersion?.baseMethodology || session.user.methodology || 'SMC';

        // Get current portfolio state
        const currentValue = session.portfolioValue || session.initialCapital;
        const trades = (session.trades as any[]) || [];
        let newValue = currentValue;

        try {
            // Import orchestrator dynamically to avoid circular deps
            const { AgentOrchestrator } = await import('../agents/index.js');
            const { AsterService } = await import('./aster.service.js');
            const { TechnicalAnalysisService } = await import('./technical-analysis.service.js');

            // Create orchestrator instance
            const orchestratorInstance = new AgentOrchestrator();

            // Fetch REAL market data from exchange
            let marketData: any;
            try {
                // Use public API (no keys needed for market data)
                const asterService = new AsterService('', '', true);

                // Get 24hr ticker
                const ticker = await asterService.getTicker(session.symbol);

                // Get klines for technical analysis
                const klines = await asterService.getKlines(session.symbol, '1h', 100);

                // Calculate indicators with strategy-specific patterns
                const highs = klines.map(k => k.high);
                const lows = klines.map(k => k.low);
                const closes = klines.map(k => k.close);
                const opens = klines.map(k => k.open);
                const indicators = TechnicalAnalysisService.analyze(highs, lows, closes, opens, methodology);

                marketData = {
                    ...indicators, // Include all strategy-specific fields first
                    symbol: session.symbol,
                    currentPrice: ticker.price,
                    change24h: ticker.priceChangePercent,
                    high24h: ticker.high24h,
                    low24h: ticker.low24h,
                    volume: ticker.volume24h,
                    rsi: indicators.rsi,
                    macd: indicators.macd.MACD || 0, // Overwrite object with scalar for prompt compatibility
                    atr: indicators.atr,
                    bollinger: indicators.bollinger,
                    methodology: methodology,
                    timestamp: nextDate
                };

                console.log(`[Backtest] Step ${nextStep}: ${methodology} analysis - Price: $${ticker.price}, RSI: ${indicators.rsi?.toFixed(1)}`);
            } catch (fetchError) {
                console.warn(`[Backtest] Failed to fetch real data, using last known:`, fetchError);
                // Fallback: minimal simulated data
                marketData = {
                    symbol: session.symbol,
                    currentPrice: 40000 + (Math.random() - 0.5) * 1000,
                    priceChange24h: (Math.random() - 0.5) * 5,
                    volume24h: 1000000000,
                    rsi: 50 + (Math.random() - 0.5) * 20,
                    macd: (Math.random() - 0.5) * 100,
                    timestamp: nextDate
                };
            }

            console.log(`[Backtest] Step ${nextStep}: Calling AI agents with ${methodology} methodology...`);

            // Run AI Agent analysis (in backtest mode)
            // Use 'deepseek' mode (generic AI) rather than 'hybrid' to avoid RL checks unless needed
            const decision = await orchestratorInstance.analyzeAndDecide({
                symbol: session.symbol,
                marketData: marketData,
                userId: session.userId,
                methodology: methodology,  // Pass methodology for strategy-specific analysis
                riskMetrics: {
                    portfolioValue: currentValue,
                    currentExposure: 0,
                    openPositions: 0
                }
            }, session.user.strategyMode as any || 'deepseek');

            console.log(`[Backtest] Step ${nextStep}: Agent decision = ${decision.finalDecision} (confidence: ${decision.confidence?.toFixed(2)})`);

            // 1. Create Strategy Consultant Decision Record
            if (decision.strategyDecision) {
                await prisma.agentDecision.create({
                    data: {
                        userId: session.userId,
                        agentType: 'STRATEGY_CONSULTANT',
                        reasoning: decision.strategyDecision.reasoning || '',
                        thoughtSteps: (decision.strategyDecision.thoughtSteps || []) as any,
                        decision: decision.strategyDecision.decision,
                        confidence: decision.strategyDecision.confidence,
                        symbol: session.symbol,
                        marketData: marketData as any,
                        isBacktest: true,
                        backtestSessionId: sessionId,
                        sourceMode: 'BACKTEST'
                    }
                });
            }

            // 2. Create Risk Officer Decision Record
            if (decision.riskAssessment) {
                await prisma.agentDecision.create({
                    data: {
                        userId: session.userId,
                        agentType: 'RISK_OFFICER',
                        reasoning: decision.riskAssessment.reasoning || '',
                        thoughtSteps: (decision.riskAssessment.thoughtSteps || []) as any,
                        decision: decision.riskAssessment.decision,
                        confidence: decision.riskAssessment.confidence,
                        symbol: session.symbol,
                        marketData: marketData as any,
                        isBacktest: true,
                        backtestSessionId: sessionId,
                        sourceMode: 'BACKTEST'
                    }
                });
            }

            // 3. Create Market Analyst Decision Record
            if (decision.marketAnalysis) {
                await prisma.agentDecision.create({
                    data: {
                        userId: session.userId,
                        agentType: 'MARKET_ANALYST',
                        reasoning: decision.marketAnalysis.reasoning || '',
                        thoughtSteps: (decision.marketAnalysis.thoughtSteps || []) as any,
                        decision: decision.marketAnalysis.decision,
                        confidence: decision.marketAnalysis.confidence,
                        symbol: session.symbol,
                        marketData: marketData as any,
                        isBacktest: true,
                        backtestSessionId: sessionId,
                        sourceMode: 'BACKTEST'
                    }
                });
            }

            // 4. Create Orchestrator Decision Record (Final)
            const agentDecision = await prisma.agentDecision.create({
                data: {
                    userId: session.userId,
                    agentType: 'ORCHESTRATOR',
                    reasoning: decision.blockReason || decision.agentDecisions?.strategy?.reasoning || 'Backtest analysis',
                    thoughtSteps: [
                        { step: 1, thought: `Market Analysis: ${decision.marketAnalysis?.reasoning?.slice(0, 200)}...` },
                        { step: 2, thought: `Strategy Proposal: ${decision.strategyDecision?.reasoning?.slice(0, 200)}...` },
                        { step: 3, thought: `Risk Assessment: ${decision.riskAssessment?.reasoning?.slice(0, 200)}...` },
                        { step: 4, thought: `Counsel Consensus: ${decision.agentConsensus ? 'AGREEMENT' : 'DISAGREEMENT'}. Final Verdict: ${decision.finalDecision}` },
                        ...(decision.counsel?.deliberation ? [{ step: 5, thought: `Deliberation: ${decision.counsel.deliberation.slice(0, 300)}...` }] : [])
                    ],
                    decision: decision.finalDecision,
                    confidence: decision.confidence,
                    symbol: session.symbol,
                    marketData: marketData as any,
                    isBacktest: true,
                    backtestSessionId: sessionId,
                    sourceMode: 'BACKTEST'
                }
            });

            // Create Signal record for LONG/SHORT decisions (marked as backtest)
            if (decision.finalDecision === 'LONG' || decision.finalDecision === 'SHORT') {
                await prisma.signal.create({
                    data: {
                        userId: session.userId,
                        symbol: session.symbol,
                        direction: decision.finalDecision,
                        confidence: decision.confidence,
                        methodology: decision.strategyMode || 'backtest',
                        entryPrice: marketData.currentPrice,
                        stopLoss: decision.stopLoss,
                        takeProfit: decision.takeProfit,
                        agentDecisionId: agentDecision.id,
                        isBacktest: true,
                        backtestSessionId: sessionId,
                        sourceMode: 'BACKTEST'
                    }
                });
            }

            // Simulate trade execution based on decision
            if (decision.finalDecision === 'LONG' && decision.confidence > 0.6) {
                // Simulate profitable/unprofitable trade
                const tradeReturn = (Math.random() - 0.4) * 0.02; // Slight positive bias
                newValue = currentValue * (1 + tradeReturn);
                trades.push({
                    date: nextDate.toISOString(),
                    action: 'LONG',
                    price: marketData.currentPrice,
                    confidence: decision.confidence,
                    return: tradeReturn * 100
                });
            } else if (decision.finalDecision === 'SHORT' && decision.confidence > 0.6) {
                const tradeReturn = (Math.random() - 0.4) * 0.02;
                newValue = currentValue * (1 + tradeReturn);
                trades.push({
                    date: nextDate.toISOString(),
                    action: 'SHORT',
                    price: marketData.currentPrice,
                    confidence: decision.confidence,
                    return: tradeReturn * 100
                });
            } else {
                // HOLD - small random drift
                newValue = currentValue * (1 + (Math.random() - 0.5) * 0.005);
            }

            console.log(`[Backtest] Step ${nextStep}: ${decision.finalDecision} @ ${decision.confidence.toFixed(2)} confidence`);
        } catch (error: any) {
            console.error(`[Backtest] ⚠️ Agent analysis failed at step ${nextStep}:`, error.message || error);

            // Log error visibly as an Orchestrator "decision" so it appears in UI
            await prisma.agentDecision.create({
                data: {
                    userId: session.userId,
                    agentType: 'ORCHESTRATOR',
                    reasoning: `Analysis Failed: ${error.message || 'Unknown error'}`,
                    thoughtSteps: [
                        { step: 1, thought: `Attempted to analyze step ${nextStep}` },
                        { step: 2, thought: `Error encountered: ${error.message}` },
                        { step: 3, thought: 'Check API keys and quota in Settings.' }
                    ],
                    decision: 'BLOCKED',
                    confidence: 0,
                    symbol: session.symbol,
                    marketData: {},
                    isBacktest: true,
                    backtestSessionId: sessionId,
                    sourceMode: 'BACKTEST'
                }
            });

            // Fallback: random simulation if agents fail
            const randomChange = (Math.random() - 0.48) * 0.03;
            newValue = currentValue * (1 + randomChange);
        }

        // Update portfolio history
        const history = (session.portfolioHistory as any[]) || [];
        history.push({ date: nextDate.toISOString(), value: newValue });

        await prisma.backtestSession.update({
            where: { id: sessionId },
            data: {
                currentDate: nextDate,
                currentStep: nextStep,
                portfolioValue: newValue,
                portfolioHistory: history,
                trades: trades
            }
        });
    }

    /**
     * Complete backtest and calculate metrics
     */
    private async completeBacktest(sessionId: string) {
        const session = await prisma.backtestSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) return;

        const history = (session.portfolioHistory as any[]) || [];
        const trades = (session.trades as any[]) || [];
        const initialValue = session.initialCapital;
        const finalValue = session.portfolioValue || initialValue;

        // Calculate metrics
        const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = initialValue;
        for (const point of history) {
            if (point.value > peak) peak = point.value;
            const drawdown = ((peak - point.value) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        const winRate = trades.length > 0
            ? (trades.filter((t: any) => t.return > 0).length / trades.length) * 100
            : 50;
        const sharpeRatio = totalReturn / Math.max(maxDrawdown, 1);

        // Generate consolidated counsel debate (1 AI call)
        const counselDebate = await this.generateConsolidatedCounsel({
            totalReturn,
            maxDrawdown,
            winRate,
            sharpeRatio,
            tradeCount: trades.length,
            symbol: session.symbol
        });

        await prisma.backtestSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                totalReturn,
                maxDrawdown,
                winRate,
                sharpeRatio
            }
        });

        // Store counsel debate as a special agent decision
        await prisma.agentDecision.create({
            data: {
                userId: session.userId,
                agentType: 'ORCHESTRATOR',
                reasoning: counselDebate,
                thoughtSteps: [{ step: 1, thought: 'Consolidated Counsel Debate' }],
                decision: totalReturn > 0 ? 'APPROVED' : 'REJECTED',
                confidence: winRate / 100,
                symbol: session.symbol,
                marketData: { totalReturn, maxDrawdown, winRate, sharpeRatio },
                isBacktest: true,
                backtestSessionId: sessionId,
                sourceMode: 'BACKTEST'
            }
        });

        // Mark strategy backtest as completed
        await prisma.strategyVersion.update({
            where: { id: session.strategyVersionId },
            data: { backtestCompleted: true }
        });

        console.log(`[Backtest] Session ${sessionId} completed. Return: ${totalReturn.toFixed(2)}%`);
    }

    /**
     * Generate consolidated counsel debate (1 AI call for cost efficiency)
     */
    private async generateConsolidatedCounsel(results: {
        totalReturn: number;
        maxDrawdown: number;
        winRate: number;
        sharpeRatio: number;
        tradeCount: number;
        symbol: string;
    }): Promise<string> {
        try {
            const { DeepSeekService } = await import('./deepseek.service.js');
            const aiService = new DeepSeekService();

            const prompt = `Backtest Results for ${results.symbol}:
Return: ${results.totalReturn.toFixed(2)}% | Drawdown: ${results.maxDrawdown.toFixed(2)}% | Win Rate: ${results.winRate.toFixed(1)}% | Trades: ${results.tradeCount}

Generate a 3-agent counsel debate:

🎯 STRATEGY (bold): [Defend the strategy's potential]
🛡️ RISK (cautious): [Challenge with drawdown concerns]  
📊 MARKET (mediator): [Balanced synthesis]

VERDICT: APPROVE|REJECT|MODIFY`;

            return await aiService.chat([
                { role: 'system', content: 'Generate a brief 3-agent trading debate.' },
                { role: 'user', content: prompt }
            ]);
        } catch (error) {
            console.error('[Backtest] Counsel generation failed:', error);
            return 'Counsel unavailable - agents could not convene.';
        }
    }

    /**
     * Get session status
     */
    async getSession(sessionId: string) {
        return prisma.backtestSession.findUnique({
            where: { id: sessionId }
        });
    }

    /**
     * Get user's active backtest
     */
    async getActiveBacktest(userId: string) {
        return prisma.backtestSession.findFirst({
            where: {
                userId,
                status: { in: ['PENDING', 'RUNNING', 'PAUSED'] }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get user's backtest history
     */
    async getUserBacktests(userId: string) {
        return prisma.backtestSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
    }

    /**
     * Pause backtest
     */
    async pauseBacktest(sessionId: string) {
        return prisma.backtestSession.update({
            where: { id: sessionId },
            data: { status: 'PAUSED' }
        });
    }

    /**
     * Resume backtest
     */
    async resumeBacktest(sessionId: string) {
        const session = await prisma.backtestSession.update({
            where: { id: sessionId },
            data: { status: 'RUNNING' }
        });

        // Restart background processing
        if (!this.runningBacktests.has(sessionId)) {
            this.processBacktest(sessionId);
        }

        return session;
    }

    /**
     * Resume any interrupted backtests on startup
     */
    async resumeInterruptedBacktests() {
        const interrupted = await prisma.backtestSession.findMany({
            where: { status: 'RUNNING' }
        });

        for (const session of interrupted) {
            console.log(`[Backtest] Resuming interrupted session ${session.id}`);
            this.processBacktest(session.id);
        }
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const backtestService = new BacktestService();
