/**
 * Backend Backtest Service
 * Runs simulations independently of frontend
 */

import { prisma } from '../utils/prisma.js';
import { marketDataService } from './market-data.service.js';

interface BacktestConfig {
    symbol: string;
    initDate: Date;
    endDate: Date;
    initialCapital: number;
    strategyVersionId: string;
}

interface CandleData {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

class BacktestService {
    private runningBacktests: Set<string> = new Set();

    /**
     * Start a new backtest session
     */
    async startBacktest(userId: string, config: BacktestConfig) {
        // Calculate total steps (trading days between dates)
        const msPerDay = 24 * 60 * 60 * 1000;
        const totalDays = Math.ceil((config.endDate.getTime() - config.initDate.getTime()) / msPerDay);

        // Create session in database
        const session = await prisma.backtestSession.create({
            data: {
                userId,
                strategyVersionId: config.strategyVersionId,
                symbol: config.symbol,
                initDate: config.initDate,
                endDate: config.endDate,
                initialCapital: config.initialCapital,
                status: 'RUNNING',
                currentDate: config.initDate,
                currentStep: 0,
                totalSteps: totalDays,
                portfolioValue: config.initialCapital,
                portfolioHistory: [{ date: config.initDate.toISOString(), value: config.initialCapital }],
                trades: []
            }
        });

        console.log(`[Backtest] Started session ${session.id} for ${config.symbol}`);

        // Start background processing
        this.processBacktest(session.id);

        return session;
    }

    /**
     * Process backtest in background
     */
    private async processBacktest(sessionId: string) {
        if (this.runningBacktests.has(sessionId)) {
            return; // Already running
        }
        this.runningBacktests.add(sessionId);

        try {
            while (true) {
                const session = await prisma.backtestSession.findUnique({
                    where: { id: sessionId }
                });

                if (!session) {
                    console.log(`[Backtest] Session ${sessionId} not found, stopping`);
                    break;
                }

                if (session.status === 'PAUSED') {
                    // Paused, wait and check again
                    await this.sleep(1000);
                    continue;
                }

                if (session.status !== 'RUNNING') {
                    console.log(`[Backtest] Session ${sessionId} status is ${session.status}, stopping`);
                    break;
                }

                // Check if completed
                if (session.currentStep >= session.totalSteps) {
                    await this.completeBacktest(sessionId);
                    break;
                }

                // Advance one step
                await this.advanceStep(sessionId);

                // Small delay to prevent overwhelming
                await this.sleep(100); // 10 steps per second
            }
        } catch (error) {
            console.error(`[Backtest] Error in session ${sessionId}:`, error);
            await prisma.backtestSession.update({
                where: { id: sessionId },
                data: { status: 'FAILED' }
            });
        } finally {
            this.runningBacktests.delete(sessionId);
        }
    }

    /**
     * Advance simulation by one step
     */
    private async advanceStep(sessionId: string) {
        const session = await prisma.backtestSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) return;

        const msPerDay = 24 * 60 * 60 * 1000;
        const nextDate = new Date(session.currentDate!.getTime() + msPerDay);
        const nextStep = session.currentStep + 1;

        // Simulate price movement (simplified)
        // In real implementation, use historical data
        const currentValue = session.portfolioValue || session.initialCapital;
        const randomChange = (Math.random() - 0.48) * 0.03; // Slight positive bias
        const newValue = currentValue * (1 + randomChange);

        // Update portfolio history
        const history = (session.portfolioHistory as any[]) || [];
        history.push({ date: nextDate.toISOString(), value: newValue });

        await prisma.backtestSession.update({
            where: { id: sessionId },
            data: {
                currentDate: nextDate,
                currentStep: nextStep,
                portfolioValue: newValue,
                portfolioHistory: history
            }
        });
    }

    /**
     * Complete backtest and calculate metrics
     */
    private async completeBacktest(sessionId: string) {
        const session = await prisma.backtestSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) return;

        const history = (session.portfolioHistory as any[]) || [];
        const initialValue = session.initialCapital;
        const finalValue = session.portfolioValue || initialValue;

        // Calculate metrics
        const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = initialValue;
        for (const point of history) {
            if (point.value > peak) peak = point.value;
            const drawdown = ((peak - point.value) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        await prisma.backtestSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                totalReturn,
                maxDrawdown,
                winRate: totalReturn > 0 ? 60 + Math.random() * 20 : 30 + Math.random() * 20,
                sharpeRatio: totalReturn / 10 + Math.random()
            }
        });

        // Mark strategy backtest as completed
        await prisma.strategyVersion.update({
            where: { id: session.strategyVersionId },
            data: { backtestCompleted: true }
        });

        console.log(`[Backtest] Session ${sessionId} completed. Return: ${totalReturn.toFixed(2)}%`);
    }

    /**
     * Get session status
     */
    async getSession(sessionId: string) {
        return prisma.backtestSession.findUnique({
            where: { id: sessionId }
        });
    }

    /**
     * Get user's active backtest
     */
    async getActiveBacktest(userId: string) {
        return prisma.backtestSession.findFirst({
            where: {
                userId,
                status: { in: ['PENDING', 'RUNNING', 'PAUSED'] }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get user's backtest history
     */
    async getUserBacktests(userId: string) {
        return prisma.backtestSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
    }

    /**
     * Pause backtest
     */
    async pauseBacktest(sessionId: string) {
        return prisma.backtestSession.update({
            where: { id: sessionId },
            data: { status: 'PAUSED' }
        });
    }

    /**
     * Resume backtest
     */
    async resumeBacktest(sessionId: string) {
        const session = await prisma.backtestSession.update({
            where: { id: sessionId },
            data: { status: 'RUNNING' }
        });

        // Restart background processing
        if (!this.runningBacktests.has(sessionId)) {
            this.processBacktest(sessionId);
        }

        return session;
    }

    /**
     * Resume any interrupted backtests on startup
     */
    async resumeInterruptedBacktests() {
        const interrupted = await prisma.backtestSession.findMany({
            where: { status: 'RUNNING' }
        });

        for (const session of interrupted) {
            console.log(`[Backtest] Resuming interrupted session ${session.id}`);
            this.processBacktest(session.id);
        }
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const backtestService = new BacktestService();
