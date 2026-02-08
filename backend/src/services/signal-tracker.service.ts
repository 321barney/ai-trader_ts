/**
 * Signal Tracker Service
 * 
 * Tracks ALL signals (executed or not) and monitors
 * their performance for strategy evolution.
 */

import { prisma } from '../utils/prisma.js';
import { exchangeFactory } from './exchange.service.js';


// Types
export interface TrackedSignal {
    id: string;
    userId: string;
    strategyVersionId?: string | null;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;

    // Agent reasoning
    agentReasoning: {
        strategyConsultant: string;
        riskOfficer: string;
        marketAnalyst: string;
    };

    // Indicators at signal time
    indicatorsSnapshot: any;

    // Tracking
    status: 'PENDING' | 'HIT_TP' | 'HIT_SL' | 'EXPIRED' | 'CANCELLED';
    actualOutcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
    pnlPercent?: number;
    priceAtClose?: number;

    // Execution
    executed: boolean;
    orderId?: string;
    executionPrice?: number;
    realizedPnL?: number;

    createdAt: Date;
    closedAt?: Date;
    expiresAt?: Date;
}

export interface SignalPerformance {
    totalSignals: number;
    pending: number;
    wins: number;
    losses: number;
    winRate: number;
    avgWinPercent: number;
    avgLossPercent: number;
    totalPnLPercent: number;
}

export class SignalTrackerService {

    /**
     * Create and start tracking a new signal
     */
    async createSignal(
        userId: string,
        strategyVersionId: string | null | undefined,
        signal: {
            symbol: string;
            direction: 'LONG' | 'SHORT';
            entryPrice: number;
            stopLoss: number;
            takeProfit: number;
            confidence: number;
            agentReasoning: {
                strategyConsultant: string;
                riskOfficer: string;
                marketAnalyst: string;
            };
            indicators: any;
        },
        expiresInHours = 24
    ): Promise<TrackedSignal> {
        const trackedSignal: TrackedSignal = {
            id: crypto.randomUUID(),
            userId,
            strategyVersionId: strategyVersionId || null,
            symbol: signal.symbol,
            direction: signal.direction,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            confidence: signal.confidence,
            agentReasoning: signal.agentReasoning,
            indicatorsSnapshot: signal.indicators,
            status: 'PENDING',
            executed: false,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        };

        await prisma.trackedSignal.create({
            data: {
                id: trackedSignal.id,
                userId: trackedSignal.userId,
                strategyVersionId: trackedSignal.strategyVersionId || undefined,
                symbol: trackedSignal.symbol,
                direction: trackedSignal.direction,
                entryPrice: trackedSignal.entryPrice,
                stopLoss: trackedSignal.stopLoss,
                takeProfit: trackedSignal.takeProfit,
                confidence: trackedSignal.confidence,
                agentReasoning: trackedSignal.agentReasoning as any,
                indicatorsSnapshot: trackedSignal.indicatorsSnapshot as any,
                status: 'PENDING',
                executed: false,
                expiresAt: trackedSignal.expiresAt,
            },
        });

        return trackedSignal;
    }

    /**
     * Mark signal as executed (for trade mode)
     */
    async markExecuted(
        signalId: string,
        orderId: string,
        executionPrice: number
    ): Promise<void> {
        await prisma.trackedSignal.update({
            where: { id: signalId },
            data: {
                executed: true,
                orderId,
                executionPrice,
            },
        });
    }

