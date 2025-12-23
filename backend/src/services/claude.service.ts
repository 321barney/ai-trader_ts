/**
 * Anthropic (Claude) Service
 */

import { IAiService, ChatMessage, AiServiceOptions } from './ai-service.interface.js';

export class ClaudeService implements IAiService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.baseUrl = 'https://api.anthropic.com/v1';
        // Use Claude 3 Sonnet (stable, widely available)
        // Note: Claude 3.5 Sonnet may require special API access
        this.model = 'claude-3-sonnet-20240229';
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
                // Include full error details for debugging
                const errorMessage = error.error?.message || JSON.stringify(error);
                throw new Error(`Anthropic API Error (${response.status}): ${errorMessage}`);
            }

            const data = await response.json() as any;
            return data.content[0].text;
        } catch (error: any) {
            console.error('Anthropic API Error:', error);
            throw error;
        }
    }
}

// Default instance
export const claudeService = new ClaudeService();
