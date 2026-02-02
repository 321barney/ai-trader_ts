/**
 * Exchange Abstraction Layer
 * 
 * Unified interface for multiple exchanges:
 * - Aster (XT.com) - Primary
 * - Binance - Future
 * - Bybit - Future
 */

import { asterService, createAsterService } from './aster.service.js';

export type ExchangeType = 'aster' | 'binance' | 'bybit';

export interface ExchangeConfig {
    apiKey: string;
    apiSecret: string;
    testnet?: boolean;
}

export interface IExchangeAdapter {
    // Connection
    testConnection(): Promise<{ success: boolean; error?: string }>;

    // Market Data
    getPrice(symbol: string): Promise<number>;
    getTicker(symbol: string): Promise<any>;
    getKlines(symbol: string, interval: string, limit?: number): Promise<any[]>;
    getBalance(): Promise<any[]>;
    getPositions(): Promise<any[]>;
    getPairs(): Promise<any[]>;

    // Trading
    placeOrder(params: OrderParams): Promise<any>;
    cancelOrder(symbol: string, orderId: string): Promise<void>;
    getOpenOrders(symbol?: string): Promise<any[]>;
    setLeverage?(symbol: string, leverage: number): Promise<void>;
}

export interface OrderParams {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSide?: 'LONG' | 'SHORT';
}

/**
 * Aster Exchange Adapter
 */
class AsterAdapter implements IExchangeAdapter {
    private service: typeof asterService;

    constructor(config?: ExchangeConfig) {
        if (config) {
            this.service = createAsterService(config.apiKey, config.apiSecret, config.testnet);
        } else {
            this.service = asterService;
        }
    }

    async testConnection() {
        return this.service.testConnection();
    }

    async getPrice(symbol: string) {
        return this.service.getPrice(symbol);
    }

    async getTicker(symbol: string) {
        return this.service.getTicker(symbol);
    }

    async getKlines(symbol: string, interval: string, limit?: number) {
        return this.service.getKlines(symbol, interval as any, limit);
    }

    async getBalance() {
        return this.service.getBalance();
    }

    async getPositions() {
        return this.service.getPositions();
    }

    async getPairs() {
        return this.service.getPairs();
    }

    async placeOrder(params: OrderParams) {
        return this.service.placeOrder(params);
    }

    async cancelOrder(symbol: string, orderId: string) {
        return this.service.cancelOrder(symbol, orderId);
    }

    async getOpenOrders(symbol?: string) {
        return this.service.getOpenOrders(symbol);
    }
}

/**
 * Exchange Factory
 */
class ExchangeFactory {
    private adapters: Map<string, IExchangeAdapter> = new Map();

    /**
     * Get or create an exchange adapter
     */
    getAdapter(exchange: ExchangeType, config?: ExchangeConfig): IExchangeAdapter {
        const key = config ? `${exchange}-${config.apiKey.slice(0, 8)}` : exchange;

        if (!this.adapters.has(key)) {
            switch (exchange) {
                case 'aster':
                    this.adapters.set(key, new AsterAdapter(config));
                    break;
                case 'binance':
                    // TODO: Implement BinanceAdapter
                    throw new Error('Binance adapter not yet implemented');
                case 'bybit':
                    // TODO: Implement BybitAdapter
                    throw new Error('Bybit adapter not yet implemented');
                default:
                    throw new Error(`Unknown exchange: ${exchange}`);
            }
        }

        return this.adapters.get(key)!;
    }

    /**
     * Helper to get adapter for a user
     */
    getAdapterForUser(exchange: string, apiKey: string, apiSecret: string, testnet: boolean): IExchangeAdapter {
        return this.getAdapter(exchange as ExchangeType, {
            apiKey,
            apiSecret,
            testnet
        });
    }

    /**
     * Get default adapter (Aster)
     */
    getDefault(): IExchangeAdapter {
        return this.getAdapter('aster');
    }
}

export const exchangeFactory = new ExchangeFactory();
export const defaultExchange = exchangeFactory.getDefault();
