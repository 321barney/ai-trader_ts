/**
 * RL Service Client
 * 
 * Communicates with the Python RL Docker container
 * Enhanced with SMC + Volume feature support
 */

// ============================================================================
// SMC + Volume Feature Interfaces
// ============================================================================

export interface OrderBlock {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    strength: number;
    index?: number;
}

export interface FairValueGap {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    size: number;
}

export interface SMCFeatures {
    orderBlocks: OrderBlock[];
    fairValueGaps: FairValueGap[];
    bosDirection: 'BULLISH' | 'BEARISH' | 'NONE';
    oteZone?: { high: number; low: number; direction: string };
    killZone: string;
    smcBias?: string;
}

export interface VolumeFeatures {
    volumeRatio: number;
    avgVolume: number;
    currentVolume: number;
}

export interface EnhancedPredictRequest {
    symbol: string;
    features: number[];
    smc?: SMCFeatures;
    volume?: VolumeFeatures;
    methodology?: string;
    currentPrice?: number;
}

// ============================================================================
// Response Interfaces
// ============================================================================

export interface RLPrediction {
    action: 'LONG' | 'SHORT' | 'HOLD';
    confidence: number;
    expectedReturn: number;
    modelVersion: string;
    // Enhanced response with reasoning
    reasoning?: string;
    smcAnalysis?: string;
    volumeAnalysis?: string;
    // Trade parameters
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    riskRewardRatio?: number;
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

// ============================================================================
// RL Service Class
// ============================================================================

export class RLService {
    private baseUrl: string;

    constructor() {
        let url = process.env.RL_SERVICE_URL || 'http://localhost:8000';
        // Ensure URL has protocol prefix
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        this.baseUrl = url;
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
     * Get prediction from RL model (LEGACY - basic features only)
     */
    async predict(symbol: string, features: number[]): Promise<RLPrediction> {
        return this.predictEnhanced({ symbol, features });
    }

    /**
     * Get ENHANCED prediction from RL model with SMC + Volume features
     * This is the primary method for predictions with full context
     */
    async predictEnhanced(request: EnhancedPredictRequest): Promise<RLPrediction> {
        try {
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error('RL prediction failed');
            }

            const result = await response.json() as unknown as RLPrediction;

            // Log enhanced prediction with SMC analysis
            if (result.smcAnalysis || result.volumeAnalysis) {
                console.log(`[RL Service] Enhanced prediction: ${result.action} @ ${(result.confidence * 100).toFixed(1)}%`);
                console.log(`[RL Service] SMC: ${result.smcAnalysis || 'N/A'}`);
                console.log(`[RL Service] Volume: ${result.volumeAnalysis || 'N/A'}`);
            }

            return result;
        } catch (error) {
            console.error('[RL Service] Prediction error:', error);
            // Return mock prediction if service unavailable
            return {
                action: 'HOLD',
                confidence: 0.5,
                expectedReturn: 0,
                modelVersion: 'mock',
                reasoning: 'RL service unavailable - using mock prediction',
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
        } catch (error: any) {
            // Only log if it's NOT a connection refused error (service offline)
            if (error?.cause?.code !== 'ECONNREFUSED' && error?.message !== 'fetch failed') {
                console.warn('[RL Service] Metrics unavailable:', error.message);
            }

            // Return mock metrics
            return {
                sharpeRatio: 1.2,
                winRate: 0.58,
                maxDrawdown: 0.12,
                totalReturn: 0.25,
                trainingStatus: 'idle (offline)',
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
