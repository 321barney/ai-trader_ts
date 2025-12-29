/**
 * AI Service Interface
 * Common interface for all LLM providers
 */

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AiServiceOptions {
    temperature?: number;
    maxTokens?: number;
}

export interface IAiService {
    isConfigured(): boolean;
    chat(messages: ChatMessage[], options?: AiServiceOptions): Promise<string>;
}

/**
 * Custom error for API credit/quota exhaustion
 * Thrown by AI services when provider credits run out
 */
export class ApiCreditExhaustedError extends Error {
    public readonly provider: string;
    
    constructor(provider: string, message?: string) {
        super(message || `${provider} API credits exhausted`);
        this.name = 'ApiCreditExhaustedError';
        this.provider = provider;
    }
}
