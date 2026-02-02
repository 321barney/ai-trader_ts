/**
 * Trade Tool
 * 
 * MCP tool for executing buy/sell orders.
 * Supports both live trading and backtest simulation.
 */

import { MCPTool, ToolResult, ToolContext, toolRegistry } from '../tool-registry.js';

// Import services (dynamically to avoid circular deps)
let exchangeFactory: any = null;
let replayService: any = null;

async function getExchangeFactory() {
    if (!exchangeFactory) {
        const module = await import('../../services/exchange.service.js');
        exchangeFactory = module.exchangeFactory;
    }
    return exchangeFactory;
}

async function getReplayService() {
    if (!replayService) {
        const module = await import('../../services/historical-replay.service.js');
        replayService = module.historicalReplayService;
    }
    return replayService;
}

// ============================================
// BUY Tool
// ============================================

const buyTool: MCPTool = {
    name: 'buy',
    description: 'Execute a buy order for a given symbol. Works in both live and backtest modes.',
    category: 'trade',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
            required: true,
        },
        {
            name: 'quantity',
            type: 'number',
            description: 'Amount to buy',
            required: true,
        },
        {
            name: 'order_type',
            type: 'string',
            description: 'Order type',
            required: false,
            default: 'MARKET',
            enum: ['MARKET', 'LIMIT'],
        },
        {
            name: 'price',
            type: 'number',
            description: 'Limit price (required for LIMIT orders)',
            required: false,
        },
        {
            name: 'reason',
            type: 'string',
            description: 'Reasoning for the trade (for logging)',
            required: false,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, quantity, order_type = 'MARKET', price, reason } = params;

        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode - use replay service
                const replay = await getReplayService();
                const result = replay.executeTrade(
                    context.sessionId,
                    symbol,
                    'BUY',
                    quantity,
                    reason
                );

                if (!result.success) {
                    return {
                        success: false,
                        error: result.error,
                        timestamp: new Date(),
                    };
                }

                return {
                    success: true,
                    data: {
                        trade: result.trade,
                        message: `Bought ${quantity} ${symbol} at ${result.trade?.price}`,
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode - use Exchange Factory (Default/Env)
                const factory = await getExchangeFactory();
                const exchange = factory.getDefault();
                const order = await exchange.placeOrder({
                    symbol,
                    side: 'BUY',
                    type: order_type,
                    quantity,
                    price: order_type === 'LIMIT' ? price : undefined,
                });

                return {
                    success: true,
                    data: {
                        orderId: order.orderId,
                        symbol,
                        side: 'BUY',
                        quantity,
                        price: order.price,
                        status: order.status,
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Buy order failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// SELL Tool
// ============================================

const sellTool: MCPTool = {
    name: 'sell',
    description: 'Execute a sell order for a given symbol. Works in both live and backtest modes.',
    category: 'trade',
    parameters: [
        {
            name: 'symbol',
            type: 'string',
            description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
            required: true,
        },
        {
            name: 'quantity',
            type: 'number',
            description: 'Amount to sell',
            required: true,
        },
        {
            name: 'order_type',
            type: 'string',
            description: 'Order type',
            required: false,
            default: 'MARKET',
            enum: ['MARKET', 'LIMIT'],
        },
        {
            name: 'price',
            type: 'number',
            description: 'Limit price (required for LIMIT orders)',
            required: false,
        },
        {
            name: 'reason',
            type: 'string',
            description: 'Reasoning for the trade (for logging)',
            required: false,
        },
    ],

    async execute(params, context): Promise<ToolResult> {
        const { symbol, quantity, order_type = 'MARKET', price, reason } = params;

        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode
                const replay = await getReplayService();
                const result = replay.executeTrade(
                    context.sessionId,
                    symbol,
                    'SELL',
                    quantity,
                    reason
                );

                if (!result.success) {
                    return {
                        success: false,
                        error: result.error,
                        timestamp: new Date(),
                    };
                }

                return {
                    success: true,
                    data: {
                        trade: result.trade,
                        message: `Sold ${quantity} ${symbol} at ${result.trade?.price}`,
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode
                const factory = await getExchangeFactory();
                const exchange = factory.getDefault();
                const order = await exchange.placeOrder({
                    symbol,
                    side: 'SELL',
                    type: order_type,
                    quantity,
                    price: order_type === 'LIMIT' ? price : undefined,
                });

                return {
                    success: true,
                    data: {
                        orderId: order.orderId,
                        symbol,
                        side: 'SELL',
                        quantity,
                        price: order.price,
                        status: order.status,
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Sell order failed: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// GET_PORTFOLIO Tool
// ============================================

const getPortfolioTool: MCPTool = {
    name: 'get_portfolio',
    description: 'Get current portfolio holdings, cash balance, and P/L.',
    category: 'trade',
    parameters: [],

    async execute(params, context): Promise<ToolResult> {
        try {
            if (context.isBacktest && context.sessionId) {
                // Backtest mode
                const replay = await getReplayService();
                const { session } = replay.getSessionSummary(context.sessionId);

                if (!session) {
                    return {
                        success: false,
                        error: 'Session not found',
                        timestamp: new Date(),
                    };
                }

                return {
                    success: true,
                    data: {
                        cash: session.portfolio.cash,
                        positions: session.portfolio.positions,
                        totalValue: session.portfolio.totalValue,
                        dailyPnL: session.portfolio.dailyPnL,
                        totalPnL: session.portfolio.totalPnL,
                    },
                    timestamp: new Date(),
                };
            } else {
                // Live mode - fetch from exchange
                const factory = await getExchangeFactory();
                const exchange = factory.getDefault();
                // Test connection to verify credentials
                const result = await exchange.testConnection();
                // Get balance
                const balance = await exchange.getBalance();

                return {
                    success: true,
                    data: {
                        balance: balance,
                        // positions would need separate API call
                    },
                    timestamp: new Date(),
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get portfolio: ${error.message}`,
                timestamp: new Date(),
            };
        }
    },
};

// ============================================
// Register Tools
// ============================================

export function registerTradeTools(): void {
    toolRegistry.registerTool(buyTool);
    toolRegistry.registerTool(sellTool);
    toolRegistry.registerTool(getPortfolioTool);
}

// Auto-register on import
registerTradeTools();
