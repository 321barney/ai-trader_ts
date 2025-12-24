/**
 * Agent Orchestrator
 * 
 * Coordinates all AI agents and aggregates their decisions.
 * Integrates with RL service for hybrid decision making.
 * Determines final trading action based on consensus or priority rules.
 */

import { AgentType } from '@prisma/client';
import BaseAgent, { AgentContext, AgentDecisionResult } from './base-agent.js';
import { StrategyConsultantAgent, StrategyDecision } from './strategy-consultant.js';
import { RiskOfficerAgent, RiskAssessment } from './risk-officer.js';
import { MarketAnalystAgent, MarketAnalysis } from './market-analyst.js';
import { RLService, RLPrediction, RLMetrics, RLParams } from '../services/rl.service.js';
import { prisma } from '../utils/prisma.js';
import { OpenAIService } from '../services/openai.service.js';
import { ClaudeService } from '../services/claude.service.js';
import { GeminiService } from '../services/gemini.service.js';
import { DeepSeekService } from '../services/deepseek.service.js';
import { IAiService } from '../services/ai-service.interface.js';
import { modelService } from '../services/model.service.js';

// Counsel deliberation result
export interface CounselResult {
    deliberation: string;  // Full deliberation text
    votes: {
        strategy: string;
        risk: string;
        market: string;
    };
    consensus: boolean;
    finalVerdict: 'LONG' | 'SHORT' | 'HOLD';
    escalated: boolean;    // Should be escalated to human review
    escalationReason?: string;
}

export interface OrchestratorDecision {
    finalDecision: 'LONG' | 'SHORT' | 'HOLD' | 'BLOCKED';
    confidence: number;
    agentConsensus: boolean;
    strategyDecision: StrategyDecision;
    riskAssessment: RiskAssessment;
    marketAnalysis: MarketAnalysis;
    executionReady: boolean;
    readyToExecute: boolean;
    blockReason?: string;

    // Trading parameters from Strategy Consultant
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;

    // Agent decisions for easy access
    agentDecisions: {
        strategy: { reasoning: string };
        risk: { reasoning: string };
        market: { reasoning: string };
    };

    // Counsel deliberation result
    counsel?: CounselResult;

    // RL Model integration
    rlPrediction?: RLPrediction;
    rlMetrics?: RLMetrics;
    strategyMode: 'deepseek' | 'rl' | 'hybrid';
}

export class AgentOrchestrator {
    private strategyAgent: StrategyConsultantAgent;
    private riskAgent: RiskOfficerAgent;
    private marketAgent: MarketAnalystAgent;
    private rlService: RLService;
    private rlAvailable: boolean = false;

    constructor() {
        this.strategyAgent = new StrategyConsultantAgent();
        this.riskAgent = new RiskOfficerAgent();
        this.marketAgent = new MarketAnalystAgent();
        this.rlService = new RLService();
    }

    /**
     * Factory method to get the correct AI/LLM service based on config
     */
    private getAiService(modelConfig: string, user: any): IAiService {
        switch (modelConfig.toLowerCase()) {
            case 'openai':
                return new OpenAIService(user?.openaiApiKey || undefined);
            case 'anthropic':
            case 'claude':
                return new ClaudeService(user?.anthropicApiKey || undefined);
            case 'gemini':
            case 'google':
                return new GeminiService(user?.geminiApiKey || undefined);
            case 'deepseek':
            default:
                return new DeepSeekService(user?.deepseekApiKey || undefined);
        }
    }

    /**
     * Check if RL service is available
     */
    public async checkRLAvailability(): Promise<boolean> {
        this.rlAvailable = await this.rlService.isAvailable();
        return this.rlAvailable;
    }

