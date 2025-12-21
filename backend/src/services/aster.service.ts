/**
 * AsterDex Exchange Service
 * 
 * API Base: https://fapi.asterdex.com
 * Docs: https://github.com/AsterFinance/aster-api-doc
 */

import crypto from 'crypto';

// Types
export interface TradingPair {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    pricePrecision: number;
    quantityPrecision: number;
    minQty: number;
    maxQty: number;
    status: string;
}

export interface OHLCV {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
    quoteVolume: number;
    trades: number;
}

export interface Ticker {
    symbol: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    lastUpdate: number;
}

export interface Balance {
    asset: string;
    available: number;
    locked: number;
    total: number;
}

export interface Position {
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnL: number;
    leverage: number;
    liquidationPrice: number;
}

export interface OrderParams {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    leverage?: number;
    positionSide?: 'LONG' | 'SHORT';
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface Order {
    orderId: string;
    symbol: string;
    side: string;
    type: string;
    status: string;
    price: number;
    quantity: number;
    executedQty: number;
    avgPrice: number;
    createdAt: number;
}

export class AsterService {
    private baseUrl: string;
    private apiKey: string;
    private apiSecret: string;
    private testnet: boolean;

    constructor(apiKey?: string, apiSecret?: string, testnet = true) {
        this.testnet = testnet;
        // Note: AsterDex uses same URL for testnet/mainnet - testnet is determined by API key type
        this.baseUrl = 'https://fapi.asterdex.com';
        this.apiKey = apiKey || process.env.ASTER_API_KEY || '';
        this.apiSecret = apiSecret || process.env.ASTER_API_SECRET || '';
    }

    /**
     * Generate HMAC-SHA256 signature
     */
    private sign(queryString: string): string {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
    }

    /**
     * Make signed request (for private endpoints)
     */
    private async signedRequest<T>(
        method: 'GET' | 'POST' | 'DELETE' | 'PUT',
        endpoint: string,
        params: Record<string, any> = {}
    ): Promise<T> {
        const timestamp = Date.now();
        const allParams: Record<string, string> = { ...params, timestamp: String(timestamp) };
        const queryString = new URLSearchParams(allParams).toString();
        const signature = this.sign(queryString);

        const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
            method,
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`AsterDex API error: ${response.status} - ${error}`);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Make public request (no signature needed)
     */
    private async publicRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
        const stringParams: Record<string, string> = Object.entries(params).reduce((acc, [k, v]) => {
            acc[k] = String(v);
            return acc;
        }, {} as Record<string, string>);

        const queryString = new URLSearchParams(stringParams).toString();

