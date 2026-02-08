/**
 * Paper Trading Service
 * 
 * Simulates trades without real execution to validate RL model performance
 * before going live. Tracks virtual positions and P&L.
 */

import { prisma } from '../utils/prisma.js';
import { rlService, RLPrediction } from './rl.service.js';
import { exchangeFactory } from './exchange.service.js';

// ============================================================================
// Types
// ============================================================================

export interface PaperPosition {
    id: string;
    userId: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    openedAt: Date;
    status: 'OPEN' | 'CLOSED';
    exitPrice?: number;
    closedAt?: Date;
    pnl?: number;
}

export interface PaperTradingStats {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    maxDrawdown: number;
    sharpeRatio: number;
    isValidationPassed: boolean;
}

// Validation thresholds (matching trainer.py)
const PAPER_TRADING_THRESHOLDS = {
    min_trades: 10,           // Minimum trades before validation
    min_win_rate: 0.52,       // 52% win rate
    min_sharpe: 0.8,          // Slightly lower than backtest threshold
    max_drawdown: 0.25,       // 25% max drawdown
    validation_period_hours: 24,  // Run paper trading for 24 hours
};

// ============================================================================
// Paper Trading Service Class
// ============================================================================

export class PaperTradingService {
    private positions: Map<string, PaperPosition[]> = new Map();
    private closedTrades: Map<string, PaperPosition[]> = new Map();
    private dailyPnL: Map<string, number[]> = new Map();
    private startTime: Map<string, Date> = new Map();

    /**
     * Start paper trading validation for a user
     */
    async startValidation(userId: string, symbol: string = 'BTCUSDT'): Promise<{ sessionId: string }> {
        const sessionId = `paper-${userId}-${Date.now()}`;

        this.positions.set(sessionId, []);
        this.closedTrades.set(sessionId, []);
        this.dailyPnL.set(sessionId, []);
        this.startTime.set(sessionId, new Date());

        console.log(`[PaperTrading] Started validation session ${sessionId} for ${userId}`);

        return { sessionId };
    }

    /**
     * Process a signal in paper trading mode
     */
    async processSignal(
        sessionId: string,
        userId: string,
        symbol: string,
        prediction: RLPrediction,
        currentPrice: number
    ): Promise<PaperPosition | null> {
        if (prediction.action === 'HOLD') {
            return null;
        }

        // Check existing position
        const userPositions = this.positions.get(sessionId) || [];
        const existingPosition = userPositions.find(p => p.symbol === symbol && p.status === 'OPEN');

        // If we have an open position and signal is opposite, close it
        if (existingPosition) {
            if ((existingPosition.side === 'LONG' && prediction.action === 'SHORT') ||
                (existingPosition.side === 'SHORT' && prediction.action === 'LONG')) {
                await this.closePosition(sessionId, existingPosition.id, currentPrice);
            } else {
                // Same direction, don't add
                return null;
            }
        }

        // Open new position
        const position: PaperPosition = {
            id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            symbol,
            side: prediction.action as 'LONG' | 'SHORT',
            entryPrice: prediction.entry || currentPrice,
            quantity: 1, // Normalized quantity for comparison
            stopLoss: prediction.stopLoss,
            takeProfit: prediction.takeProfit,
            openedAt: new Date(),
            status: 'OPEN'
        };

        userPositions.push(position);
        this.positions.set(sessionId, userPositions);

        console.log(`[PaperTrading] Opened ${position.side} on ${symbol} @ ${position.entryPrice}`);

        return position;
    }

    /**
     * Close a paper position
     */
    async closePosition(sessionId: string, positionId: string, exitPrice: number): Promise<PaperPosition | null> {
        const userPositions = this.positions.get(sessionId) || [];
        const position = userPositions.find(p => p.id === positionId);

        if (!position || position.status === 'CLOSED') {
            return null;
        }

        // Calculate PnL
        const pnlPercent = position.side === 'LONG'
            ? (exitPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - exitPrice) / position.entryPrice;

        position.status = 'CLOSED';
        position.exitPrice = exitPrice;
        position.closedAt = new Date();
        position.pnl = pnlPercent * 100; // Store as percentage

        // Move to closed trades
        const closedList = this.closedTrades.get(sessionId) || [];
        closedList.push(position);
        this.closedTrades.set(sessionId, closedList);

        // Update daily PnL
        const dailyPnLList = this.dailyPnL.get(sessionId) || [];
        dailyPnLList.push(pnlPercent * 100);
        this.dailyPnL.set(sessionId, dailyPnLList);

        console.log(`[PaperTrading] Closed ${position.side} on ${position.symbol} @ ${exitPrice} | PnL: ${(pnlPercent * 100).toFixed(2)}%`);

        return position;
    }

