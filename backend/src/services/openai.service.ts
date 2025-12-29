import { IAiService, ChatMessage, AiServiceOptions, ApiCreditExhaustedError } from './ai-service.interface.js';

export class OpenAIService implements IAiService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = 'gpt-4-turbo-preview';
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
            throw new Error('OpenAI API key not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: options?.temperature || 0.7,
                    max_tokens: options?.maxTokens || 1000,
                })
            });

            if (!response.ok) {
                const error = await response.json() as any;
                const errorMessage = error.error?.message || 'OpenAI API request failed';
                const errorCode = error.error?.code || '';

                // Detect credit/quota exhaustion
                if (errorCode === 'insufficient_quota' ||
                    errorMessage.toLowerCase().includes('exceeded your current quota')) {
                    throw new ApiCreditExhaustedError('openai', errorMessage);
                }

                throw new Error(errorMessage);
            }

            const data = await response.json() as any;
            return data.choices[0].message.content;
        } catch (error: any) {
            // Re-throw ApiCreditExhaustedError as-is
            if (error instanceof ApiCreditExhaustedError) {
                throw error;
            }
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }
}

// Default instance
export const openAIService = new OpenAIService();
