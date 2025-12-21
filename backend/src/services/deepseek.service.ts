/**
 * DeepSeek AI Service
 */

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface DeepSeekResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class DeepSeekService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    }

    /**
     * Check if API key is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.startsWith('sk-');
    }

    /**
     * Send chat completion request
     */
    async chat(messages: ChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('DeepSeek API key not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.maxTokens ?? 2000,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`DeepSeek API error: ${error}`);
            }

            const data: DeepSeekResponse = await response.json() as unknown as DeepSeekResponse;
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('[DeepSeek] API error:', error);
            throw error;
        }
    }

    /**
     * Simple prompt request
     */
    async prompt(systemPrompt: string, userPrompt: string): Promise<string> {
        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);
    }

    /**
     * Analyze market data with COT
     */
    async analyzeMarket(symbol: string, marketData: any): Promise<string> {
        const systemPrompt = `You are a market analysis AI. Analyze the provided market data using Chain-of-Thought reasoning.
    
Structure your response as:
Step 1: Technical Analysis
Step 2: Trend Assessment
Step 3: Key Levels
Step 4: Recommendation

Provide clear, actionable insights.`;

        const userPrompt = `Analyze ${symbol}:
Current Price: ${marketData.currentPrice}
24h Change: ${marketData.change24h}%
RSI: ${marketData.rsi}
MACD: ${marketData.macd}
Volume: ${marketData.volume}`;

        return this.prompt(systemPrompt, userPrompt);
    }
}

export const deepseekService = new DeepSeekService();