        const url = queryString
            ? `${this.baseUrl}${endpoint}?${queryString}`
            : `${this.baseUrl}${endpoint}`;

        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`AsterDex API error: ${response.status} - ${error}`);
        }

        return response.json() as Promise<T>;
    }

    // ============ Connection ============

    /**
     * Test API connection and credentials
     */
    async testConnection(): Promise<{ success: boolean; balance?: Balance[]; error?: string }> {
        try {
            // First test public endpoint
            await this.publicRequest('/fapi/v1/ping');

            // If we have credentials, test private endpoint
            if (this.apiKey && this.apiSecret) {
                try {
                    // Use V2 balance endpoint as per documentation
                    const balances = await this.getBalance();
                    return { success: true, balance: balances };
                } catch (accountError: any) {
                    // If balance fails, log and return the error
                    console.log('[Aster] Balance request failed:', accountError.message);
                    return { success: false, error: accountError.message };
                }
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // ============ Market Data ============

    /**
     * Get all trading pairs
     */
    async getPairs(): Promise<TradingPair[]> {
        const data = await this.publicRequest<{ symbols: any[] }>('/fapi/v1/exchangeInfo');

        return data.symbols.map((s: any) => ({
            symbol: s.symbol,
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            pricePrecision: s.pricePrecision,
            quantityPrecision: s.quantityPrecision,
            minQty: parseFloat(s.filters?.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0'),
            maxQty: parseFloat(s.filters?.find((f: any) => f.filterType === 'LOT_SIZE')?.maxQty || '0'),
            status: s.status,
        }));
    }

    /**
     * Get OHLCV (Kline) data
     */
    async getKlines(
        symbol: string,
        interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' = '1h',
        limit = 100
    ): Promise<OHLCV[]> {
        const data = await this.publicRequest<any[][]>('/fapi/v1/klines', {
            symbol,
            interval,
            limit,
        });

        return data.map((k: any[]) => ({
            openTime: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closeTime: k[6],
            quoteVolume: parseFloat(k[7]),
            trades: k[8],
        }));
    }

    /**
     * Get 24hr ticker
     */
    async getTicker(symbol: string): Promise<Ticker> {
        const data = await this.publicRequest<any>('/fapi/v1/ticker/24hr', { symbol });

        return {
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: parseFloat(data.priceChangePercent),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            volume24h: parseFloat(data.volume),
            lastUpdate: data.closeTime,
        };
    }

    /**
     * Get current price for symbol
     */
    async getPrice(symbol: string): Promise<number> {
        const data = await this.publicRequest<{ price: string }>('/fapi/v1/ticker/price', { symbol });
        return parseFloat(data.price);
    }

    // ============ Account ============

    /**
     * Get account balances - V2 endpoint
     */
    async getBalance(): Promise<Balance[]> {
        // Use V2 endpoint as per documentation
        const data = await this.signedRequest<any[]>('GET', '/fapi/v2/balance');

        return data.map((b: any) => ({
            asset: b.asset,
            available: parseFloat(b.availableBalance || '0'),
            locked: parseFloat(b.balance || '0') - parseFloat(b.availableBalance || '0'),
            total: parseFloat(b.balance || '0'),
        }));
    }

    /**
     * Get open positions
     */
    async getPositions(): Promise<Position[]> {
        const data = await this.signedRequest<any[]>('GET', '/fapi/v2/positionRisk');

        return data
            .filter((p: any) => parseFloat(p.positionAmt) !== 0)
            .map((p: any) => ({
                symbol: p.symbol,
                side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
                size: Math.abs(parseFloat(p.positionAmt)),
                entryPrice: parseFloat(p.entryPrice),
                markPrice: parseFloat(p.markPrice),
                unrealizedPnL: parseFloat(p.unRealizedProfit),
                leverage: parseInt(p.leverage),
                liquidationPrice: parseFloat(p.liquidationPrice),
            }));
    }

    // ============ Trading ============

    /**
     * Place order
     */
    async placeOrder(params: OrderParams): Promise<Order> {
        const orderParams: Record<string, any> = {
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: params.quantity,
        };

        if (params.type === 'LIMIT') {
            orderParams.price = params.price;
            orderParams.timeInForce = params.timeInForce || 'GTC';
        }

        if (params.positionSide) {
            orderParams.positionSide = params.positionSide;
        }

        const data = await this.signedRequest<any>('POST', '/fapi/v1/order', orderParams);

        // If stop loss/take profit provided, create additional orders
        if (params.stopLoss) {
            await this.signedRequest('POST', '/fapi/v1/order', {
                symbol: params.symbol,
                side: params.side === 'BUY' ? 'SELL' : 'BUY',
                type: 'STOP_MARKET',
                stopPrice: params.stopLoss,
                quantity: params.quantity,
                reduceOnly: true,
            });
        }

        if (params.takeProfit) {
            await this.signedRequest('POST', '/fapi/v1/order', {
                symbol: params.symbol,
                side: params.side === 'BUY' ? 'SELL' : 'BUY',
                type: 'TAKE_PROFIT_MARKET',
                stopPrice: params.takeProfit,
                quantity: params.quantity,
                reduceOnly: true,
            });
        }

        return {
            orderId: data.orderId.toString(),
            symbol: data.symbol,
            side: data.side,
            type: data.type,
            status: data.status,
            price: parseFloat(data.price),
            quantity: parseFloat(data.origQty),
            executedQty: parseFloat(data.executedQty),
            avgPrice: parseFloat(data.avgPrice || data.price),
            createdAt: data.updateTime,
        };
    }

    /**
     * Cancel order
     */
    async cancelOrder(symbol: string, orderId: string): Promise<void> {
        await this.signedRequest('DELETE', '/fapi/v1/order', { symbol, orderId });
    }

    /**
     * Get open orders
     */
    async getOpenOrders(symbol?: string): Promise<Order[]> {
        const params = symbol ? { symbol } : {};
        const data = await this.signedRequest<any[]>('GET', '/fapi/v1/openOrders', params);

        return data.map((o: any) => ({
            orderId: o.orderId.toString(),
            symbol: o.symbol,
            side: o.side,
            type: o.type,
            status: o.status,
            price: parseFloat(o.price),
            quantity: parseFloat(o.origQty),
            executedQty: parseFloat(o.executedQty),
            avgPrice: parseFloat(o.avgPrice || o.price),
            createdAt: o.time,
        }));
    }

    /**
     * Set leverage for symbol
     */
    async setLeverage(symbol: string, leverage: number): Promise<void> {
        await this.signedRequest('POST', '/fapi/v1/leverage', { symbol, leverage });
    }
}

// Factory function for creating service with user credentials
export function createAsterService(apiKey: string, apiSecret: string, testnet = true): AsterService {
    return new AsterService(apiKey, apiSecret, testnet);
}

// Default instance using env vars
export const asterService = new AsterService();