    /**
     * Check positions against SL/TP
     */
    async checkPositions(sessionId: string, symbol: string, currentPrice: number): Promise<void> {
        const userPositions = this.positions.get(sessionId) || [];

        for (const position of userPositions) {
            if (position.symbol !== symbol || position.status !== 'OPEN') continue;

            // Check Stop Loss
            if (position.stopLoss) {
                const hitSL = position.side === 'LONG'
                    ? currentPrice <= position.stopLoss
                    : currentPrice >= position.stopLoss;

                if (hitSL) {
                    await this.closePosition(sessionId, position.id, position.stopLoss);
                    console.log(`[PaperTrading] SL hit for ${position.id}`);
                    continue;
                }
            }

            // Check Take Profit
            if (position.takeProfit) {
                const hitTP = position.side === 'LONG'
                    ? currentPrice >= position.takeProfit
                    : currentPrice <= position.takeProfit;

                if (hitTP) {
                    await this.closePosition(sessionId, position.id, position.takeProfit);
                    console.log(`[PaperTrading] TP hit for ${position.id}`);
                }
            }
        }
    }

    /**
     * Get validation statistics for a session
     */
    getStats(sessionId: string): PaperTradingStats {
        const trades = this.closedTrades.get(sessionId) || [];
        const pnlList = this.dailyPnL.get(sessionId) || [];

        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
        const losingTrades = trades.filter(t => (t.pnl || 0) <= 0).length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
        const totalPnL = pnlList.reduce((sum, pnl) => sum + pnl, 0);

        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let cumulative = 0;
        for (const pnl of pnlList) {
            cumulative += pnl;
            if (cumulative > peak) peak = cumulative;
            const drawdown = (peak - cumulative) / (Math.abs(peak) + 1);
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        // Calculate Sharpe Ratio (simplified)
        const mean = pnlList.length > 0 ? pnlList.reduce((a, b) => a + b, 0) / pnlList.length : 0;
        const variance = pnlList.length > 0
            ? pnlList.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnlList.length
            : 1;
        const sharpeRatio = variance > 0 ? (mean / Math.sqrt(variance)) * Math.sqrt(252) : 0;

        // Check if validation passed
        const isValidationPassed =
            totalTrades >= PAPER_TRADING_THRESHOLDS.min_trades &&
            winRate >= PAPER_TRADING_THRESHOLDS.min_win_rate &&
            sharpeRatio >= PAPER_TRADING_THRESHOLDS.min_sharpe &&
            maxDrawdown <= PAPER_TRADING_THRESHOLDS.max_drawdown;

        return {
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            totalPnL,
            maxDrawdown,
            sharpeRatio,
            isValidationPassed
        };
    }

    /**
     * Check if validation period has ended
     */
    isValidationComplete(sessionId: string): boolean {
        const startTime = this.startTime.get(sessionId);
        if (!startTime) return false;

        const elapsedHours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
        return elapsedHours >= PAPER_TRADING_THRESHOLDS.validation_period_hours;
    }

    /**
     * Run full paper trading validation cycle
     * Called periodically to process new candles
     */
    async runValidationCycle(
        sessionId: string,
        userId: string,
        symbol: string,
        features: number[],
        currentPrice: number
    ): Promise<{ stats: PaperTradingStats; isComplete: boolean }> {
        // Check existing positions against SL/TP
        await this.checkPositions(sessionId, symbol, currentPrice);

        // Get prediction from RL model
        try {
            const prediction = await rlService.predict(symbol, features);

            // Process the signal
            await this.processSignal(sessionId, userId, symbol, prediction, currentPrice);
        } catch (error) {
            console.warn('[PaperTrading] RL prediction failed, skipping cycle');
        }

        // Get current stats
        const stats = this.getStats(sessionId);
        const isComplete = this.isValidationComplete(sessionId);

        if (isComplete) {
            console.log(`[PaperTrading] Validation complete for ${sessionId}`);
            console.log(`[PaperTrading] Result: ${stats.isValidationPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
            console.log(`[PaperTrading] Stats: WinRate=${(stats.winRate * 100).toFixed(1)}%, Sharpe=${stats.sharpeRatio.toFixed(2)}, MaxDD=${(stats.maxDrawdown * 100).toFixed(1)}%`);
        }

        return { stats, isComplete };
    }

    /**
     * Cleanup session data
     */
    cleanup(sessionId: string): void {
        this.positions.delete(sessionId);
        this.closedTrades.delete(sessionId);
        this.dailyPnL.delete(sessionId);
        this.startTime.delete(sessionId);
    }
}

export const paperTradingService = new PaperTradingService();
