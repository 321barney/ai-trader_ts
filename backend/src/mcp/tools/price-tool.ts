/**
 * Price Tool
 * 
 * MCP tool for querying market prices and data.
 * Supports anti-look-ahead filtering in backtest mode.
 */

import { MCPTool, ToolResult, ToolContext, toolRegistry } from '../tool-registry.js';

// Dynamic imports
let asterService: any = null;
let replayService: any = null;
let marketDataService: any = null;

async function getAsterService() {
    if (!asterService) {
        const module = await import('../../services/aster.service.js');
        asterService = module.asterService;
    }
    return asterService;
}

async function getReplayService() {
    if (!replayService) {
        const module = await import('../../services/historical-replay.service.js');
        replayService = module.historicalReplayService;
    }
    return replayService;
}

async function getMarketDataService() {
    if (!marketDataService) {
        const module = await import('../../services/market-data.service.js');
        marketDataService = module.marketDataService;
    }
    return marketDataService;
}

// ============================================
// GET_PRICE Tool
// ============================================

const getPriceTool: MCPTool = {
    name: 'get_price',
    description: 'Get current price and basic market data for a symbol.',
    category: 'data',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
            required: true,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol } = params;

        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode - get price at current simulation time
                const replay = await getReplayService();
                const data = replay.getDataAtTime(context.sessionId, symbol);

                if (!data) {
                    return {
                        success: false,
                        error: `No data available for ${symbol} at current simulation time`,
                        timestamp: new Date(),
                    };
                }

                return {
                    success: true,
                    data: {
                        symbol,
                        price: data.close,
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        volume: data.volume,
                        date: data.date,
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode
                const aster = await getAsterService();
                const ohlcv = await aster.getOHLCV(symbol, '1m', 1);

                if (ohlcv.length === 0) {
                    return {
                        success: false,
                        error: `No data available for ${symbol}`,
                        timestamp: new Date(),
                    };
                }

                const latest = ohlcv[ohlcv.length - 1];
                return {
                    success: true,
                    data: {
                        symbol,
                        price: latest.close,
                        open: latest.open,
                        high: latest.high,
                        low: latest.low,
                        volume: latest.volume,
                        timestamp: latest.timestamp,
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get price: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// GET_HISTORICAL Tool
// ============================================

const getHistoricalTool: MCPTool = {
    name: 'get_historical',
    description: 'Get historical OHLCV data for a symbol. In backtest mode, only returns data up to current simulation time.',
    category: 'data',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol',
            required: true,
        },
        {
            name: 'days',
            type: 'number',
            description: 'Number of days of historical data',
            required: false,
            default: 30,
        },
        {
            name: 'interval',
            type: 'string',
            description: 'Candle interval',
            required: false,
            default: '1d',
            enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, days = 30, interval = '1d' } = params;

        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode - anti-look-ahead
                const replay = await getReplayService();
                const data = replay.getHistoricalRange(context.sessionId, symbol, days);

                return {
                    success: true,
                    data: {
                        symbol,
                        interval,
                        candles: data,
                        count: data.length,
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode
                const aster = await getAsterService();
                const ohlcv = await aster.getOHLCV(symbol, interval, days * 24); // Approximate

                return {
                    success: true,
                    data: {
                        symbol,
                        interval,
                        candles: ohlcv.slice(-days * (interval === '1d' ? 1 : 24)),
                        count: ohlcv.length,
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get historical data: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// GET_INDICATORS Tool
// ============================================

const getIndicatorsTool: MCPTool = {
    name: 'get_indicators',
    description: 'Get technical indicators (RSI, MACD, EMA, ATR, Bollinger Bands) for a symbol.',
    category: 'data',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol',
            required: true,
        },
        {
            name: 'indicators',
            type: 'array',
            description: 'List of indicators to calculate',
            required: false,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, indicators = ['rsi', 'macd', 'ema', 'atr'] } = params;

        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode - get indicators at current time
                const replay = await getReplayService();
                const data = replay.getDataAtTime(context.sessionId, symbol);

                if (!data) {
                    return {
                        success: false,
                        error: `No data available for ${symbol}`,
                        timestamp: new Date(),
                    };
                }

                return {
                    success: true,
                    data: {
                        symbol,
                        date: data.date,
                        price: data.close,
                        indicators: {
                            rsi: data.rsi,
                            ema20: data.ema20,
                            ema50: data.ema50,
                            atr: data.atr,
                            macd: data.macd,
                        },
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode
                const mds = await getMarketDataService();
                const analysis = await mds.getFullAnalysis(symbol);

                return {
                    success: true,
                    data: {
                        symbol,
                        price: analysis.currentPrice,
                        indicators: {
                            rsi: analysis.rsi,
                            macd: analysis.macd,
                            ema20: analysis.ema20,
                            ema50: analysis.ema50,
                            atr: analysis.atr,
                            bollingerBands: analysis.bollingerBands,
                            support: analysis.support,
                            resistance: analysis.resistance,
                        },
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get indicators: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// Register Tools
// ============================================

export function registerPriceTools(): void {
    toolRegistry.registerTool(getPriceTool);
    toolRegistry.registerTool(getHistoricalTool);
    toolRegistry.registerTool(getIndicatorsTool);
}

// Auto-register on import
registerPriceTools();
