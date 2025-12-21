/**
 * Base Agent Class with Chain-of-Thought (COT) Reasoning
 * 
 * All AI agents inherit from this class and implement COT prompting
 * to provide transparent, step-by-step reasoning for decisions.
 */

import { PrismaClient, AgentType } from '@prisma/client';

const prisma = new PrismaClient();

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
    protected deepseekApiKey: string;
    protected baseUrl: string;

    constructor(agentType: AgentType) {
        this.agentType = agentType;
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
        this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    }

    /**
     * Build the Chain-of-Thought prompt for DeepSeek
     */
    protected abstract buildCOTPrompt(context: AgentContext): string;

    /**
     * Parse DeepSeek response into structured thought steps
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
     * Call DeepSeek API with COT prompt
     */
    protected async callDeepSeek(prompt: string): Promise<string> {
        if (!this.deepseekApiKey) {
            // Return mock response if no API key
            return this.getMockResponse();
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekApiKey}`,
                },
                body: JSON.stringify({
                    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt(),
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                }),
            });

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (error) {
            console.error(`[${this.agentType}] DeepSeek API error:`, error);
            return this.getMockResponse();
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
                thoughtSteps: result.thoughtSteps,
                decision: result.decision,
                confidence: result.confidence,
                symbol: context.symbol,
                marketData: context.marketData,
                rlAction: result.rlAction,
                rlParams: result.rlParams,
            },
        });
    }
}

export default BaseAgent;
