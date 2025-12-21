/**
 * RL Service Client
 * 
 * Communicates with the Python RL Docker container
 */

export interface RLPrediction {
    action: 'LONG' | 'SHORT' | 'HOLD';
    confidence: number;
    expectedReturn: number;
    modelVersion: string;
}

export interface RLMetrics {
    sharpeRatio: number;
    winRate: number;
    maxDrawdown: number;
    totalReturn: number;
    trainingStatus: string;
}

export interface RLParams {
    learning_rate?: number;
    gamma?: number;
    batch_size?: number;
    total_timesteps?: number;
    algorithm?: 'PPO' | 'SAC' | 'A2C';
}

export class RLService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.RL_SERVICE_URL || 'http://localhost:8000';
    }

    /**
     * Check if RL service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get prediction from RL model
     */
    async predict(symbol: string, features: number[]): Promise<RLPrediction> {
        try {
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, features }),
            });

            if (!response.ok) {
                throw new Error('RL prediction failed');
            }

            return await response.json() as unknown as RLPrediction;
        } catch (error) {
            console.error('[RL Service] Prediction error:', error);
            // Return mock prediction if service unavailable
            return {
                action: 'HOLD',
                confidence: 0.5,
                expectedReturn: 0,
                modelVersion: 'mock',
            };
        }
    }

    /**
     * Get current model metrics
     */
    async getMetrics(): Promise<RLMetrics> {
        try {
            const response = await fetch(`${this.baseUrl}/metrics`);

            if (!response.ok) {
                throw new Error('Failed to get metrics');
            }

            return await response.json() as unknown as RLMetrics;
        } catch (error) {
            console.error('[RL Service] Metrics error:', error);
            // Return mock metrics
            return {
                sharpeRatio: 1.2,
                winRate: 0.58,
                maxDrawdown: 0.12,
                totalReturn: 0.25,
                trainingStatus: 'idle',
            };
        }
    }

    /**
     * Modify RL model parameters
     */
    async modifyParams(params: RLParams): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/params`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            return response.ok;
        } catch (error) {
            console.error('[RL Service] Modify params error:', error);
            return false;
        }
    }

    /**
     * Start model training
     */
    async startTraining(config?: {
        symbols?: string[];
        timesteps?: number;
        algorithm?: string;
    }): Promise<{ jobId: string } | null> {
        try {
            const response = await fetch(`${this.baseUrl}/train`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config || {}),
            });

            if (!response.ok) {
                throw new Error('Failed to start training');
            }

            return await response.json() as unknown as { jobId: string };
        } catch (error) {
            console.error('[RL Service] Training error:', error);
            return null;
        }
    }

    /**
     * Stop model training
     */
    async stopTraining(reason?: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            return response.ok;
        } catch (error) {
            console.error('[RL Service] Stop training error:', error);
            return false;
        }
    }

    /**
     * Get training status
     */
    async getTrainingStatus(): Promise<{
        status: string;
        progress: number;
        currentEpisode: number;
        totalEpisodes: number;
    }> {
        try {
            const response = await fetch(`${this.baseUrl}/training/status`);

            if (!response.ok) {
                throw new Error('Failed to get training status');
            }

            return await response.json() as unknown as {
                status: string;
                progress: number;
                currentEpisode: number;
                totalEpisodes: number;
            };
        } catch (error) {
            return {
                status: 'idle',
                progress: 0,
                currentEpisode: 0,
                totalEpisodes: 0,
            };
        }
    }
}

export const rlService = new RLService();
