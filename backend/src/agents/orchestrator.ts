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
import { RLService, RLPrediction, RLMetrics, RLParams, SMCFeatures, VolumeFeatures, EnhancedPredictRequest } from '../services/rl.service.js';
import { prisma } from '../utils/prisma.js';
import { vaultService } from '../services/vault.service.js';
import { OpenAIService } from '../services/openai.service.js';
import { ClaudeService } from '../services/claude.service.js';
import { GeminiService } from '../services/gemini.service.js';
import { DeepSeekService } from '../services/deepseek.service.js';
import { IAiService } from '../services/ai-service.interface.js';
import { modelService } from '../services/model.service.js';
import { newsService, NewsSearchResult } from '../services/news.service.js';

// Counsel deliberation result
export interface CounselResult {
    deliberation: string;  // Full deliberation text
    votes: {
        strategy: string;
        risk: string;
        market: string;  // From TIME CYCLE analyst
        rl?: string;     // From RL model (if available)
    };
    consensus: boolean;
    finalVerdict: 'LONG' | 'SHORT' | 'HOLD';
    escalated: boolean;    // Should be escalated to human review
    escalationReason?: string;
    // Trade levels from council deliberation
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize?: number;
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
        // Fetch user config for AI models
        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            select: {
                // Keys handled via vault
                marketAnalystModel: true,
                riskOfficerModel: true,
                strategyConsultantModel: true
            }
        });

        const deepseekApiKey = await vaultService.getSecret(context.userId, 'deepseek_api_key');
        const openaiApiKey = await vaultService.getSecret(context.userId, 'openai_api_key');
        const anthropicApiKey = await vaultService.getSecret(context.userId, 'anthropic_api_key');
        const geminiApiKey = await vaultService.getSecret(context.userId, 'gemini_api_key');

        const keys = {
            deepseekApiKey,
            openaiApiKey,
            anthropicApiKey,
            geminiApiKey
        };

        // Determine services for each agent
        const marketService = this.getAiService(user?.marketAnalystModel || 'deepseek', keys);
        const riskService = this.getAiService(user?.riskOfficerModel || 'deepseek', keys);
        const strategyService = this.getAiService(user?.strategyConsultantModel || 'deepseek', keys);

        // Generate performance-based prompt hints for dynamic optimization
        const performanceHints = await this.generatePerformanceHints(context.userId, context.methodology);

        // Fetch news for market context
        let newsData: NewsSearchResult | undefined;
        try {
            newsData = await newsService.searchNews(context.symbol || 'BTC');
            console.log(`[Orchestrator] News sentiment: ${newsData.overallSentiment.toFixed(2)}, major events: ${newsData.majorEvents.length}`);
        } catch (error) {
            console.warn('[Orchestrator] News fetch failed:', error);
        }

        // Enhance context with performance hints and news for prompt fine-tuning
        const enhancedContext = {
            ...context,
            performanceHints,
            newsData: newsData ? {
                sentiment: newsData.overallSentiment,
                majorEvents: newsData.majorEvents,
                summary: newsService.formatForAgentContext(newsData)
            } : undefined
        };

        // Run AI agents in parallel with injected services and performance hints
        // WITH RATE LIMIT DETECTION - fallback to 100% RL if APIs are unavailable
        let strategyDecision: StrategyDecision;
        let riskAssessment: RiskAssessment;
        let marketAnalysis: MarketAnalysis;
        let rateLimitHit = false;

        try {
            const results = await Promise.all([
                this.strategyAgent.decide({ ...enhancedContext, aiService: strategyService }),
                this.riskAgent.decide({ ...enhancedContext, aiService: riskService }),
                this.marketAgent.decide({ ...enhancedContext, aiService: marketService }),
            ]);
            strategyDecision = results[0] as StrategyDecision;
            riskAssessment = results[1] as RiskAssessment;
            marketAnalysis = results[2] as MarketAnalysis;
        } catch (agentError: any) {
            // Detect rate limit errors (429, quota exceeded, etc.)
            const errorMsg = agentError?.message?.toLowerCase() || '';
            const isRateLimit =
                errorMsg.includes('rate limit') ||
                errorMsg.includes('429') ||
                errorMsg.includes('quota') ||
                errorMsg.includes('too many requests') ||
                errorMsg.includes('resource exhausted') ||
                errorMsg.includes('rate_limit_exceeded');

            if (isRateLimit) {
                console.warn('[Orchestrator] ⚠️ RATE LIMIT HIT - Switching to 100% RL MODE');
                rateLimitHit = true;
            } else {
                console.warn('[Orchestrator] ⚠️ Agent error - Using RL fallback:', agentError.message);
                rateLimitHit = true; // Treat any agent failure as needing RL fallback
            }

            // Create placeholder decisions for RL-only mode
            strategyDecision = {
                decision: 'HOLD',
                reasoning: 'API rate limit reached - deferring to RL model',
                confidence: 0,
                agentType: 'STRATEGY',
                action: 'HOLD',
                strategyMode: 'rl',
                thoughtSteps: []
            } as unknown as StrategyDecision;

            riskAssessment = {
                decision: 'APPROVED',
                reasoning: 'API rate limit reached - RL mode active',
                confidence: 0,
                agentType: 'RISK',
                riskLevel: 'MEDIUM',
                approved: true,
                suggestedStopLoss: 0,
                suggestedTakeProfit: 0,
                positionSize: 1,
                maxLoss: 0,
                riskRewardRatio: 0,
                warnings: ['Rate limit fallback - using RL model'],
                proceed: true
            } as unknown as RiskAssessment;

            marketAnalysis = {
                decision: 'HOLD',
                reasoning: 'API rate limit reached - RL mode active',
                confidence: 0,
                agentType: 'MARKET_ANALYST',
                sentiment: 0,
                sentimentScore: 0,
                onChainSignals: [],
                newsEvents: [],
                socialSentiment: 0,
                prediction: 'Rate limit active',
                timeframe: '1h',
                marketPhase: 'UNKNOWN'
            } as unknown as MarketAnalysis;
        }

        // If rate limit hit, switch to 100% RL mode
        if (rateLimitHit) {
            console.log('[Orchestrator] 🤖 Running in 100% RL MODE due to rate limits');
            mode = 'rl';
        }

        // Get RL prediction - ALWAYS provide one (external API or local fallback)
        let rlPrediction: RLPrediction | undefined;
        let rlMetrics: RLMetrics | undefined;

        if (mode !== 'deepseek' || rateLimitHit) {
            try {
                if (this.rlAvailable && !rateLimitHit) {
                    // Try external RL service first
                    const enhancedRequest = this.buildEnhancedPredictRequest(context);
                    rlPrediction = await this.rlService.predictEnhanced(enhancedRequest);
                    rlMetrics = await this.rlService.getMetrics() ?? undefined;

                    // Check if we got a mock response (service down)
                    if (rlPrediction.modelVersion === 'mock') {
                        console.log('[Orchestrator] External RL returned mock - using local fallback');
                        rlPrediction = this.getLocalRLInterpretation(enhancedContext);
                    } else {
                        console.log(`[Orchestrator] RL prediction: ${rlPrediction.action} (${rlPrediction.confidence})`);
                    }
                } else {
                    // External RL unavailable OR rate limit hit - use 100% local interpretation
                    console.log('[Orchestrator] Using local RL interpretation (rate limit or external unavailable)');
                    rlPrediction = this.getLocalRLInterpretation(enhancedContext);
                }

                if (rlPrediction?.smcAnalysis) {
                    console.log(`[Orchestrator] RL SMC Analysis: ${rlPrediction.smcAnalysis}`);
                }
            } catch (error) {
                console.warn('[Orchestrator] RL prediction failed, using local fallback:', error);
                rlPrediction = this.getLocalRLInterpretation(enhancedContext);
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
     * Conduct a counsel deliberation among the 3+ agents (includes RL if available)
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

        // Get RL prediction for council - ALWAYS provide one (external or local)
        let rlVote: { vote: string; confidence: number; reasoning: string };
        try {
            const rlPrediction = await this.rlService.getModelPredictionForCouncil(
                this.buildEnhancedPredictRequest(context)
            );
            if (rlPrediction) {
                rlVote = {
                    vote: rlPrediction.vote,
                    confidence: rlPrediction.confidence,
                    reasoning: rlPrediction.reasoning
                };
                console.log(`[Counsel] External RL vote: ${rlVote.vote} (${(rlVote.confidence * 100).toFixed(1)}%)`);
            } else {
                // Use local RL when external unavailable
                const localRL = this.getLocalRLInterpretation(context);
                rlVote = {
                    vote: localRL.action,
                    confidence: localRL.confidence,
                    reasoning: `[Local RL] ${localRL.reasoning}`
                };
                console.log(`[Counsel] Local RL vote: ${rlVote.vote} (${(rlVote.confidence * 100).toFixed(1)}%)`);
            }
        } catch (e) {
            // Fallback to local RL on any error
            const localRL = this.getLocalRLInterpretation(context);
            rlVote = {
                vote: localRL.action,
                confidence: localRL.confidence,
                reasoning: `[Local RL Fallback] ${localRL.reasoning}`
            };
            console.log(`[Counsel] Local RL fallback vote: ${rlVote.vote} (${(rlVote.confidence * 100).toFixed(1)}%)`);
        }

        // Collect initial votes (now ALWAYS including RL - local or external)
        const initialVotes = {
            strategy: strategyDecision.decision,
            risk: riskAssessment.decision === 'APPROVED' ? strategyDecision.decision : 'HOLD',
            market: this.extractMarketVote(marketAnalysis),
            rl: rlVote.vote  // Always have RL vote (local or external)
        };

        // Check for unanimous agreement (4 agents now - includes RL always)
        const humanVotes = [initialVotes.strategy, initialVotes.risk, initialVotes.market];
        const allVotes = [...humanVotes, rlVote.vote];  // RL always included
        const longVotes = allVotes.filter(v => v === 'LONG').length;
        const shortVotes = allVotes.filter(v => v === 'SHORT').length;
        const holdVotes = allVotes.filter(v => v === 'HOLD' || v === 'BLOCKED').length;
        const totalVotes = allVotes.length;

        // If unanimous (all votes agree), no deliberation needed
        if (longVotes === totalVotes || shortVotes === totalVotes) {
            return {
                deliberation: 'Unanimous agreement - no deliberation needed.',
                votes: initialVotes,
                consensus: true,
                finalVerdict: longVotes === totalVotes ? 'LONG' : 'SHORT',
                escalated: false
            };
        }

        // Need deliberation - agents discuss disagreements
        // Cast to access time cycle data
        const marketWithCycles = marketAnalysis as any;
        const timeCycleInfo = marketWithCycles.timeCycles ?
            `Gann Cycles: ${marketWithCycles.timeCycles.cycleBias}, Confluence: ${marketWithCycles.timeCycles.cycleConfluence}` :
            'No cycle data';
        const newsInfo = (context as any).newsData?.summary || 'No news data';

        const deliberationPrompt = `
=== TRADING COUNCIL DELIBERATION ===
You are the HEAD TRADER facilitating a council of 3 AI trading agents.
Your job: Reach consensus and determine the FINAL TRADE with Entry, TP, and SL.

THE COUNCIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STRATEGY CONSULTANT votes: ${initialVotes.strategy}
(SMC/ICT Technical Analysis)
Entry: $${(strategyDecision as any).entryPrice || 'TBD'}
SL: $${(strategyDecision as any).stopLoss || 'TBD'}
TP: $${(strategyDecision as any).takeProfit || 'TBD'}
Reasoning: ${strategyDecision.reasoning.substring(0, 400)}...

🛡️ RISK OFFICER votes: ${initialVotes.risk}
(Risk Management & Position Sizing)
Max Position: ${(riskAssessment as any).positionSize || 'TBD'}%
Suggested SL: $${(riskAssessment as any).suggestedStopLoss || 'TBD'}
Suggested TP: $${(riskAssessment as any).suggestedTakeProfit || 'TBD'}
Reasoning: ${riskAssessment.reasoning.substring(0, 400)}...

🔮 TIME CYCLE ANALYST votes: ${initialVotes.market}
(Gann Cycles, Fibonacci Time, Lunar Phases, Session Analysis)
${timeCycleInfo}
Reasoning: ${marketAnalysis.reasoning.substring(0, 400)}...

📰 NEWS CONTEXT:
${newsInfo}

🤖 RL MODEL ${rlVote ? `votes: ${rlVote.vote}` : '(offline)'}
${rlVote ? `(Reinforcement Learning Quantitative Analysis)
Confidence: ${(rlVote.confidence * 100).toFixed(1)}%
Reasoning: ${rlVote.reasoning.substring(0, 300)}...` : 'RL model not available for this session'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOTE COUNT: LONG=${longVotes} | SHORT=${shortVotes} | HOLD=${holdVotes}${rlVote ? ` (includes RL)` : ''}

CONFIDENCE SCORES:
- Strategy: ${strategyDecision.confidence.toFixed(2)}
- Risk: ${riskAssessment.confidence.toFixed(2)}  
- Market/Cycles: ${marketAnalysis.confidence.toFixed(2)}${rlVote ? `
- RL Model: ${rlVote.confidence.toFixed(2)}` : ''}

DELIBERATION RULES:
1. Time Cycles provide TIMING - if cycles say "turn window", be cautious
2. Strategy provides DIRECTION and LEVELS
3. Risk Officer provides SIZING and PROTECTION
4. 2/3 majority needed for trade, but TIME must align
5. If Time Cycle says HOLD but others say trade - reduce size

YOUR TASK:
Synthesize all inputs and provide a FINAL TRADE DECISION with concrete levels.

REQUIRED OUTPUT FORMAT:
DELIBERATION: [Your synthesis of all three agents' views]
FINAL_VERDICT: [LONG|SHORT|HOLD]
ENTRY: [Exact price or "MARKET"]
STOP_LOSS: [Exact price]
TAKE_PROFIT: [Exact price]
POSITION_SIZE: [% of capital]
ESCALATE: [YES|NO]
REASON: [One-line summary of why this decision]`;

        try {
            const deliberation = await aiService.chat([
                { role: 'system', content: 'You are a senior HEAD TRADER. Synthesize inputs from Strategy, Risk, and Time Cycle analysts to make final trading decisions with exact Entry, SL, and TP levels.' },
                { role: 'user', content: deliberationPrompt }
            ]);

            // Parse the deliberation result
            const verdictMatch = deliberation.match(/FINAL_VERDICT:\s*(LONG|SHORT|HOLD)/i);
            const escalateMatch = deliberation.match(/ESCALATE:\s*(YES|NO)/i);
            const reasonMatch = deliberation.match(/REASON:\s*(.+?)(?:\n|$)/i);

            // Parse trade levels from HEAD TRADER deliberation
            const entryMatch = deliberation.match(/ENTRY:\s*\$?([\d.,]+|MARKET)/i);
            const slMatch = deliberation.match(/STOP_LOSS:\s*\$?([\d.,]+)/i);
            const tpMatch = deliberation.match(/TAKE_PROFIT:\s*\$?([\d.,]+)/i);
            const sizeMatch = deliberation.match(/POSITION_SIZE:\s*([\d.]+)%?/i);

            const finalVerdict = verdictMatch ? verdictMatch[1].toUpperCase() :
                (longVotes >= 2 ? 'LONG' : shortVotes >= 2 ? 'SHORT' : 'HOLD');

            // Parse price values (handle commas in numbers)
            const parsePrice = (match: RegExpMatchArray | null): number | undefined => {
                if (!match || match[1] === 'MARKET') return undefined;
                return parseFloat(match[1].replace(/,/g, ''));
            };

            const counselEntry = parsePrice(entryMatch);
            const counselSL = parsePrice(slMatch);
            const counselTP = parsePrice(tpMatch);
            const counselSize = sizeMatch ? parseFloat(sizeMatch[1]) : undefined;

            console.log(`[Counsel] Deliberation complete. Verdict: ${finalVerdict}`);
            if (counselEntry) console.log(`[Counsel] Trade Levels: Entry=$${counselEntry}, SL=$${counselSL}, TP=$${counselTP}, Size=${counselSize}%`);

            return {
                deliberation: deliberation,
                votes: initialVotes,
                consensus: longVotes >= 2 || shortVotes >= 2 || holdVotes >= 2,
                finalVerdict: finalVerdict as 'LONG' | 'SHORT' | 'HOLD',
                escalated: escalateMatch ? escalateMatch[1].toUpperCase() === 'YES' : false,
                escalationReason: reasonMatch ? reasonMatch[1] : undefined,
                // Trade levels from council
                entry: counselEntry,
                stopLoss: counselSL,
                takeProfit: counselTP,
                positionSize: counselSize,
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
        ].map(v => typeof v === 'number' ? v : 0);
    }

    /**
     * Build ENHANCED prediction request with SMC + Volume features
     * Extracts real Aster market data for RL model enhancement
     */
    private buildEnhancedPredictRequest(context: AgentContext): EnhancedPredictRequest {
        const md = context.marketData || {};

        // Build base feature vector
        const features = this.buildFeatureVector(context);

        // Extract SMC features from market data
        const smc: SMCFeatures = {
            orderBlocks: md.orderBlocks || [],
            fairValueGaps: md.fairValueGaps || [],
            bosDirection: md.breakOfStructure?.direction || md.smcBias || 'NONE',
            oteZone: md.ote || undefined,
            killZone: md.killZone?.zone || 'NONE',
            smcBias: md.smcBias,
        };

        // Extract Volume features
        const volume: VolumeFeatures = {
            volumeRatio: md.indicators?.volumeProfile?.volumeRatio || 1.0,
            avgVolume: md.indicators?.volumeProfile?.avgVolume || 0,
            currentVolume: md.indicators?.volumeProfile?.currentVolume || md.volume || 0,
        };

        console.log(`[Orchestrator] Building enhanced RL request:`);
        console.log(`  SMC: ${smc.orderBlocks.length} OBs, ${smc.fairValueGaps.length} FVGs, BOS=${smc.bosDirection}`);
        console.log(`  Volume: ratio=${volume.volumeRatio}x, current=${volume.currentVolume}`);

        return {
            symbol: context.symbol || 'BTCUSDT',
            features,
            smc,
            volume,
            methodology: context.methodology || 'SMC',
            currentPrice: md.currentPrice,
        };
    }

    // ============================================
    // LOCAL RL INTERPRETATION (No External API)
    // ============================================

    /**
     * LOCAL RL-style trading interpretation
     * Uses SMC + Volume + Technical indicators to generate trading signals
     * 100% local - no external API calls required
     * 
     * This serves as a fallback when the Python RL service is offline,
     * implementing the same RL-inspired decision logic but purely in TypeScript
     */
    public getLocalRLInterpretation(context: AgentContext): RLPrediction {
        const md = context.marketData || {};
        const currentPrice = md.currentPrice || 0;

        console.log('[LocalRL] Starting local RL interpretation (no API)...');

        // ========== STEP 1: Technical Indicator Scores ==========
        let technicalScore = 0;
        let technicalReason = '';

        // RSI Analysis (-1 to +1)
        const rsi = md.rsi || 50;
        if (rsi < 30) {
            technicalScore += 0.3; // Oversold = bullish
            technicalReason += 'RSI oversold. ';
        } else if (rsi > 70) {
            technicalScore -= 0.3; // Overbought = bearish
            technicalReason += 'RSI overbought. ';
        } else if (rsi > 50) {
            technicalScore += 0.1;
        } else {
            technicalScore -= 0.1;
        }

        // MACD Analysis
        const macdHist = typeof md.macd === 'number' ? md.macd : md.macd?.histogram || 0;
        if (macdHist > 0) {
            technicalScore += 0.2;
            technicalReason += 'MACD bullish. ';
        } else if (macdHist < 0) {
            technicalScore -= 0.2;
            technicalReason += 'MACD bearish. ';
        }

        // EMA Crossover
        const ema20 = md.ema20 || currentPrice;
        const ema50 = md.ema50 || currentPrice;
        if (ema20 > ema50 && currentPrice > ema20) {
            technicalScore += 0.25;
            technicalReason += 'Price above EMAs (bullish alignment). ';
        } else if (ema20 < ema50 && currentPrice < ema20) {
            technicalScore -= 0.25;
            technicalReason += 'Price below EMAs (bearish alignment). ';
        }

        // ========== STEP 2: SMC Analysis ==========
        let smcScore = 0;
        let smcReason = '';

        const orderBlocks = md.orderBlocks || [];
        const fvgs = md.fairValueGaps || [];
        const bosDirection = md.breakOfStructure?.direction || md.smcBias || 'NONE';

        // Break of Structure
        if (bosDirection === 'BULLISH') {
            smcScore += 0.35;
            smcReason += 'Bullish BOS confirmed. ';
        } else if (bosDirection === 'BEARISH') {
            smcScore -= 0.35;
            smcReason += 'Bearish BOS confirmed. ';
        }

        // Order Block proximity
        const bullishOBs = orderBlocks.filter((ob: any) => ob.type === 'BULLISH');
        const bearishOBs = orderBlocks.filter((ob: any) => ob.type === 'BEARISH');

        for (const ob of bullishOBs) {
            const distance = (currentPrice - ob.low) / currentPrice;
            if (distance >= 0 && distance < 0.02) {
                smcScore += 0.3 * (ob.strength || 0.5);
                smcReason += `Near bullish OB ($${ob.low?.toFixed(0)}). `;
            }
        }

        for (const ob of bearishOBs) {
            const distance = (ob.high - currentPrice) / currentPrice;
            if (distance >= 0 && distance < 0.02) {
                smcScore -= 0.3 * (ob.strength || 0.5);
                smcReason += `Near bearish OB ($${ob.high?.toFixed(0)}). `;
            }
        }

        // Fair Value Gaps
        for (const fvg of fvgs) {
            if (fvg.type === 'BULLISH' && currentPrice >= fvg.low && currentPrice <= fvg.high) {
                smcScore += 0.2;
                smcReason += 'Inside bullish FVG. ';
            } else if (fvg.type === 'BEARISH' && currentPrice >= fvg.low && currentPrice <= fvg.high) {
                smcScore -= 0.2;
                smcReason += 'Inside bearish FVG. ';
            }
        }

        // Kill Zone bonus
        const killZone = md.killZone?.zone || 'NONE';
        if (killZone === 'LONDON' || killZone === 'NEW_YORK') {
            smcScore *= 1.2; // 20% bonus during active sessions
            smcReason += `${killZone} session active. `;
        }

        // ========== STEP 3: Volume Analysis ==========
        let volumeScore = 0;
        let volumeReason = '';

        const volumeRatio = md.indicators?.volumeProfile?.volumeRatio ||
            (md.volume && md.avgVolume ? md.volume / md.avgVolume : 1);

        if (volumeRatio > 1.5) {
            volumeScore = 0.2; // High volume = confirmation
            volumeReason = `High volume (${volumeRatio.toFixed(1)}x avg). `;
        } else if (volumeRatio > 1.0) {
            volumeScore = 0.1;
            volumeReason = `Above avg volume. `;
        } else if (volumeRatio < 0.5) {
            volumeScore = -0.1; // Low volume = skeptical
            volumeReason = `Low volume (${volumeRatio.toFixed(1)}x avg). `;
        }

        // ========== STEP 4: Combine Scores ==========
        // Weights: Technical 35%, SMC 45%, Volume 20%
        const totalScore = (technicalScore * 0.35) + (smcScore * 0.45) + (volumeScore * 0.20);

        // Determine action and confidence
        let action: 'LONG' | 'SHORT' | 'HOLD';
        let confidence: number;

        if (totalScore > 0.25) {
            action = 'LONG';
            confidence = Math.min(0.95, 0.5 + totalScore);
        } else if (totalScore < -0.25) {
            action = 'SHORT';
            confidence = Math.min(0.95, 0.5 + Math.abs(totalScore));
        } else {
            action = 'HOLD';
            confidence = 0.5 + (0.25 - Math.abs(totalScore));
        }

        // ========== STEP 5: Calculate Trade Levels ==========
        const atr = md.atr || currentPrice * 0.02;
        let entry: number | undefined;
        let stopLoss: number | undefined;
        let takeProfit: number | undefined;
        let riskRewardRatio: number | undefined;

        if (action !== 'HOLD') {
            entry = currentPrice;

            if (action === 'LONG') {
                // Look for support from order blocks or technicals
                const nearestBullishOB = bullishOBs
                    .filter((ob: any) => ob.low < currentPrice)
                    .sort((a: any, b: any) => b.low - a.low)[0];

                stopLoss = nearestBullishOB ?
                    nearestBullishOB.low * 0.998 :
                    currentPrice - (atr * 1.5);

                takeProfit = currentPrice + ((currentPrice - stopLoss!) * (2 + confidence));
            } else {
                // SHORT
                const nearestBearishOB = bearishOBs
                    .filter((ob: any) => ob.high > currentPrice)
                    .sort((a: any, b: any) => a.high - b.high)[0];

                stopLoss = nearestBearishOB ?
                    nearestBearishOB.high * 1.002 :
                    currentPrice + (atr * 1.5);

                takeProfit = currentPrice - ((stopLoss! - currentPrice) * (2 + confidence));
            }

            riskRewardRatio = stopLoss !== undefined && entry !== undefined && takeProfit !== undefined
                ? Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)
                : undefined;
        }

        // Build reasoning summary
        const reasoning = [
            `[LOCAL RL INTERPRETATION - No External API]`,
            `Technical Score: ${(technicalScore * 100).toFixed(0)}% - ${technicalReason || 'Neutral'}`,
            `SMC Score: ${(smcScore * 100).toFixed(0)}% - ${smcReason || 'No clear SMC signals'}`,
            `Volume Score: ${(volumeScore * 100).toFixed(0)}% - ${volumeReason || 'Normal volume'}`,
            `Combined Score: ${(totalScore * 100).toFixed(0)}% → ${action}`,
        ].join(' | ');

        console.log(`[LocalRL] Result: ${action} @ ${(confidence * 100).toFixed(1)}% confidence`);
        console.log(`[LocalRL] ${reasoning}`);

        return {
            action,
            confidence: Math.round(confidence * 10000) / 10000,
            expectedReturn: action !== 'HOLD' ? (confidence - 0.5) * 0.15 : 0,
            modelVersion: 'local-rl-v1.0',
            reasoning,
            smcAnalysis: smcReason || 'No SMC signals',
            volumeAnalysis: volumeReason || 'Normal volume',
            entry,
            stopLoss,
            takeProfit,
            riskRewardRatio,
        };
    }

    /**
     * Get RL prediction - tries external API first, falls back to local interpretation
     */
    public async getRLPredictionWithFallback(context: AgentContext): Promise<RLPrediction> {
        // Try external RL service first
        if (this.rlAvailable) {
            try {
                const enhancedRequest = this.buildEnhancedPredictRequest(context);
                const prediction = await this.rlService.predictEnhanced(enhancedRequest);

                // Check if we got a real prediction (not mock)
                if (prediction.modelVersion !== 'mock') {
                    console.log('[Orchestrator] Using external RL service prediction');
                    return prediction;
                }
            } catch (error) {
                console.warn('[Orchestrator] External RL service failed:', error);
            }
        }

        // Fallback to local RL interpretation
        console.log('[Orchestrator] Falling back to local RL interpretation');
        return this.getLocalRLInterpretation(context);
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

            // PRIORITY: Counsel levels > Risk levels > Strategy levels > RL levels
            const finalEntry = counsel.entry || strategy.entryPrice || (rlPrediction as any)?.entry;
            const finalSL = counsel.stopLoss || risk.suggestedStopLoss || strategy.stopLoss || (rlPrediction as any)?.stopLoss;
            const finalTP = counsel.takeProfit || risk.suggestedTakeProfit || strategy.takeProfit || (rlPrediction as any)?.takeProfit;
            const finalSize = counsel.positionSize || risk.positionSize;

            console.log(`[Aggregator] Final trade: ${counselDecision} Entry=$${finalEntry} SL=$${finalSL} TP=$${finalTP} Size=${finalSize}%`);

            return {
                finalDecision: counselDecision,
                confidence: counselConfidence,
                agentConsensus: counsel.consensus,
                strategyDecision: strategy,
                riskAssessment: risk,
                marketAnalysis: market,
                executionReady,
                readyToExecute: executionReady,
                // Trade levels prioritized from Council deliberation
                entryPrice: finalEntry,
                stopLoss: finalSL,
                takeProfit: finalTP,
                positionSize: finalSize,
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
    public async getRLMetrics(): Promise<RLMetrics | null> {
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
     * Enhanced with methodology-aware logic (SMC, ICT, Gann)
     */
    private applyModelRules(
        params: any,
        marketData: any
    ): { decision: 'LONG' | 'SHORT' | 'HOLD'; confidence: number; reason: string } {
        const methodology = params.methodology || 'SMC';
        const rsi = marketData?.rsi || 50;
        const trend = marketData?.change24h || 0;
        const smcBias = marketData?.smcBias;
        const killZone = marketData?.killZone?.zone;
        const orderBlocks = marketData?.orderBlocks || [];
        const fvgs = marketData?.fairValueGaps || [];

        // Kill zone timing bonus (London/NY sessions are high-volume)
        const inKillZone = killZone && ['LONDON', 'NEW_YORK'].includes(killZone);
        const killZoneBonus = inKillZone ? 0.1 : 0;

        // ========== SMC-based signals ==========
        if (methodology === 'SMC' && smcBias) {
            // Bullish SMC setup: bullish bias + oversold + near bullish order block
            const hasBullishOB = orderBlocks.some((ob: any) => ob.type === 'BULLISH');
            const hasBearishOB = orderBlocks.some((ob: any) => ob.type === 'BEARISH');

            if (smcBias === 'BULLISH' && rsi < 40 && hasBullishOB) {
                return {
                    decision: 'LONG',
                    confidence: Math.min(0.85, 0.7 + killZoneBonus),
                    reason: 'SMC bullish bias + oversold RSI + bullish OB'
                };
            }
            if (smcBias === 'BEARISH' && rsi > 60 && hasBearishOB) {
                return {
                    decision: 'SHORT',
                    confidence: Math.min(0.85, 0.7 + killZoneBonus),
                    reason: 'SMC bearish bias + overbought RSI + bearish OB'
                };
            }

            // FVG (Fair Value Gap) signals
            if (fvgs.length > 0) {
                const recentFvg = fvgs[0];
                if (recentFvg.type === 'BULLISH' && smcBias === 'BULLISH') {
                    return { decision: 'LONG', confidence: 0.65, reason: 'Bullish FVG with SMC bullish bias' };
                }
                if (recentFvg.type === 'BEARISH' && smcBias === 'BEARISH') {
                    return { decision: 'SHORT', confidence: 0.65, reason: 'Bearish FVG with SMC bearish bias' };
                }
            }
        }

        // ========== ICT-based signals ==========
        if (methodology === 'ICT') {
            // ICT focuses on liquidity sweeps and order flow
            const hasLiquiditySweep = marketData?.liquiditySweep;

            if (hasLiquiditySweep && rsi < 35) {
                return { decision: 'LONG', confidence: 0.7 + killZoneBonus, reason: 'ICT liquidity sweep + oversold' };
            }
            if (hasLiquiditySweep && rsi > 65) {
                return { decision: 'SHORT', confidence: 0.7 + killZoneBonus, reason: 'ICT liquidity sweep + overbought' };
            }
        }

        // ========== Gann-based signals ==========
        if (methodology === 'GANN') {
            // Gann focuses on time cycles
            const gannCycle = marketData?.gannCycle;
            const cycleBias = marketData?.timeCycles?.cycleBias;

            if (cycleBias === 'BULLISH' && trend > 0) {
                return { decision: 'LONG', confidence: 0.7, reason: 'Gann cycle bullish alignment' };
            }
            if (cycleBias === 'BEARISH' && trend < 0) {
                return { decision: 'SHORT', confidence: 0.7, reason: 'Gann cycle bearish alignment' };
            }
        }

        // ========== Basic RSI + trend logic (fallback) ==========
        if (rsi < 30 && trend > 0) {
            return { decision: 'LONG', confidence: 0.6 + killZoneBonus, reason: 'RSI oversold with positive trend' };
        } else if (rsi > 70 && trend < 0) {
            return { decision: 'SHORT', confidence: 0.6 + killZoneBonus, reason: 'RSI overbought with negative trend' };
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
