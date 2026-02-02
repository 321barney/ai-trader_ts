/**
 * Historical Replay Service
 * 
 * Replay past market conditions:
 * - Strategy testing on historical data
 * - What-if analysis
 * - Learning from past patterns
 */

import { prisma } from '../utils/prisma.js';
// import { asterService } from './aster.service.js';

const db = prisma as any;

export interface ReplayConfig {
    symbol: string;
    startDate: Date;
    endDate: Date;
    speed: number; // 1x, 2x, 10x, etc.
    initialCapital: number;
}

export interface ReplayState {
    id: string;
    config: ReplayConfig;
    currentTime: Date;
    capital: number;
    peakCapital: number; // Track peak for drawdown calculation
    positions: ReplayPosition[];
    trades: ReplayTrade[];
    isRunning: boolean;
    progress: number; // 0-100
}

export interface ReplayPosition {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    entryTime: Date;
    size: number;
    unrealizedPnl: number;
}

export interface ReplayTrade {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    entryTime: Date;
    exitTime: Date;
    pnl: number;
    size: number;
}

export interface CandleData {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

class HistoricalReplayService {
    private replays: Map<string, ReplayState> = new Map();
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Create a new replay session
     */
    async createReplay(userId: string, config: ReplayConfig): Promise<string> {
        const replayId = `replay-${userId}-${Date.now()}`;

        const state: ReplayState = {
            id: replayId,
            config,
            currentTime: config.startDate,
            capital: config.initialCapital,
            peakCapital: config.initialCapital, // Initialize peak
            positions: [],
            trades: [],
            isRunning: false,
            progress: 0
        };

        this.replays.set(replayId, state);
        console.log(`[Replay] Created session ${replayId}`);

        return replayId;
    }

    /**
     * Start replay playback
     */
    async startReplay(replayId: string): Promise<void> {
        const state = this.replays.get(replayId);
        if (!state) throw new Error('Replay not found');

        state.isRunning = true;

        // Calculate step interval based on speed
        const baseInterval = 1000; // 1 second per candle at 1x
        const interval = baseInterval / state.config.speed;

        const tick = async () => {
            if (!state.isRunning) return;

            // Advance time
            state.currentTime = new Date(state.currentTime.getTime() + 60000); // +1 minute

            // Check if replay complete
            if (state.currentTime >= state.config.endDate) {
                this.stopReplay(replayId);
                return;
            }

            // Update progress
            const totalMs = state.config.endDate.getTime() - state.config.startDate.getTime();
            const elapsedMs = state.currentTime.getTime() - state.config.startDate.getTime();
            state.progress = Math.min(100, (elapsedMs / totalMs) * 100);

            // Update position P/L (would need historical price data)
            // For now, simulate with small random changes
            for (const pos of state.positions) {
                const change = (Math.random() - 0.5) * 0.001 * pos.entryPrice;
                pos.unrealizedPnl += change * pos.size;
            }

            // Track peak capital for drawdown calculation
            const currentEquity = state.capital + state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
            if (currentEquity > state.peakCapital) {
                state.peakCapital = currentEquity;
            }
        };

        this.intervals.set(replayId, setInterval(tick, interval));
        console.log(`[Replay] Started ${replayId} at ${state.config.speed}x speed`);
    }

    /**
     * Pause replay
     */
    pauseReplay(replayId: string): void {
        const state = this.replays.get(replayId);
        if (state) {
            state.isRunning = false;
        }
        const interval = this.intervals.get(replayId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(replayId);
        }
    }

    /**
     * Stop and cleanup replay
     */
    stopReplay(replayId: string): ReplayState | null {
        this.pauseReplay(replayId);
        const state = this.replays.get(replayId);

        // Close any remaining positions at current price
        if (state) {
            for (const pos of state.positions) {
                state.trades.push({
                    symbol: pos.symbol,
                    side: pos.side,
                    entryPrice: pos.entryPrice,
                    exitPrice: pos.entryPrice + pos.unrealizedPnl / pos.size,
                    entryTime: pos.entryTime,
                    exitTime: state.currentTime,
                    pnl: pos.unrealizedPnl,
                    size: pos.size
                });
                state.capital += pos.unrealizedPnl;
            }
            state.positions = [];
            state.isRunning = false;
        }

        return state || null;
    }

    /**
     * Open position in replay
     */
    openPosition(replayId: string, side: 'LONG' | 'SHORT', price: number, size: number): void {
        const state = this.replays.get(replayId);
        if (!state) return;

        state.positions.push({
            symbol: state.config.symbol,
            side,
            entryPrice: price,
            entryTime: state.currentTime,
            size,
            unrealizedPnl: 0
        });

        state.capital -= size * price; // Allocate capital
    }

    /**
     * Close position in replay
     */
    closePosition(replayId: string, positionIndex: number, price: number): void {
        const state = this.replays.get(replayId);
        if (!state || !state.positions[positionIndex]) return;

        const pos = state.positions[positionIndex];
        const pnl = pos.side === 'LONG'
            ? (price - pos.entryPrice) * pos.size
            : (pos.entryPrice - price) * pos.size;

        state.trades.push({
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: price,
            entryTime: pos.entryTime,
            exitTime: state.currentTime,
            pnl,
            size: pos.size
        });

        state.capital += pos.size * pos.entryPrice + pnl; // Return capital + P/L
        state.positions.splice(positionIndex, 1);
    }

    /**
     * Get replay state
     */
    getState(replayId: string): ReplayState | null {
        return this.replays.get(replayId) || null;
    }

    /**
     * Get replay statistics
     */
    getStatistics(replayId: string): any {
        const state = this.replays.get(replayId);
        if (!state) return null;

        const trades = state.trades;
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl < 0);
        const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

        return {
            totalTrades: trades.length,
            winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
            totalPnl,
            returnPercent: (totalPnl / state.config.initialCapital) * 100,
            avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
            avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
            finalCapital: state.capital,
            maxDrawdown: state.peakCapital > 0
                ? ((state.peakCapital - state.capital) / state.peakCapital) * 100
                : 0
        };
    }

    /**
     * Fetch historical candles for replay
     */
    async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<CandleData[]> {
        // In production, fetch from exchange API with historical data
        // For now, return sample data structure
        console.log(`[Replay] Would fetch ${symbol} data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        return [];
    }
}

export const historicalReplayService = new HistoricalReplayService();