    /**
     * Update signal status based on current price
     * Called periodically by background job
     */
    async updateSignalStatus(signalId: string, currentPrice: number): Promise<TrackedSignal | null> {
        const signal = await prisma.trackedSignal.findUnique({
            where: { id: signalId },
        });

        if (!signal || signal.status !== 'PENDING') return null;

        let newStatus: 'PENDING' | 'HIT_TP' | 'HIT_SL' | 'EXPIRED' = 'PENDING';
        let outcome: 'WIN' | 'LOSS' | undefined;
        let pnlPercent: number | undefined;

        // Check if expired
        if (signal.expiresAt && new Date() > signal.expiresAt) {
            newStatus = 'EXPIRED';
        }

        // Check TP/SL hit for LONG
        if (signal.direction === 'LONG') {
            if (currentPrice >= signal.takeProfit) {
                newStatus = 'HIT_TP';
                outcome = 'WIN';
                pnlPercent = ((signal.takeProfit - signal.entryPrice) / signal.entryPrice) * 100;
            } else if (currentPrice <= signal.stopLoss) {
                newStatus = 'HIT_SL';
                outcome = 'LOSS';
                pnlPercent = ((signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100;
            }
        }

        // Check TP/SL hit for SHORT
        if (signal.direction === 'SHORT') {
            if (currentPrice <= signal.takeProfit) {
                newStatus = 'HIT_TP';
                outcome = 'WIN';
                pnlPercent = ((signal.entryPrice - signal.takeProfit) / signal.entryPrice) * 100;
            } else if (currentPrice >= signal.stopLoss) {
                newStatus = 'HIT_SL';
                outcome = 'LOSS';
                pnlPercent = ((signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100;
            }
        }

        // Update if status changed
        if (newStatus !== 'PENDING') {
            await prisma.trackedSignal.update({
                where: { id: signalId },
                data: {
                    status: newStatus,
                    actualOutcome: outcome,
                    pnlPercent,
                    priceAtClose: currentPrice,
                    closedAt: new Date(),
                },
            });
        }

        return signal as any;
    }

    /**
     * Update all pending signals (background job)
     */
    async updateAllPendingSignals(): Promise<number> {
        const pendingSignals = await prisma.trackedSignal.findMany({
            where: { status: 'PENDING' },
        });

        let updated = 0;
        const exchange = exchangeFactory.getDefault();

        for (const signal of pendingSignals) {
            try {
                const currentPrice = await exchange.getPrice(signal.symbol);
                const result = await this.updateSignalStatus(signal.id, currentPrice);
                if (result) updated++;
            } catch (error) {
                console.error(`[SignalTracker] Error updating ${signal.id}:`, error);
            }
        }

        return updated;
    }

    /**
     * Get signal history for user
     */
    async getSignalHistory(
        userId: string,
        options?: {
            limit?: number;
            status?: string;
            strategyVersionId?: string;
            symbol?: string;
        }
    ): Promise<TrackedSignal[]> {
        const signals = await prisma.trackedSignal.findMany({
            where: {
                userId,
                ...(options?.status && { status: options.status }),
                ...(options?.strategyVersionId && { strategyVersionId: options.strategyVersionId }),
                ...(options?.symbol && { symbol: options.symbol }),
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
        });

        return signals.map(s => ({
            id: s.id,
            userId: s.userId,
            strategyVersionId: s.strategyVersionId,
            symbol: s.symbol,
            direction: s.direction as 'LONG' | 'SHORT',
            entryPrice: s.entryPrice,
            stopLoss: s.stopLoss,
            takeProfit: s.takeProfit,
            confidence: s.confidence,
            agentReasoning: s.agentReasoning as any,
            indicatorsSnapshot: s.indicatorsSnapshot,
            status: s.status as any,
            actualOutcome: s.actualOutcome as any,
            pnlPercent: s.pnlPercent ?? undefined,
            priceAtClose: s.priceAtClose ?? undefined,
            executed: s.executed,
            orderId: s.orderId ?? undefined,
            executionPrice: s.executionPrice ?? undefined,
            realizedPnL: s.realizedPnL ?? undefined,
            createdAt: s.createdAt,
            closedAt: s.closedAt ?? undefined,
            expiresAt: s.expiresAt ?? undefined,
        }));
    }

    /**
     * Get signal by ID (with userId verification for security)
     */
    async getSignal(signalId: string, userId?: string): Promise<TrackedSignal | null> {
        const signal = await prisma.trackedSignal.findUnique({
            where: { id: signalId },
        });

        if (!signal) return null;

        // If userId provided, verify ownership
        if (userId && signal.userId !== userId) {
            return null; // User doesn't own this signal
        }

        return {
            id: signal.id,
            userId: signal.userId,
            strategyVersionId: signal.strategyVersionId,
            symbol: signal.symbol,
            direction: signal.direction as 'LONG' | 'SHORT',
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            confidence: signal.confidence,
            agentReasoning: signal.agentReasoning as any,
            indicatorsSnapshot: signal.indicatorsSnapshot,
            status: signal.status as any,
            actualOutcome: signal.actualOutcome as any,
            pnlPercent: signal.pnlPercent ?? undefined,
            priceAtClose: signal.priceAtClose ?? undefined,
            executed: signal.executed,
            orderId: signal.orderId ?? undefined,
            executionPrice: signal.executionPrice ?? undefined,
            realizedPnL: signal.realizedPnL ?? undefined,
            createdAt: signal.createdAt,
            closedAt: signal.closedAt ?? undefined,
            expiresAt: signal.expiresAt ?? undefined,
        };
    }

    /**
     * Get performance metrics
     */
    async getPerformance(userId: string, strategyVersionId?: string): Promise<SignalPerformance> {
        const signals = await prisma.trackedSignal.findMany({
            where: {
                userId,
                ...(strategyVersionId && { strategyVersionId }),
            },
        });

        const closed = signals.filter(s => s.status !== 'PENDING');
        const wins = closed.filter(s => s.actualOutcome === 'WIN');
        const losses = closed.filter(s => s.actualOutcome === 'LOSS');

        const avgWinPercent = wins.length > 0
            ? wins.reduce((sum, s) => sum + (s.pnlPercent || 0), 0) / wins.length
            : 0;

        const avgLossPercent = losses.length > 0
            ? losses.reduce((sum, s) => sum + (s.pnlPercent || 0), 0) / losses.length
            : 0;

        const totalPnLPercent = closed.reduce((sum, s) => sum + (s.pnlPercent || 0), 0);

        return {
            totalSignals: signals.length,
            pending: signals.filter(s => s.status === 'PENDING').length,
            wins: wins.length,
            losses: losses.length,
            winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
            avgWinPercent: Math.round(avgWinPercent * 100) / 100,
            avgLossPercent: Math.round(avgLossPercent * 100) / 100,
            totalPnLPercent: Math.round(totalPnLPercent * 100) / 100,
        };
    }

    /**
     * Get feedback for strategy evolution
     */
    async getPerformanceFeedback(userId: string, lastN = 20): Promise<{
        winners: TrackedSignal[];
        losers: TrackedSignal[];
        summary: SignalPerformance;
    }> {
        const signals = await this.getSignalHistory(userId, { limit: lastN });
        const closed = signals.filter(s => s.status !== 'PENDING' && s.status !== 'CANCELLED');

        return {
            winners: closed.filter(s => s.actualOutcome === 'WIN'),
            losers: closed.filter(s => s.actualOutcome === 'LOSS'),
            summary: await this.getPerformance(userId),
        };
    }
}

export const signalTrackerService = new SignalTrackerService();
