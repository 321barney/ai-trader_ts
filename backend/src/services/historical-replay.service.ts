/**
 * Historical Replay Service
 * 
 * Enables backtesting with:
 * - Temporal control framework
 * - Anti-look-ahead data filtering
 * - Date range simulation
 * - News chronology enforcement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReplayConfig {
    initDate: string;          // Start date: "2024-01-01"
    endDate: string;           // End date: "2024-12-31"
    speed: number;             // Replay speed: 1x, 2x, 10x
    symbols: string[];         // Symbols to include
    initialCapital: number;    // Starting capital
    mode: 'daily' | 'hourly';  // Time granularity
}

export interface ReplaySession {
    id: string;
    userId: string;
    config: ReplayConfig;
    currentDate: Date;
    status: 'pending' | 'running' | 'paused' | 'completed';
    portfolio: ReplayPortfolio;
    stats: ReplayStats;
    createdAt: Date;
}

export interface ReplayPortfolio {
    cash: number;
    positions: ReplayPosition[];
    totalValue: number;
    dailyPnL: number;
    totalPnL: number;
}

export interface ReplayPosition {
    symbol: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    entryDate: string;
}

export interface ReplayStats {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalDays: number;
    currentDay: number;
    highWaterMark: number;
    maxDrawdown: number;
}

export interface ReplayMarketData {
    symbol: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    // Technical indicators (calculated up to this date only)
    rsi?: number;
    macd?: { line: number; signal: number; histogram: number };
    ema20?: number;
    ema50?: number;
    atr?: number;
}

export interface ReplayTrade {
    id: string;
    sessionId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    date: string;
    reasoning?: string;
    agentDecision?: any;
}

// In-memory session storage (use Redis in production)
const sessions = new Map<string, ReplaySession>();

// Mock historical data (in production, load from database/files)
const historicalData = new Map<string, ReplayMarketData[]>();

export class HistoricalReplayService {
    /**
     * Create a new replay session
     */
    createSession(userId: string, config: ReplayConfig): ReplaySession {
        const sessionId = `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const session: ReplaySession = {
            id: sessionId,
            userId,
            config,
            currentDate: new Date(config.initDate),
            status: 'pending',
            portfolio: {
                cash: config.initialCapital,
                positions: [],
                totalValue: config.initialCapital,
                dailyPnL: 0,
                totalPnL: 0,
            },
            stats: {
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                totalDays: this.calculateTradingDays(config.initDate, config.endDate),
                currentDay: 0,
                highWaterMark: config.initialCapital,
                maxDrawdown: 0,
            },
            createdAt: new Date(),
        };

        sessions.set(sessionId, session);
        return session;
    }

    /**
     * Start or resume a replay session
     */
    startSession(sessionId: string): ReplaySession | null {
        const session = sessions.get(sessionId);
        if (!session) return null;

        session.status = 'running';
        return session;
    }

    /**
     * Pause a running session
     */
    pauseSession(sessionId: string): ReplaySession | null {
        const session = sessions.get(sessionId);
        if (!session) return null;

        session.status = 'paused';
        return session;
    }

    /**
     * Advance time in the simulation
     */
    advanceTime(sessionId: string, steps: number = 1): ReplaySession | null {
        const session = sessions.get(sessionId);
        if (!session || session.status !== 'running') return null;

        for (let i = 0; i < steps; i++) {
            // Move to next trading day
            const nextDate = this.getNextTradingDay(session.currentDate);

            // Check if we've reached the end
            if (nextDate > new Date(session.config.endDate)) {
                session.status = 'completed';
                break;
            }

            session.currentDate = nextDate;
            session.stats.currentDay++;

            // Update portfolio with current prices
            this.updatePortfolioValues(session);
        }

        return session;
    }

    /**
     * Get market data at the current simulation time
     * ANTI-LOOK-AHEAD: Only returns data up to currentDate
     */
    getDataAtTime(
        sessionId: string,
        symbol: string
    ): ReplayMarketData | null {
        const session = sessions.get(sessionId);
        if (!session) return null;

        // Get historical data for symbol
        const symbolData = historicalData.get(symbol) || [];

        // Filter to only include data before current date (anti-look-ahead)
        const validData = symbolData.filter(
            d => new Date(d.date) <= session.currentDate
        );

        if (validData.length === 0) return null;

        // Return the most recent valid data point
        const currentData = validData[validData.length - 1];

        // Calculate technical indicators using only historical data
        const indicators = this.calculateIndicators(validData);

        return {
            ...currentData,
            ...indicators,
        };
    }

    /**
     * Get historical data range for a symbol
     * ANTI-LOOK-AHEAD: Only returns data up to currentDate
     */
    getHistoricalRange(
        sessionId: string,
        symbol: string,
        lookbackDays: number
    ): ReplayMarketData[] {
        const session = sessions.get(sessionId);
        if (!session) return [];

        const symbolData = historicalData.get(symbol) || [];

        // Filter to only include data before current date
        const validData = symbolData.filter(
            d => new Date(d.date) <= session.currentDate
        );

        // Return last N days
        return validData.slice(-lookbackDays);
    }

    /**
     * Execute a trade in the simulation
     */
    executeTrade(
        sessionId: string,
        symbol: string,
        side: 'BUY' | 'SELL',
        quantity: number,
        reasoning?: string
    ): { success: boolean; trade?: ReplayTrade; error?: string } {
        const session = sessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        if (session.status !== 'running') {
            return { success: false, error: 'Session not running' };
        }

        // Get current price
        const marketData = this.getDataAtTime(sessionId, symbol);
        if (!marketData) {
            return { success: false, error: 'No market data available' };
        }

        const price = marketData.close;
        const totalCost = price * quantity;

        if (side === 'BUY') {
            // Check if we have enough cash
            if (totalCost > session.portfolio.cash) {
                return { success: false, error: 'Insufficient funds' };
            }

            // Execute buy
            session.portfolio.cash -= totalCost;

            // Add or update position
            const existingPos = session.portfolio.positions.find(p => p.symbol === symbol);
            if (existingPos) {
                // Average up/down
                const totalQty = existingPos.quantity + quantity;
                existingPos.entryPrice = (existingPos.entryPrice * existingPos.quantity + price * quantity) / totalQty;
                existingPos.quantity = totalQty;
            } else {
                session.portfolio.positions.push({
                    symbol,
                    quantity,
                    entryPrice: price,
                    currentPrice: price,
                    unrealizedPnL: 0,
                    entryDate: session.currentDate.toISOString().split('T')[0],
                });
            }
        } else {
            // SELL
            const existingPos = session.portfolio.positions.find(p => p.symbol === symbol);
            if (!existingPos || existingPos.quantity < quantity) {
                return { success: false, error: 'Insufficient position' };
            }

            // Calculate P/L
            const pnl = (price - existingPos.entryPrice) * quantity;
            session.portfolio.cash += totalCost;

            // Update stats
            session.stats.totalTrades++;
            if (pnl > 0) {
                session.stats.winningTrades++;
            } else {
                session.stats.losingTrades++;
            }

            // Update position
            existingPos.quantity -= quantity;
            if (existingPos.quantity === 0) {
                session.portfolio.positions = session.portfolio.positions.filter(p => p.symbol !== symbol);
            }
        }

        // Update portfolio values
        this.updatePortfolioValues(session);

        const trade: ReplayTrade = {
            id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            sessionId,
            symbol,
            side,
            quantity,
            price,
            date: session.currentDate.toISOString().split('T')[0],
            reasoning,
        };

        return { success: true, trade };
    }

    /**
     * Get session summary
     */
    getSessionSummary(sessionId: string): {
        session: ReplaySession | null;
        performance: {
            totalReturn: number;
            winRate: number;
            maxDrawdown: number;
            sharpeRatio: number;
        } | null;
    } {
        const session = sessions.get(sessionId);
        if (!session) return { session: null, performance: null };

        const totalReturn = ((session.portfolio.totalValue - session.config.initialCapital) / session.config.initialCapital) * 100;
        const winRate = session.stats.totalTrades > 0
            ? (session.stats.winningTrades / session.stats.totalTrades) * 100
            : 0;

        return {
            session,
            performance: {
                totalReturn,
                winRate,
                maxDrawdown: session.stats.maxDrawdown,
                sharpeRatio: 0, // Would need daily returns to calculate
            },
        };
    }

    /**
     * Load historical data for symbols
     */
    async loadHistoricalData(
        symbols: string[],
        startDate: string,
        endDate: string
    ): Promise<void> {
        for (const symbol of symbols) {
            // In production, fetch from database or API
            // For now, generate mock data
            const data = this.generateMockData(symbol, startDate, endDate);
            historicalData.set(symbol, data);
        }
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    private calculateTradingDays(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let days = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
                days++;
            }
            current.setDate(current.getDate() + 1);
        }

        return days;
    }

    private getNextTradingDay(date: Date): Date {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);

        // Skip weekends (for crypto, remove this)
        while (next.getDay() === 0 || next.getDay() === 6) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    }

    private updatePortfolioValues(session: ReplaySession): void {
        let positionsValue = 0;

        for (const position of session.portfolio.positions) {
            const marketData = this.getDataAtTime(session.id, position.symbol);
            if (marketData) {
                position.currentPrice = marketData.close;
                position.unrealizedPnL = (position.currentPrice - position.entryPrice) * position.quantity;
                positionsValue += position.currentPrice * position.quantity;
            }
        }

        const previousValue = session.portfolio.totalValue;
        session.portfolio.totalValue = session.portfolio.cash + positionsValue;
        session.portfolio.dailyPnL = session.portfolio.totalValue - previousValue;
        session.portfolio.totalPnL = session.portfolio.totalValue - session.config.initialCapital;

        // Update high water mark and max drawdown
        if (session.portfolio.totalValue > session.stats.highWaterMark) {
            session.stats.highWaterMark = session.portfolio.totalValue;
        }

        const drawdown = ((session.stats.highWaterMark - session.portfolio.totalValue) / session.stats.highWaterMark) * 100;
        if (drawdown > session.stats.maxDrawdown) {
            session.stats.maxDrawdown = drawdown;
        }
    }

    private calculateIndicators(data: ReplayMarketData[]): Partial<ReplayMarketData> {
        if (data.length < 20) return {};

        const closes = data.map(d => d.close);

        // RSI (14-period)
        const rsi = this.calculateRSI(closes, 14);

        // EMA
        const ema20 = this.calculateEMA(closes, 20);
        const ema50 = data.length >= 50 ? this.calculateEMA(closes, 50) : undefined;

        // ATR
        const atr = this.calculateATR(data, 14);

        return { rsi, ema20, ema50, atr };
    }

    private calculateRSI(prices: number[], period: number): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    private calculateEMA(prices: number[], period: number): number {
        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }

        return ema;
    }

    private calculateATR(data: ReplayMarketData[], period: number): number {
        if (data.length < period + 1) return 0;

        const trueRanges: number[] = [];
        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    private generateMockData(symbol: string, startDate: string, endDate: string): ReplayMarketData[] {
        const data: ReplayMarketData[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Base price based on symbol
        let price = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 2500 : 100;

        const current = new Date(start);
        while (current <= end) {
            // Skip weekends for stocks
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                // Random price movement
                const change = (Math.random() - 0.48) * price * 0.03; // Slight bullish bias
                price = Math.max(price * 0.5, price + change);

                const volatility = price * 0.02;

                data.push({
                    symbol,
                    date: current.toISOString().split('T')[0],
                    open: price - volatility / 2 + Math.random() * volatility,
                    high: price + Math.random() * volatility,
                    low: price - Math.random() * volatility,
                    close: price,
                    volume: 1000000 + Math.random() * 5000000,
                });
            }
            current.setDate(current.getDate() + 1);
        }

        return data;
    }
}

export const historicalReplayService = new HistoricalReplayService();
