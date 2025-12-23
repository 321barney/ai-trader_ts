/**
 * WebSocket Service
 * 
 * Real-time price streaming from exchange
 */

import WebSocket from 'ws';

type PriceCallback = (symbol: string, price: number) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, Set<PriceCallback>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private isConnected = false;

    /**
     * Connect to exchange WebSocket
     */
    async connect(): Promise<void> {
        if (this.isConnected) return;

        const wsUrl = process.env.ASTER_WS_URL || 'wss://stream.xt.com/public';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                console.log('[WebSocket] Connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // Resubscribe to all symbols
                for (const symbol of this.subscriptions.keys()) {
                    this.sendSubscribe(symbol);
                }
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (e) {
                    // Ignore parse errors
                }
            });

            this.ws.on('close', () => {
                console.log('[WebSocket] Disconnected');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('[WebSocket] Error:', error.message);
            });

        } catch (error) {
            console.error('[WebSocket] Connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming message
     */
    private handleMessage(message: any): void {
        // XT.com ticker format
        if (message.topic === 'ticker' && message.data) {
            const symbol = message.data.s; // Symbol
            const price = parseFloat(message.data.c); // Close price

            // Notify subscribers
            const callbacks = this.subscriptions.get(symbol);
            if (callbacks) {
                for (const callback of callbacks) {
                    callback(symbol, price);
                }
            }
        }
    }

    /**
     * Subscribe to price updates
     */
    subscribe(symbol: string, callback: PriceCallback): void {
        if (!this.subscriptions.has(symbol)) {
            this.subscriptions.set(symbol, new Set());
            if (this.isConnected) {
                this.sendSubscribe(symbol);
            }
        }
        this.subscriptions.get(symbol)!.add(callback);
    }

    /**
     * Unsubscribe from price updates
     */
    unsubscribe(symbol: string, callback: PriceCallback): void {
        const callbacks = this.subscriptions.get(symbol);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscriptions.delete(symbol);
                if (this.isConnected) {
                    this.sendUnsubscribe(symbol);
                }
            }
        }
    }

    /**
     * Send subscribe message
     */
    private sendSubscribe(symbol: string): void {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                method: 'subscribe',
                params: [`ticker@${symbol.toLowerCase()}`]
            }));
        }
    }

    /**
     * Send unsubscribe message
     */
    private sendUnsubscribe(symbol: string): void {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                method: 'unsubscribe',
                params: [`ticker@${symbol.toLowerCase()}`]
            }));
        }
    }

    /**
     * Schedule reconnect with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WebSocket] Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }

    /**
     * Get last price for symbol
     */
    getLastPrice(symbol: string): number | null {
        // Would need to cache last prices
        return null;
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            subscriptions: Array.from(this.subscriptions.keys())
        };
    }
}

export const websocketService = new WebSocketService();
