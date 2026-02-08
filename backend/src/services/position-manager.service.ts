/**
 * Position Manager Service
 * 
 * Tracks and manages open positions:
 * - Monitor TP/SL hits
 * - Update trailing stops
 * - Calculate real-time P/L
 */

import { prisma } from '../utils/prisma.js';
import { exchangeFactory } from './exchange.service.js';

// Cast prisma to any for unmigrated models
// const db = prisma as any;

export interface Position {
    id: string;
    userId: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    currentPrice?: number;
    size: number;
    stopLoss?: number;
    takeProfit?: number;
    trailingStop?: number;
    unrealizedPnl?: number;
    unrealizedPnlPercent?: number;
    status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
}

class PositionManagerService {
    private isRunning = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    private priceCache: Map<string, number> = new Map();

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[PositionManager] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[PositionManager] Starting position monitor');

        this.monitorInterval = setInterval(async () => {
            await this.monitorPositions();
        }, 3000);
    }

    stop(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isRunning = false;
        console.log('[PositionManager] Stopped');
    }

    private async monitorPositions(): Promise<void> {
        try {
            const openPositions = await prisma.position.findMany({
                where: { status: 'OPEN' }
            });

            for (const position of openPositions) {
                await this.checkPosition(position as any);
            }
        } catch (error) {
            console.error('[PositionManager] Monitor error:', error);
        }
    }

    private async checkPosition(position: Position): Promise<void> {
        const currentPrice = await this.getCurrentPrice(position.symbol);
        if (!currentPrice) return;

        const pnl = this.calculatePnl(position, currentPrice);

        await prisma.position.update({
            where: { id: position.id },
            data: {
                currentPrice,
                unrealizedPnl: pnl.amount,
                unrealizedPnlPercent: pnl.percent
            }
        });

        // Check TP hit
        if (position.takeProfit) {
            const tpHit = position.side === 'LONG'
                ? currentPrice >= position.takeProfit
                : currentPrice <= position.takeProfit;

            if (tpHit) {
                await this.closePosition(position, 'HIT_TP', currentPrice);
                return;
            }
        }

        // Check SL hit
        if (position.stopLoss) {
            const slHit = position.side === 'LONG'
                ? currentPrice <= position.stopLoss
                : currentPrice >= position.stopLoss;

            if (slHit) {
                await this.closePosition(position, 'HIT_SL', currentPrice);
                return;
            }
        }

        // Update trailing stop
        if (position.trailingStop) {
            await this.updateTrailingStop(position, currentPrice);
        }
    }

    async closePosition(
        position: Position,
        reason: 'HIT_TP' | 'HIT_SL' | 'MANUAL' | 'LIQUIDATED',
        exitPrice: number
    ): Promise<void> {
        console.log(`[PositionManager] Closing ${position.symbol} - ${reason} @ ${exitPrice}`);

        try {
            // Get user keys for execution
            const user = await prisma.user.findUnique({
                where: { id: position.userId },
                select: {
                    asterApiKey: true,
                    asterApiSecret: true,
                    asterTestnet: true,
                    preferredExchange: true
                }
            });

            if (!user?.asterApiKey || !user?.asterApiSecret) {
                console.error(`[PositionManager] Cannot close position ${position.id}: Missing keys for user ${position.userId}`);
                return;
            }

            const userExchange = exchangeFactory.getAdapterForUser(
                (user as any).preferredExchange || 'aster',
                user.asterApiKey,
                user.asterApiSecret,
                user.asterTestnet || true
            );

            // Place close order
            await userExchange.placeOrder({
                symbol: position.symbol,
                side: position.side === 'LONG' ? 'SELL' : 'BUY',
                type: 'MARKET',
                quantity: position.size
            });

            const pnl = this.calculatePnl(position, exitPrice);

            await prisma.position.update({
                where: { id: position.id },
                data: {
                    status: 'CLOSED',
                    exitPrice,
                    realizedPnl: pnl.amount,
                    realizedPnlPercent: pnl.percent,
                    closeReason: reason,
                    closedAt: new Date()
                }
            });

            // Update linked Trade record with PnL (Crucial for RL feedback)
            if ((position as any).tradeId) {
                await prisma.trade.update({
                    where: { id: (position as any).tradeId },
                    data: {
                        status: 'CLOSED',
                        exitPrice,
                        pnl: pnl.amount,
                        pnlPercent: pnl.percent,
                        closedAt: new Date()
                    }
                });
                console.log(`[PositionManager] Linked Trade ${(position as any).tradeId} updated with PnL`);

                // Send Feedback to RL Service (Phase 5: RL Learning)
                const { rlService } = await import('./rl.service.js');
                await rlService.sendTradeFeedback({
                    symbol: position.symbol,
                    action: position.side,
                    pnl: pnl.amount,
                    pnlPercent: pnl.percent,
                    duration: (Date.now() - new Date((position as any).createdAt || Date.now()).getTime()) / 1000,
                    strategy: 'STRATEGY_EXECUTOR' // Or fetch methodology
                });

            } else {
                // Forward compatibility: Find trade by symbol/user if no ID
                // (Skipping for now to avoid wrong linking, relying on tradeId)
            }

            console.log(`[PositionManager] Position closed: ${reason}, PnL: ${pnl.amount.toFixed(2)}`);
        } catch (error) {
            console.error('[PositionManager] Close error:', error);
        }
    }

    private async updateTrailingStop(position: Position, currentPrice: number): Promise<void> {
        const trailingDistance = position.trailingStop!;
        let newStopLoss: number | null = null;

        if (position.side === 'LONG') {
            const potentialSL = currentPrice - (currentPrice * trailingDistance / 100);
            if (!position.stopLoss || potentialSL > position.stopLoss) {
                newStopLoss = potentialSL;
            }
        } else {
            const potentialSL = currentPrice + (currentPrice * trailingDistance / 100);
            if (!position.stopLoss || potentialSL < position.stopLoss) {
                newStopLoss = potentialSL;
            }
        }

        if (newStopLoss) {
            await prisma.position.update({
                where: { id: position.id },
                data: { stopLoss: newStopLoss }
            });
            console.log(`[PositionManager] Trailing SL: ${position.symbol} → ${newStopLoss}`);
        }
    }

    private calculatePnl(position: Position, currentPrice: number): { amount: number; percent: number } {
        const entryValue = position.entryPrice * position.size;
        const currentValue = currentPrice * position.size;

        let pnlAmount: number;
        if (position.side === 'LONG') {
            pnlAmount = currentValue - entryValue;
        } else {
            pnlAmount = entryValue - currentValue;
        }

        const pnlPercent = (pnlAmount / entryValue) * 100;
        return { amount: pnlAmount, percent: pnlPercent };
    }

    private async getCurrentPrice(symbol: string): Promise<number | null> {
        try {
            const cached = this.priceCache.get(symbol);
            if (cached) return cached;

            const exchange = exchangeFactory.getDefault();
            const price = await exchange.getPrice(symbol);
            if (price) {
                this.priceCache.set(symbol, price);
                setTimeout(() => this.priceCache.delete(symbol), 1000);
            }
            return price;
        } catch (error) {
            return null;
        }
    }

    async getOpenPositions(userId: string): Promise<Position[]> {
        return await prisma.position.findMany({
            where: { userId, status: 'OPEN' }
        }) as unknown as Position[];
    }

    getStatus() {
        return {
            running: this.isRunning,
            cachedSymbols: this.priceCache.size
        };
    }
}

export const positionManager = new PositionManagerService();
