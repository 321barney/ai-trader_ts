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
    isMock?: boolean;  // Indicates if data is from mock/fallback
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
     * THROWS ERROR if unavailable - orchestrator should use local RL fallback
     */
    async predictEnhanced(request: EnhancedPredictRequest): Promise<RLPrediction> {
        try {
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(10000), // 10s timeout
            });

            if (!response.ok) {
                throw new Error(`RL prediction failed: ${response.status}`);
            }

            const result = await response.json() as unknown as RLPrediction;

            // Log enhanced prediction with SMC analysis
            if (result.smcAnalysis || result.volumeAnalysis) {
                console.log(`[RL Service] Enhanced prediction: ${result.action} @ ${(result.confidence * 100).toFixed(1)}%`);
                console.log(`[RL Service] SMC: ${result.smcAnalysis || 'N/A'}`);
                console.log(`[RL Service] Volume: ${result.volumeAnalysis || 'N/A'}`);
            }

            return result;
        } catch (error: any) {
            console.error('[RL Service] Prediction error - NO MOCK, use local RL:', error.message);
            // THROW ERROR - orchestrator will use local RL interpretation
            throw new Error('RL service unavailable - use local interpretation');
        }
    }

    /**
     * Get current model metrics
     * Returns null if service is unavailable (no mock fallback)
     */
    async getMetrics(): Promise<RLMetrics | null> {
        try {
            const response = await fetch(`${this.baseUrl}/metrics`, {
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                throw new Error('Failed to get metrics');
            }

            const data = await response.json() as unknown as RLMetrics;
            return { ...data, isMock: false };
        } catch (error: any) {
            console.warn('[RL Service] Metrics unavailable:', error.message);
            // Return null instead of mock - let frontend handle display
            return null;
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
     * Returns null if service is unavailable
     */
    async getTrainingStatus(): Promise<{
        status: string;
        progress: number;
        currentEpisode: number;
        totalEpisodes: number;
    } | null> {
        try {
            const response = await fetch(`${this.baseUrl}/training/status`, {
                signal: AbortSignal.timeout(5000),
            });

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
            return null;
        }
    }

    // ============================================================================
    // Model Lifecycle Management
    // ============================================================================

    /**
     * Check if a trained model is available on the RL service
     */
    async checkModelAvailability(): Promise<{ available: boolean; modelId?: string; lastTrained?: string; metrics?: RLMetrics }> {
        try {
            const response = await fetch(`${this.baseUrl}/model/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                return { available: false };
            }

            const data = await response.json() as any;
            return {
                available: data.modelLoaded || false,
                modelId: data.modelId,
                lastTrained: data.lastTrained,
                metrics: data.metrics
            };
        } catch (error) {
            console.warn('[RL Service] Model availability check failed:', error);
            return { available: false };
        }
    }

    /**
     * Initiate model creation workflow:
     * 1. Fetch historical data
     * 2. Send to RL for training
     * 3. Wait for training completion
     * 4. Backtest the model
     * 5. Return performance metrics
     */
    async initiateModelCreation(symbol: string, historicalData: any[]): Promise<{
        success: boolean;
        modelId?: string;
        metrics?: { winRate: number; sharpeRatio: number; maxDrawdown: number };
        error?: string;
    }> {
        try {
            console.log(`[RL Service] Initiating model creation for ${symbol} with ${historicalData.length} data points`);

            // Step 1: Send data for training
            const trainResponse = await fetch(`${this.baseUrl}/model/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    data: historicalData,
                    config: {
                        algorithm: 'PPO',
                        total_timesteps: 50000,
                        learning_rate: 0.0003
                    }
                }),
            });

            if (!trainResponse.ok) {
                const error = await trainResponse.text();
                throw new Error(`Training initiation failed: ${error}`);
            }

            const trainResult = await trainResponse.json() as any;
            console.log(`[RL Service] Training started, job ID: ${trainResult.jobId}`);

            // Step 2: Poll for training completion (with timeout)
            const maxWaitTime = 10 * 60 * 1000; // 10 minutes max
            const pollInterval = 5000; // 5 seconds
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitTime) {
                const status = await this.getTrainingStatus();

                if (status?.status === 'completed') {
                    console.log('[RL Service] Training completed successfully');
                    break;
                } else if (status?.status === 'failed') {
                    throw new Error('Training failed');
                }

                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }

            // Step 3: Get model metrics
            const metrics = await this.getMetrics();

            // Step 4: Backtest (trigger backtest on RL service)
            const backtestResponse = await fetch(`${this.baseUrl}/model/backtest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
            });

            let backtestMetrics = { winRate: 0, sharpeRatio: 0, maxDrawdown: 0 };
            if (backtestResponse.ok) {
                backtestMetrics = await backtestResponse.json() as any;
            }

            return {
                success: true,
                modelId: trainResult.modelId,
                metrics: {
                    winRate: backtestMetrics.winRate || metrics?.winRate || 0,
                    sharpeRatio: backtestMetrics.sharpeRatio || metrics?.sharpeRatio || 0,
                    maxDrawdown: backtestMetrics.maxDrawdown || metrics?.maxDrawdown || 0
                }
            };

        } catch (error: any) {
            console.error('[RL Service] Model creation failed:', error);
            return {
                success: false,
                error: error.message || 'Unknown error'
            };
        }
    }

    /**
     * Feed new market data to update model parameters (called every 6h)
     */
    async updateModelWithNewData(symbol: string, newData: any[]): Promise<boolean> {
        try {
            console.log(`[RL Service] Updating model with ${newData.length} new data points for ${symbol}`);

            const response = await fetch(`${this.baseUrl}/model/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    data: newData,
                    updateType: 'incremental'
                }),
            });

            if (response.ok) {
                console.log('[RL Service] Model parameters updated successfully');
                return true;
            }

            console.warn('[RL Service] Model update failed:', await response.text());
            return false;
        } catch (error) {
            console.error('[RL Service] Model update error:', error);
            return false;
        }
    }

    /**
     * Run manual backtest on current model
     */
    async runBacktest(symbol: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/model/backtest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
            });

            if (!response.ok) {
                throw new Error('Backtest failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[RL Service] Backtest error:', error);
            return null;
        }
    }

    /**
     * Get RL prediction for council participation
     * Returns structured decision for deliberation
     */
    async getModelPredictionForCouncil(request: EnhancedPredictRequest): Promise<{
        vote: 'LONG' | 'SHORT' | 'HOLD';
        confidence: number;
        reasoning: string;
        entryPrice?: number;
        stopLoss?: number;
        takeProfit?: number;
    } | null> {
        try {
            // First check if model is available
            const availability = await this.checkModelAvailability();
            if (!availability.available) {
                console.log('[RL Service] No model available for council participation');
                return null;
            }

            // Get prediction
            const prediction = await this.predictEnhanced(request);

            return {
                vote: prediction.action,
                confidence: prediction.confidence,
                reasoning: prediction.reasoning || `RL Model prediction: ${prediction.action} with ${(prediction.confidence * 100).toFixed(1)}% confidence. Expected return: ${(prediction.expectedReturn * 100).toFixed(2)}%`,
                entryPrice: prediction.entry,
                stopLoss: prediction.stopLoss,
                takeProfit: prediction.takeProfit
            };
        } catch (error) {
            console.error('[RL Service] Council prediction failed:', error);
            return null;
        }
    }
}

export const rlService = new RLService();

