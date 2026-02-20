/**
 * Execution Service
 * 
 * Handles automatic trade execution from:
 * - Signal Mode: Execute when signal conditions are met
 * - Trade Mode: Execute directly from agent trade decisions
 */

import { prisma } from '../utils/prisma.js';
import { exchangeFactory } from './exchange.service.js';
import { signalTrackerService } from './signal-tracker.service.js';
import { vaultService } from './vault.service.js';

// Cast prisma to any for unmigrated models
// const db = prisma as any;

export type ExecutionMode = 'SIGNAL' | 'TRADE';

export interface ExecutionRequest {
    mode: ExecutionMode;
    userId: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    size?: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    signalId?: string;
    confidence?: number;
}

export interface ExecutionResult {
    success: boolean;
    orderId?: string;
    executedPrice?: number;
    executedSize?: number;
    error?: string;
}

class ExecutionService {
    private isRunning = false;
    private pollInterval: NodeJS.Timeout | null = null;

    /**
     * Start the execution loop
     */
    async start(userId: string): Promise<void> {
        if (this.isRunning) {
            console.log('[Execution] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[Execution] Starting execution loop');

        this.pollInterval = setInterval(async () => {
            await this.processPendingSignals(userId);
        }, 5000);
    }

    /**
     * Stop the execution loop
     */
    stop(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isRunning = false;
        console.log('[Execution] Stopped');
    }

    /**
     * Process pending signals for auto-execution
     */
    private async processPendingSignals(userId: string): Promise<void> {
        try {
            const pendingSignals = await prisma.signal.findMany({
                where: {
                    userId,
                    status: 'ACTIVE',
                    sourceMode: { in: ['SIGNAL', 'TRADE'] }
                },
                orderBy: { createdAt: 'asc' },
                take: 5
            });

            for (const signal of pendingSignals) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { tradingMode: true }
                });

                if (user?.tradingMode === 'trade') {
                    await this.executeFromSignal(signal);
                } else {
                    console.log(`[Execution] Signal ${signal.id} ready (signal mode)`);
                }
            }
        } catch (error) {
            console.error('[Execution] Error processing signals:', error);
        }
    }

    /**
     * Execute a trade from a signal
     */
    async executeFromSignal(signal: any): Promise<ExecutionResult> {
        console.log(`[Execution] Executing signal ${signal.id}: ${signal.direction} ${signal.symbol}`);

        try {
            const user = await prisma.user.findUnique({
                where: { id: signal.userId },
                select: {
                    // keys removed
                    maxRiskPerTrade: true,
                    preferredExchange: true
                }
            });

            const asterApiKey = await vaultService.getSecret(signal.userId, 'aster_api_key');
            const asterApiSecret = await vaultService.getSecret(signal.userId, 'aster_api_secret');

            if (!asterApiKey || !asterApiSecret) {
                return { success: false, error: 'No API keys configured' };
            }

            const userExchange = exchangeFactory.getAdapterForUser(
                (user as any).preferredExchange || 'aster',
                asterApiKey,
                asterApiSecret,
                true
            );

            const riskPercent = user.maxRiskPerTrade || 2;
            const positionSize = await this.calculatePositionSize(
                signal.symbol,
                signal.entryPrice,
                signal.stopLoss,
                riskPercent
            );

            // Place order via User Exchange
            const orderResult = await userExchange.placeOrder({
                symbol: signal.symbol,
                side: signal.direction === 'LONG' ? 'BUY' : 'SELL',
                type: 'MARKET',
                quantity: positionSize
            });

            if (orderResult?.orderId) {
                await prisma.signal.update({
                    where: { id: signal.id },
                    data: { status: 'EXECUTED' }
                });

                await prisma.position.create({
                    data: {
                        userId: signal.userId,
                        symbol: signal.symbol,
                        side: signal.direction,
                        entryPrice: orderResult.avgPrice || signal.entryPrice,
                        size: positionSize,
                        stopLoss: signal.stopLoss,
                        takeProfit: signal.takeProfit,
                        status: 'OPEN',
                        signalId: signal.id
                    }
                });

                console.log(`[Execution] Order placed: ${orderResult.orderId}`);

                // Mark TrackedSignal as executed if it exists (Virtual Tracking -> Real Tracking)
                // We use the same ID assumption or lookup. 
                // Since TrackedSignal doesn't share ID with Signal, we might need to find it or we can't easily link them here without passing ID.
                // Wait, TrackedSignal usually tracks the signals *we* generated.
                // Correction: The Signal table is for the Agent's raw output. TrackedSignal is the "Performance Record".
                // We should try to find the TrackedSignal corresponding to this Signal.
                // Since this is tricky without a direct FK, we will just log for now or skip if complex.
                // Actually, TradingService creates *both*.
                // Let's assume we can find it by lookup or we add a TODO.
                // BETTER: Just call markExecuted with a lookup by signal properties or if we had the ID.

                // For now, let's leave it as is to avoid breaking risk, but adding the import was the first step.
                // Actually, I will search for the TrackedSignal by matching timestamp/symbol/direction created around the same time

                try {
                    const tracked = await prisma.trackedSignal.findFirst({
                        where: {
                            userId: signal.userId,
                            symbol: signal.symbol,
                            direction: signal.direction,
                            status: 'PENDING',
                            createdAt: {
                                gte: new Date(signal.createdAt.getTime() - 1000 * 60) // Created within last minute
                            }
                        }
                    });

                    if (tracked) {
                        await signalTrackerService.markExecuted(tracked.id, orderResult.orderId, orderResult.avgPrice || signal.entryPrice);
                        console.log(`[Execution] TrackedSignal ${tracked.id} marked as executed.`);
                    }
                } catch (e) {
                    console.warn('[Execution] Failed to update TrackedSignal status', e);
                }

                return {
                    success: true,
                    orderId: orderResult.orderId,
                    executedPrice: orderResult.avgPrice,
                    executedSize: positionSize
                };
            } else {
                return { success: false, error: 'Order failed' };
            }
        } catch (error: any) {
            console.error('[Execution] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Direct execution (Trade Mode)
     */
    async executeDirect(request: ExecutionRequest): Promise<ExecutionResult> {
        console.log(`[Execution] Direct execute: ${request.direction} ${request.symbol}`);

        try {
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                select: {
                    // keys removed
                    maxRiskPerTrade: true,
                    preferredExchange: true
                }
            });

            const asterApiKey = await vaultService.getSecret(request.userId, 'aster_api_key');
            const asterApiSecret = await vaultService.getSecret(request.userId, 'aster_api_secret');

            if (!asterApiKey || !asterApiSecret) {
                return { success: false, error: 'No API keys configured' };
            }

            const userExchange = exchangeFactory.getAdapterForUser(
                (user as any).preferredExchange || 'aster',
                asterApiKey,
                asterApiSecret,
                true
            );

            const positionSize = request.size || await this.calculatePositionSize(
                request.symbol,
                request.entryPrice || 0,
                request.stopLoss || 0,
                user.maxRiskPerTrade || 2
            );

            const orderResult = await userExchange.placeOrder({
                symbol: request.symbol,
                side: request.direction === 'LONG' ? 'BUY' : 'SELL',
                type: 'MARKET',
                quantity: positionSize
            });

            if (orderResult?.orderId) {
                await prisma.position.create({
                    data: {
                        userId: request.userId,
                        symbol: request.symbol,
                        side: request.direction,
                        entryPrice: orderResult.avgPrice || request.entryPrice || 0,
                        size: positionSize,
                        stopLoss: request.stopLoss,
                        takeProfit: request.takeProfit,
                        status: 'OPEN'
                    }
                });

                return {
                    success: true,
                    orderId: orderResult.orderId,
                    executedPrice: orderResult.avgPrice,
                    executedSize: positionSize
                };
            }

            return { success: false, error: 'Order failed' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculate position size based on risk percentage
     */
    private async calculatePositionSize(
        symbol: string,
        entryPrice: number,
        stopLoss: number,
        riskPercent: number
    ): Promise<number> {
        if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
            return 0.001;
        }

        const accountSize = 10000;
        const riskAmount = accountSize * (riskPercent / 100);
        const stopDistance = Math.abs(entryPrice - stopLoss);
        const stopPercent = (stopDistance / entryPrice) * 100;
        const positionValue = riskAmount / (stopPercent / 100);
        const positionSize = positionValue / entryPrice;

        return Math.max(0.001, positionSize);
    }

    getStatus() {
        return { running: this.isRunning };
    }
}

export const executionService = new ExecutionService();
