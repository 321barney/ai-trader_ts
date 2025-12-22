/**
 * Google Gemini Service
 */

import { IAiService, ChatMessage, AiServiceOptions } from './ai-service.interface.js';

export class GeminiService implements IAiService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.model = 'gemini-1.5-flash';
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
            throw new Error('Gemini API key not configured');
        }

        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const payload: any = {
            contents: chatMessages,
            generationConfig: {
                temperature: options?.temperature || 0.7,
                maxOutputTokens: options?.maxTokens || 1000,
            }
        };

        if (systemMessage) {
            payload.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/${this.model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json() as any;
                throw new Error(error.error?.message || 'Gemini API request failed');
            }

            const data = await response.json() as any;

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return ''; // Empty response or filtered
            }
        } catch (error: any) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }
}

// Default instance
export const geminiService = new GeminiService();
