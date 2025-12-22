/**
 * Base Agent Class with Chain-of-Thought (COT) Reasoning
 * 
 * All AI agents inherit from this class and implement COT prompting
 * to provide transparent, step-by-step reasoning for decisions.
 */

import { AgentType } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { IAiService } from '../services/ai-service.interface.js';


export interface ThoughtStep {
    step: number;
    thought: string;
    observation?: string;
    conclusion?: string;
}

export interface AgentContext {
    userId: string;
    symbol?: string;
    marketData?: any;
    currentPosition?: any;
    riskMetrics?: any;
    aiService?: IAiService;
    methodology?: string; // SMC, ICT, etc.
    // Performance-based prompt optimization hints from orchestrator
    performanceHints?: {
        winRate?: number;  // Recent win rate
        recentStreak?: 'winning' | 'losing' | 'neutral';
        streakCount?: number;
        methodologyEffectiveness?: number; // How well current methodology is performing
        suggestedAdjustments?: string[];  // Dynamic hints based on performance
        avoidPatterns?: string[];  // Patterns that have been losing
        preferPatterns?: string[];  // Patterns that have been winning
    };
}

export interface AgentDecisionResult {
    decision: string;
    confidence: number;
    reasoning: string;
    thoughtSteps: ThoughtStep[];
    rlAction?: string;
    rlParams?: any;
}

export abstract class BaseAgent {
    protected agentType: AgentType;

    constructor(agentType: AgentType) {
        this.agentType = agentType;
    }

    /**
     * Build the Chain-of-Thought prompt for AI
     */
    protected abstract buildCOTPrompt(context: AgentContext): string;

    /**
     * Parse AI response into structured thought steps
     */
    protected parseCOTResponse(response: string): ThoughtStep[] {
        const steps: ThoughtStep[] = [];
        const stepRegex = /Step\s+(\d+):\s*([\s\S]*?)(?=Step\s+\d+:|$)/gi;
        let match;

        while ((match = stepRegex.exec(response)) !== null) {
            steps.push({
                step: parseInt(match[1]),
                thought: match[2].trim(),
            });
        }

        // If no steps found, create a single step from the full response
        if (steps.length === 0) {
            steps.push({
                step: 1,
                thought: response.trim(),
            });
        }

        return steps;
    }

    /**
     * Call AI Service with COT prompt
     * REQUIRES a configured AI Service - no mock fallback.
     */
    protected async callAiModel(prompt: string, aiService?: IAiService): Promise<string> {
        if (!aiService) {
            throw new Error(`AI Service not configured for ${this.agentType}. Please configure an LLM API key in Settings.`);
        }

        try {
            return await aiService.chat([
                { role: 'system', content: this.getSystemPrompt() },
                { role: 'user', content: prompt }
            ]);
        } catch (error: any) {
            console.error(`Error calling AI model for ${this.agentType}:`, error);
            throw error;
        }
    }

    /**
     * Get the system prompt for this agent type
     */
    protected abstract getSystemPrompt(): string;

    /**
     * Get mock response for testing without API key
     */
    protected abstract getMockResponse(): string;

    /**
     * Main decision method - to be implemented by each agent
     */
    public abstract decide(context: AgentContext): Promise<AgentDecisionResult>;

    /**
     * Save decision to database for audit trail
     */
    protected async saveDecision(
        userId: string,
        result: AgentDecisionResult,
        context: AgentContext
    ): Promise<void> {
        await prisma.agentDecision.create({
            data: {
                userId,
                agentType: this.agentType,
                reasoning: result.reasoning,
                thoughtSteps: result.thoughtSteps as any,
                decision: result.decision,
                confidence: result.confidence,
                symbol: context.symbol || 'UNKNOWN',
                marketData: context.marketData || {},
                rlAction: result.rlAction,
                rlParams: result.rlParams || {},
            },
        });
    }
}

export default BaseAgent;