    /**
     * Generate performance-based hints for prompt optimization
     * Analyzes recent trading outcomes and adjusts agent behavior dynamically
     */
    private async generatePerformanceHints(userId: string, methodology?: string): Promise<AgentContext['performanceHints']> {
        try {
            // Fetch recent signals (last 30 days, non-backtest)
            const recentSignals = await prisma.signal.findMany({
                where: {
                    userId,
                    isBacktest: false,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            if (recentSignals.length < 5) {
                // Not enough data for optimization
                return {
                    winRate: 50,
                    recentStreak: 'neutral',
                    streakCount: 0,
                    suggestedAdjustments: ['Insufficient trading history - using default strategy parameters.']
                };
            }

            // Calculate win rate (signals that reached TP vs SL)
            const executedSignals = recentSignals.filter(s => s.status === 'HIT_TP' || s.status === 'HIT_SL');
            const wins = executedSignals.filter(s => s.status === 'HIT_TP').length;
            const winRate = executedSignals.length > 0 ? (wins / executedSignals.length) * 100 : 50;

            // Detect recent streak
            let streak: 'winning' | 'losing' | 'neutral' = 'neutral';
            let streakCount = 0;
            for (const signal of executedSignals.slice(0, 10)) {
                if (streakCount === 0) {
                    streak = signal.status === 'HIT_TP' ? 'winning' : 'losing';
                    streakCount = 1;
                } else if ((streak === 'winning' && signal.status === 'HIT_TP') ||
                    (streak === 'losing' && signal.status === 'HIT_SL')) {
                    streakCount++;
                } else {
                    break;
                }
            }

            // Analyze methodology effectiveness
            const methodSignals = recentSignals.filter(s => s.methodology === methodology);
            const methodWins = methodSignals.filter(s => s.status === 'HIT_TP').length;
            const methodTotal = methodSignals.filter(s => s.status === 'HIT_TP' || s.status === 'HIT_SL').length;
            const methodologyEffectiveness = methodTotal > 0 ? (methodWins / methodTotal) * 100 : 50;

            // Generate dynamic adjustments based on performance
            const suggestedAdjustments: string[] = [];
            const avoidPatterns: string[] = [];
            const preferPatterns: string[] = [];

            // Win rate based adjustments
            if (winRate < 40) {
                suggestedAdjustments.push('CAUTION: Low win rate detected. Be more selective with entries.');
                suggestedAdjustments.push('Consider waiting for stronger confirmations before entering trades.');
                suggestedAdjustments.push('Reduce position sizes until win rate improves.');
            } else if (winRate > 60) {
                suggestedAdjustments.push('MOMENTUM: Strong win rate. Current approach is working well.');
                preferPatterns.push('Continue using current strategy parameters.');
            }

            // Streak based adjustments
            if (streak === 'losing' && streakCount >= 3) {
                suggestedAdjustments.push(`WARNING: ${streakCount} consecutive losses. Consider reducing risk.`);
                suggestedAdjustments.push('Wait for high-probability setups only.');
                suggestedAdjustments.push('Avoid forcing trades - let the market come to you.');
            } else if (streak === 'winning' && streakCount >= 3) {
                suggestedAdjustments.push(`MOMENTUM: ${streakCount} consecutive wins. Stay disciplined.`);
                suggestedAdjustments.push('Do not become overconfident - maintain risk management.');
            }

            // Methodology specific adjustments
            if (methodology === 'SMC' && methodologyEffectiveness < 45) {
                suggestedAdjustments.push('SMC patterns underperforming. Focus on fresh order blocks only.');
                avoidPatterns.push('Avoid trading into previously tested order blocks');
            } else if (methodology === 'ICT' && methodologyEffectiveness < 45) {
                suggestedAdjustments.push('ICT setups underperforming. Trade only during active kill zones.');
                avoidPatterns.push('Avoid trades outside London/NY sessions');
            } else if (methodology === 'GANN' && methodologyEffectiveness < 45) {
                suggestedAdjustments.push('Gann levels underperforming. Wait for price to confirm angle breaks.');
            }

            console.log(`[Orchestrator] Performance hints generated: WinRate=${winRate.toFixed(1)}%, Streak=${streak}(${streakCount}), MethodEffect=${methodologyEffectiveness.toFixed(1)}%`);

            return {
                winRate,
                recentStreak: streak,
                streakCount,
                methodologyEffectiveness,
                suggestedAdjustments,
                avoidPatterns,
                preferPatterns
            };
        } catch (error) {
            console.error('[Orchestrator] Failed to generate performance hints:', error);
            return { suggestedAdjustments: ['Performance analysis unavailable.'] };
        }
    }

    /**
     * Run all agents and aggregate their decisions
     * With optional RL integration in hybrid mode
     */
    public async analyzeAndDecide(
        context: AgentContext,
        mode: 'deepseek' | 'rl' | 'hybrid' = 'hybrid'
    ): Promise<OrchestratorDecision> {
        console.log(`[Orchestrator] Starting analysis for ${context.symbol} in ${mode} mode...`);

        // Check RL availability if needed
        if (mode !== 'deepseek') {
            await this.checkRLAvailability();
        }

        // Fetch user config for AI models
        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            select: {
                deepseekApiKey: true,
                openaiApiKey: true,
                anthropicApiKey: true,
                geminiApiKey: true,
                marketAnalystModel: true,
                riskOfficerModel: true,
                strategyConsultantModel: true
            }
        });

        // Determine services for each agent
        const marketService = this.getAiService(user?.marketAnalystModel || 'deepseek', user);
        const riskService = this.getAiService(user?.riskOfficerModel || 'deepseek', user);
        const strategyService = this.getAiService(user?.strategyConsultantModel || 'deepseek', user);

        // Generate performance-based prompt hints for dynamic optimization
        const performanceHints = await this.generatePerformanceHints(context.userId, context.methodology);

        // Enhance context with performance hints for prompt fine-tuning
        const enhancedContext = {
            ...context,
            performanceHints
        };

        // Run AI agents in parallel with injected services and performance hints
        const [strategyDecision, riskAssessment, marketAnalysis] = await Promise.all([
            this.strategyAgent.decide({ ...enhancedContext, aiService: strategyService }),
            this.riskAgent.decide({ ...enhancedContext, aiService: riskService }),
            this.marketAgent.decide({ ...enhancedContext, aiService: marketService }),
        ]);

        // console.log(`[Orchestrator] Raw Agent Outputs:
        // Strategy: ${strategyDecision.decision} (${strategyDecision.confidence})
        // Risk: ${riskAssessment.decision} (${(riskAssessment as RiskAssessment).riskLevel})
        // Market: ${(marketAnalysis as MarketAnalysis).sentiment}`);

        // Get RL prediction if available and not in deepseek-only mode
        let rlPrediction: RLPrediction | undefined;
        let rlMetrics: RLMetrics | undefined;

        if (mode !== 'deepseek' && this.rlAvailable) {
            try {
                // Build feature vector from market data
                const features = this.buildFeatureVector(context);
                rlPrediction = await this.rlService.predict(context.symbol || 'BTCUSDT', features);
                rlMetrics = await this.rlService.getMetrics();
                console.log(`[Orchestrator] RL prediction: ${rlPrediction.action} (${rlPrediction.confidence})`);
            } catch (error) {
                console.error('[Orchestrator] RL prediction failed:', error);
            }
        }

        console.log(`[Orchestrator] All agents completed initial analysis`);

        // ============ COUNSEL DELIBERATION PHASE ============
        // The 3 agents now deliberate together to reach consensus
        const counselResult = await this.conductCounsel(
            strategyDecision,
            riskAssessment,
            marketAnalysis,
            enhancedContext,
            strategyService
        );

        console.log(`[Orchestrator] Counsel deliberation complete: ${counselResult.finalVerdict}`);

        // Aggregate decisions with counsel result and RL input
        return this.aggregateDecisions(
            strategyDecision,
            riskAssessment,
            marketAnalysis,
            rlPrediction,
            rlMetrics,
            mode,
            counselResult
        );
    }

    /**
     * Conduct a counsel deliberation among the 3 agents
     * Each agent reviews others' opinions and they vote to reach consensus
     */
    private async conductCounsel(
        strategyDecision: AgentDecisionResult,
        riskAssessment: AgentDecisionResult,
        marketAnalysis: AgentDecisionResult,
        context: AgentContext,
        aiService: IAiService
    ): Promise<CounselResult> {
        console.log('[Counsel] Starting deliberation phase...');

        // Collect initial votes
        const initialVotes = {
            strategy: strategyDecision.decision,
            risk: riskAssessment.decision === 'APPROVED' ? strategyDecision.decision : 'HOLD',
            market: this.extractMarketVote(marketAnalysis)
        };

        // Check for unanimous agreement
        const votes = [initialVotes.strategy, initialVotes.risk, initialVotes.market];
        const longVotes = votes.filter(v => v === 'LONG').length;
        const shortVotes = votes.filter(v => v === 'SHORT').length;
        const holdVotes = votes.filter(v => v === 'HOLD' || v === 'BLOCKED').length;

        // If unanimous, no deliberation needed
        if (longVotes === 3 || shortVotes === 3) {
            return {
                deliberation: 'Unanimous agreement - no deliberation needed.',
                votes: initialVotes,
                consensus: true,
                finalVerdict: longVotes === 3 ? 'LONG' : 'SHORT',
                escalated: false
            };
        }

        // Need deliberation - agents discuss disagreements
        const deliberationPrompt = `
=== AGENT COUNSEL DELIBERATION ===
You are facilitating a counsel meeting among 3 AI trading agents.
They must reach consensus on whether to take a trade.

INITIAL POSITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STRATEGY CONSULTANT votes: ${initialVotes.strategy}
Reasoning: ${strategyDecision.reasoning.substring(0, 500)}...

🛡️ RISK OFFICER votes: ${initialVotes.risk}
Reasoning: ${riskAssessment.reasoning.substring(0, 500)}...

📈 MARKET ANALYST votes: ${initialVotes.market}
Reasoning: ${marketAnalysis.reasoning.substring(0, 500)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT VOTE COUNT:
- LONG: ${longVotes}/3
- SHORT: ${shortVotes}/3
- HOLD: ${holdVotes}/3

DELIBERATION RULES:
1. Majority (2/3) is required to take a trade
2. Risk Officer has VETO power if risk is too high
3. If no consensus, default to HOLD
4. Consider the strength of each agent's conviction (confidence scores)

CONFIDENCE SCORES:
- Strategy: ${strategyDecision.confidence}
- Risk: ${riskAssessment.confidence}
- Market: ${marketAnalysis.confidence}

Analyze the disagreement and provide:
3. FINAL COUNSEL VERDICT: [LONG|SHORT|HOLD]
4. Should this be ESCALATED for human review? [YES|NO]
5. Brief explanation of the final decision

IMPORTANT: You are the HEAD TRADER. You have the authority to OVERRIDE the Risk Officer if the Strategy/Market arguments are compelling and the risk is managed (not EXTREME).
If Risk Officer says "High Risk", you can still Approve if you simply reduce the position size (suggest that in reason).
Do not just default to HOLD. If there is an edge, TAKE IT, but safe.

Format your response:
DELIBERATION: [Your analysis of the discussion]
FINAL_VERDICT: [LONG|SHORT|HOLD]
ESCALATE: [YES|NO]
REASON: [Why this decision was reached]`;

        try {
            const deliberation = await aiService.chat([
                { role: 'system', content: 'You are a senior trading counsel facilitator. Your job is to help AI agents reach consensus on trading decisions.' },
                { role: 'user', content: deliberationPrompt }
            ]);

            // Parse the deliberation result
            const verdictMatch = deliberation.match(/FINAL_VERDICT:\s*(LONG|SHORT|HOLD)/i);
            const escalateMatch = deliberation.match(/ESCALATE:\s*(YES|NO)/i);
            const reasonMatch = deliberation.match(/REASON:\s*(.+?)(?:\n|$)/i);

            const finalVerdict = verdictMatch ? verdictMatch[1].toUpperCase() :
                (longVotes >= 2 ? 'LONG' : shortVotes >= 2 ? 'SHORT' : 'HOLD');

            console.log(`[Counsel] Deliberation complete.Verdict: ${finalVerdict} `);

            return {
                deliberation: deliberation,
                votes: initialVotes,
                consensus: longVotes >= 2 || shortVotes >= 2 || holdVotes >= 2,
                finalVerdict: finalVerdict as 'LONG' | 'SHORT' | 'HOLD',
                escalated: escalateMatch ? escalateMatch[1].toUpperCase() === 'YES' : false,
                escalationReason: reasonMatch ? reasonMatch[1] : undefined
            };
        } catch (error) {
            console.error('[Counsel] Deliberation failed:', error);
            // Fallback to majority vote
            return {
                deliberation: 'Deliberation failed - using majority vote.',
                votes: initialVotes,
                consensus: false,
                finalVerdict: longVotes >= 2 ? 'LONG' : shortVotes >= 2 ? 'SHORT' : 'HOLD',
                escalated: true,
                escalationReason: 'Deliberation system error - human review recommended'
            };
        }
    }

    /**
     * Extract market analyst's implied vote from their sentiment
     */
    private extractMarketVote(marketAnalysis: AgentDecisionResult): string {
        const reasoning = marketAnalysis.reasoning.toLowerCase();
        if (reasoning.includes('bullish') || reasoning.includes('positive sentiment')) {
            return 'LONG';
        } else if (reasoning.includes('bearish') || reasoning.includes('negative sentiment')) {
            return 'SHORT';
        }
        return 'HOLD';
    }

    /**
     * Build feature vector for RL model from market data
     */
    private buildFeatureVector(context: AgentContext): number[] {
        const md = context.marketData || {};
        return [
            md.currentPrice || 0,
            md.change24h || 0,
            md.rsi || 50,
            md.macd?.histogram || 0,
            md.ema20 || 0,
            md.ema50 || 0,
            md.atr || 0,
            md.volume || 0,
            // Normalize between 0 and 1 where possible
        ].map(v => typeof v === 'number' ? v : 0);
    }

    /**
     * Aggregate agent decisions using priority rules
     * Now includes RL model input for hybrid decision making
     */
    private aggregateDecisions(
        strategy: StrategyDecision,
        risk: RiskAssessment,
        market: MarketAnalysis,
        rlPrediction?: RLPrediction,
        rlMetrics?: RLMetrics,
        mode: 'deepseek' | 'rl' | 'hybrid' = 'hybrid',
        counsel?: CounselResult
    ): OrchestratorDecision {
        // Build agent decisions object
        const agentDecisions = {
            strategy: { reasoning: strategy.reasoning },
            risk: { reasoning: risk.reasoning },
            market: { reasoning: market.reasoning },
        };

        // Rule 1: Risk Officer VETO Override Logic
        // OLD: Risk Veto always blocks.
        // NEW: Only block on EXTREME risk. If HIGH/MEDIUM and not approved, let Counsel decide but reduce confidence.
        // NEW: Only block on EXTREME risk. If HIGH/MEDIUM and not approved, let Counsel decide but reduce confidence.
        if ((risk.riskLevel as string) === 'EXTREME') {
            return {
                finalDecision: 'BLOCKED',
                confidence: risk.confidence,
                agentConsensus: false,
                strategyDecision: strategy,
                riskAssessment: risk,
                marketAnalysis: market,
                executionReady: false,
                readyToExecute: false,
                blockReason: `Risk Officer blocked: EXTREME RISK DETECTED - ${risk.warnings.join(', ') || 'Safety protocols triggered'} `,
                agentDecisions,
                counsel,
                rlPrediction,
                rlMetrics,
                strategyMode: mode,
            };
        }

        // ============ USE COUNSEL VERDICT IF AVAILABLE ============
        if (counsel) {
            console.log(`[Aggregator] Using counsel verdict: ${counsel.finalVerdict} `);

            // If escalated, default to HOLD and flag for human review
            if (counsel.escalated) {
                return {
                    finalDecision: 'HOLD',
                    confidence: 0.5,
                    agentConsensus: false,
                    strategyDecision: strategy,
                    riskAssessment: risk,
                    marketAnalysis: market,
                    executionReady: false,
                    readyToExecute: false,
                    blockReason: `Escalated for human review: ${counsel.escalationReason || 'Agents could not reach confident consensus'} `,
                    agentDecisions,
                    counsel,
                    rlPrediction,
                    rlMetrics,
                    strategyMode: mode,
                };
            }

            // Use counsel verdict as the final decision
            const counselDecision = counsel.finalVerdict;
            const counselConfidence = counsel.consensus ? 0.85 : 0.7;

            // Still check for execution readiness
            const executionReady =
                counselDecision !== 'HOLD' &&
                counselConfidence > 0.6 &&
                (risk.riskLevel as string) !== 'EXTREME';

            return {
                finalDecision: counselDecision,
                confidence: counselConfidence,
                agentConsensus: counsel.consensus,
                strategyDecision: strategy,
                riskAssessment: risk,
                marketAnalysis: market,
                executionReady,
                readyToExecute: executionReady,
                entryPrice: strategy.entryPrice,
                // PRIORITIZE RISK OFFICER'S TP/SL
                stopLoss: risk.suggestedStopLoss || strategy.stopLoss,
                takeProfit: risk.suggestedTakeProfit || strategy.takeProfit,
                positionSize: risk.positionSize,
                agentDecisions,
                counsel,
                rlPrediction,
                rlMetrics,
                strategyMode: mode,
            };
        }

        // ============ FALLBACK: Traditional aggregation (if no counsel) ============
        // Determine base decision based on mode
        let baseDecision: 'LONG' | 'SHORT' | 'HOLD';
        let baseConfidence: number;

        if (mode === 'rl' && rlPrediction) {
            // Pure RL mode - use RL prediction
            baseDecision = rlPrediction.action;
            baseConfidence = rlPrediction.confidence;
        } else if (mode === 'hybrid' && rlPrediction) {
            // Hybrid mode - combine DeepSeek and RL
            const deepSeekDecision = strategy.decision as 'LONG' | 'SHORT' | 'HOLD';
            const rlDecision = rlPrediction.action;

            if (deepSeekDecision === rlDecision) {
                // Both agree - high confidence
                baseDecision = deepSeekDecision;
                baseConfidence = (strategy.confidence + rlPrediction.confidence) / 2 * 1.1; // Bonus for consensus
            } else if (deepSeekDecision === 'HOLD' || rlDecision === 'HOLD') {
                // One says HOLD - be conservative
                baseDecision = 'HOLD';
                baseConfidence = Math.min(strategy.confidence, rlPrediction.confidence);
            } else {
                // Conflict - weight by confidence
                if (strategy.confidence > rlPrediction.confidence) {
                    baseDecision = deepSeekDecision;
                    baseConfidence = strategy.confidence * 0.8; // Reduce confidence due to conflict
                } else {
                    baseDecision = rlDecision;
                    baseConfidence = rlPrediction.confidence * 0.8;
                }
            }
        } else {
            // DeepSeek only mode
            baseDecision = strategy.decision as 'LONG' | 'SHORT' | 'HOLD';
            baseConfidence = strategy.confidence;
        }

        // Rule 2: Check for consensus with Market sentiment
        const marketDirection = market.sentiment === 'BULLISH' ? 'LONG'
            : market.sentiment === 'BEARISH' ? 'SHORT'
                : 'HOLD';

        const hasConsensus = baseDecision === marketDirection ||
            baseDecision === 'HOLD' ||
            marketDirection === 'HOLD';

        // Rule 3: Calculate final combined confidence
        const combinedConfidence = hasConsensus
            ? Math.min(1, baseConfidence * 0.7 + risk.confidence * 0.2 + Math.abs(market.sentimentScore) * 0.1)
            : baseConfidence * 0.6; // Reduce if no market consensus

        // Rule 4: Determine final decision
        let finalDecision: 'LONG' | 'SHORT' | 'HOLD' | 'BLOCKED';

        if (!hasConsensus && combinedConfidence < 0.6) {
            finalDecision = 'HOLD';
        } else {
            finalDecision = baseDecision;
        }

        // Rule 5: Determine if ready for execution
        const executionReady =
            finalDecision !== 'HOLD' &&
            combinedConfidence > 0.6 &&
            (risk.riskLevel as string) !== 'EXTREME';

        return {
            finalDecision,
            confidence: combinedConfidence,
            agentConsensus: hasConsensus,
            strategyDecision: strategy,
            riskAssessment: risk,
            marketAnalysis: market,
            executionReady,
            readyToExecute: executionReady,
            entryPrice: strategy.entryPrice,
            // PRIORITIZE RISK OFFICER'S TP/SL
            stopLoss: risk.suggestedStopLoss || strategy.stopLoss,
            takeProfit: risk.suggestedTakeProfit || strategy.takeProfit,
            // positionSize: risk.positionSize, // Already used below
            positionSize: risk.positionSize,
            agentDecisions,
            counsel,
            rlPrediction,
            rlMetrics,
            strategyMode: mode,
        };
    }

    // ============================================
    // RL Service Control Methods
    // ============================================

    /**
     * Get RL model metrics
     */
    public async getRLMetrics(): Promise<RLMetrics> {
        return this.rlService.getMetrics();
    }

    /**
     * Get RL training status
     */
    public async getRLTrainingStatus() {
        return this.rlService.getTrainingStatus();
    }

    /**
     * Modify RL model parameters (called by Strategy Consultant)
     */
    public async modifyRLParams(params: RLParams): Promise<boolean> {
        console.log('[Orchestrator] Modifying RL parameters:', params);
        return this.rlService.modifyParams(params);
    }

    /**
     * Start RL model training
     */
    public async startRLTraining(config?: {
        symbols?: string[];
        timesteps?: number;
        algorithm?: string;
    }): Promise<{ jobId: string } | null> {
        console.log('[Orchestrator] Starting RL training:', config);
        return this.rlService.startTraining(config);
    }

    /**
     * Stop RL model training
     */
    public async stopRLTraining(reason?: string): Promise<boolean> {
        console.log('[Orchestrator] Stopping RL training:', reason);
        return this.rlService.stopTraining(reason);
    }

    /**
     * Get RL prediction directly
     */
    public async getRLPrediction(symbol: string, features: number[]): Promise<RLPrediction> {
        return this.rlService.predict(symbol, features);
    }

    // ============================================
    // Agent Access Methods
    // ============================================

    public getStrategyAgent(): StrategyConsultantAgent {
        return this.strategyAgent;
    }

    public getRiskAgent(): RiskOfficerAgent {
        return this.riskAgent;
    }

    public getMarketAgent(): MarketAnalystAgent {
        return this.marketAgent;
    }

    public getRLService(): RLService {
        return this.rlService;
    }

    public isRLAvailable(): boolean {
        return this.rlAvailable;
    }

    /**
     * Quick analysis using only the specified agents
     */
    public async quickAnalysis(
        context: AgentContext,
        agents: ('strategy' | 'risk' | 'market')[],
        includeRL: boolean = false
    ): Promise<Partial<OrchestratorDecision>> {
        const results: Partial<OrchestratorDecision> = {};

        const promises: Promise<void>[] = agents.map(async (agent) => {
            switch (agent) {
                case 'strategy':
                    results.strategyDecision = await this.strategyAgent.decide(context);
                    break;
                case 'risk':
                    results.riskAssessment = await this.riskAgent.decide(context);
                    break;
                case 'market':
                    results.marketAnalysis = await this.marketAgent.decide(context);
                    break;
            }
        });

        if (includeRL) {
            promises.push(
                this.rlService.predict(context.symbol || 'BTCUSDT', this.buildFeatureVector(context))
                    .then(pred => { results.rlPrediction = pred; })
            );
        }

        await Promise.all(promises);
        return results;
    }

    // ============================================
    // COST-EFFICIENT MODEL-BASED EXECUTION
    // ============================================

    /**
     * Run analysis with 4-hour market analysis caching
     * Market Analyst is only called if cache is expired (>4h)
     */
    public async analyzeWithCaching(
        context: AgentContext,
        mode: 'deepseek' | 'rl' | 'hybrid' = 'hybrid'
    ): Promise<OrchestratorDecision> {
        console.log(`[Orchestrator] Checking market analysis cache...`);

        // Check for cached market analysis
        const cachedAnalysis = await modelService.getCachedMarketAnalysis(context.userId);

        if (cachedAnalysis) {
            console.log(`[Orchestrator] Using cached market analysis(<4 hours old)`);

            // Run only Strategy and Risk agents
            const user = await prisma.user.findUnique({
                where: { id: context.userId },
                select: {
                    deepseekApiKey: true,
                    openaiApiKey: true,
                    anthropicApiKey: true,
                    geminiApiKey: true,
                    riskOfficerModel: true,
                    strategyConsultantModel: true
                }
            });

            const riskService = this.getAiService(user?.riskOfficerModel || 'deepseek', user);
            const strategyService = this.getAiService(user?.strategyConsultantModel || 'deepseek', user);
            const performanceHints = await this.generatePerformanceHints(context.userId, context.methodology);

            const enhancedContext = { ...context, performanceHints };

            const [strategyDecision, riskAssessment] = await Promise.all([
                this.strategyAgent.decide({ ...enhancedContext, aiService: strategyService }),
                this.riskAgent.decide({ ...enhancedContext, aiService: riskService })
            ]);

            // Use cached market analysis
            const marketAnalysis = cachedAnalysis as any;

            // Conduct counsel with cached data
            const counselResult = await this.conductCounsel(
                strategyDecision,
                riskAssessment,
                marketAnalysis,
                enhancedContext,
                strategyService
            );

            return this.aggregateDecisions(
                strategyDecision,
                riskAssessment,
                marketAnalysis,
                undefined,
                undefined,
                mode,
                counselResult
            );
        }

        // Cache expired or not available - run full analysis
        console.log(`[Orchestrator] Cache expired, running full analysis`);
        const result = await this.analyzeAndDecide(context, mode);

        // Cache the market analysis for next 4 hours
        if (result.marketAnalysis) {
            await modelService.cacheMarketAnalysis(context.userId, result.marketAnalysis);
        }

        return result;
    }

    /**
     * Execute trading decision using active TradingModel
     * Fast execution without AI calls when model is available
     */
    public async executeWithActiveModel(
        userId: string,
        symbol: string,
        marketData: any
    ): Promise<{ decision: 'LONG' | 'SHORT' | 'HOLD'; confidence: number; reason: string } | null> {
        const activeModel = await modelService.getActiveModel(userId);

        if (!activeModel) {
            console.log(`[Orchestrator] No active model for user ${userId}`);
            return null;
        }

        // Check if model is expired
        if (activeModel.expiresAt && new Date() > activeModel.expiresAt) {
            console.log(`[Orchestrator] Active model expired, needs refresh`);
            return null;
        }

        // Apply model rules to current market data
        const params = activeModel.parameters as any;
        console.log(`[Orchestrator] Using model v${activeModel.version} (${activeModel.methodology})`);

        // Simple rule-based decision from model parameters
        // This is a placeholder - actual implementation would apply the learned rules
        const decision = this.applyModelRules(params, marketData);

        return decision;
    }

    /**
     * Apply model rules to market data for quick decision
     */
    private applyModelRules(
        params: any,
        marketData: any
    ): { decision: 'LONG' | 'SHORT' | 'HOLD'; confidence: number; reason: string } {
        // Basic implementation - would be enhanced with actual model logic
        const rsi = marketData?.rsi || 50;
        const trend = marketData?.change24h || 0;

        if (rsi < 30 && trend > 0) {
            return { decision: 'LONG', confidence: 0.7, reason: 'RSI oversold with positive trend' };
        } else if (rsi > 70 && trend < 0) {
            return { decision: 'SHORT', confidence: 0.7, reason: 'RSI overbought with negative trend' };
        }

        return { decision: 'HOLD', confidence: 0.5, reason: 'No clear signal from model' };
    }

    /**
     * Check drawdown and trigger model retrain if > 15%
     */
    public async checkAndUpdateDrawdown(
        userId: string,
        currentPortfolioValue: number,
        peakPortfolioValue: number
    ): Promise<boolean> {
        const activeModel = await modelService.getActiveModel(userId);
        if (!activeModel) return false;

        const drawdown = ((peakPortfolioValue - currentPortfolioValue) / peakPortfolioValue) * 100;

        console.log(`[Orchestrator] Current drawdown: ${drawdown.toFixed(2)}% `);

        const retrainTriggered = await modelService.updateDrawdown(activeModel.id, drawdown);

        if (retrainTriggered) {
            console.log(`[Orchestrator] 15 % drawdown threshold hit.Model marked for retraining.`);
            // Here you could trigger automatic model regeneration
        }

        return retrainTriggered;
    }
}

export default AgentOrchestrator;
