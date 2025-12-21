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
     * Check if RL service is available
     */
    public async checkRLAvailability(): Promise<boolean> {
        this.rlAvailable = await this.rlService.isAvailable();
        return this.rlAvailable;
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

        // Run AI agents in parallel
        const [strategyDecision, riskAssessment, marketAnalysis] = await Promise.all([
            this.strategyAgent.decide(context),
            this.riskAgent.decide(context),
            this.marketAgent.decide(context),
        ]);

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

        console.log(`[Orchestrator] All agents completed analysis`);

        // Aggregate decisions with RL input
        return this.aggregateDecisions(
            strategyDecision,
            riskAssessment,
            marketAnalysis,
            rlPrediction,
            rlMetrics,
            mode
        );
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
        mode: 'deepseek' | 'rl' | 'hybrid' = 'hybrid'
    ): OrchestratorDecision {
        // Build agent decisions object
        const agentDecisions = {
            strategy: { reasoning: strategy.reasoning },
            risk: { reasoning: risk.reasoning },
            market: { reasoning: market.reasoning },
        };

        // Rule 1: Risk Officer has veto power (always respected)
        if (!risk.approved) {
            return {
                finalDecision: 'BLOCKED',
                confidence: risk.confidence,
                agentConsensus: false,
                strategyDecision: strategy,
                riskAssessment: risk,
                marketAnalysis: market,
                executionReady: false,
                readyToExecute: false,
                blockReason: `Risk Officer blocked: ${risk.warnings.join(', ') || 'Risk too high'}`,
                agentDecisions,
                rlPrediction,
                rlMetrics,
                strategyMode: mode,
            };
        }

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
            risk.riskLevel !== 'EXTREME';

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
            stopLoss: strategy.stopLoss,
            takeProfit: strategy.takeProfit,
            positionSize: risk.positionSize,
            agentDecisions,
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
}

export default AgentOrchestrator;

