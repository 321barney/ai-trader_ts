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
