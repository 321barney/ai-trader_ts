/**
 * Anthropic (Claude) Service
 */

import { IAiService, ChatMessage, AiServiceOptions, ApiCreditExhaustedError } from './ai-service.interface.js';

export class ClaudeService implements IAiService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.baseUrl = 'https://api.anthropic.com/v1';
        // Claude Sonnet 4 (May 2025 release)
        this.model = 'claude-sonnet-4-20250514';
    }

    /**
     * Check if API key is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Send chat completion request
     */
    async chat(messages: ChatMessage[], options?: AiServiceOptions): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('Anthropic API key not configured');
        }

        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        try {
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    system: systemMessage?.content,
                    messages: chatMessages,
                    max_tokens: options?.maxTokens || 1000,
                    temperature: options?.temperature || 0.7,
                })
            });

            if (!response.ok) {
                const error = await response.json() as any;
                const errorMessage = error.error?.message || JSON.stringify(error);

                // Detect credit exhaustion
                if (errorMessage.toLowerCase().includes('credit balance is too low')) {
                    throw new ApiCreditExhaustedError('anthropic', errorMessage);
                }

                throw new Error(`Anthropic API Error (${response.status}): ${errorMessage}`);
            }

            const data = await response.json() as any;
            return data.content[0].text;
        } catch (error: any) {
            // Re-throw ApiCreditExhaustedError as-is
            if (error instanceof ApiCreditExhaustedError) {
                throw error;
            }
            console.error('Anthropic API Error:', error);
            throw error;
        }
    }
}

// Default instance
export const claudeService = new ClaudeService();
